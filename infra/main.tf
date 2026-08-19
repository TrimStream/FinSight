terraform {
  required_version = ">= 1.15.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = "us-west-2"
  profile = "default"
}

# --- Use the default VPC, no need to build custom networking for a project this size ---
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# --- RDS PostgreSQL ---

resource "aws_db_subnet_group" "finsight" {
  name       = "finsight-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_security_group" "rds" {
  name        = "finsight-rds-sg"
  description = "Allow Postgres access to FinSight RDS instance"
  vpc_id      = data.aws_vpc.default.id

  # NOTE: open to the internet on purpose, matching Neon's own security model
  # (auth is via password + enforced TLS, not network allowlisting). This is
  # what lets the EC2 instance AND the GitHub Actions fetcher job (which has
  # no fixed IP) both reach the database. Tighten this to specific CIDRs if
  # you want a stricter setup later.
  ingress {
    description = "PostgreSQL"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "finsight" {
  identifier              = "finsight-db"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = var.db_instance_class
  allocated_storage       = 20
  storage_type            = "gp3"
  db_name                 = "finsight"
  username                = "finsight_admin"
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.finsight.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  publicly_accessible     = true
  skip_final_snapshot     = true
  backup_retention_period = 1

  tags = {
    Project = "FinSight"
  }
}

# --- EC2 host for the Go + Python containers ---

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_security_group" "backend" {
  name        = "finsight-backend-sg"
  description = "Allow SSH (restricted) and HTTPS traffic to the FinSight backend host"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH (restricted to your IP)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  ingress {
    description = "HTTP (ACME challenge only, Caddy redirects everything else to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS - real API traffic goes through here, proxied to the containers"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Allocate the Elastic IP FIRST, standalone, so its address is known before
# the instance boots. Caddy needs to know its own public IP at boot time to
# request a certificate for it via sslip.io - if we associated the EIP only
# after instance creation, user_data would run before the final IP was known.
resource "aws_eip" "backend" {
  domain = "vpc"
  tags = {
    Name    = "finsight-backend-eip"
    Project = "FinSight"
  }
}

locals {
  backend_domain = "${replace(aws_eip.backend.public_ip, ".", "-")}.sslip.io"
}

resource "aws_instance" "backend" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.ssh_key_name
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.backend.id]

  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    db_host           = aws_db_instance.finsight.address
    db_port           = aws_db_instance.finsight.port
    db_user           = aws_db_instance.finsight.username
    db_password       = var.db_password
    db_name           = aws_db_instance.finsight.db_name
    alpha_vantage_key = var.alpha_vantage_key
    gemini_api_key    = var.gemini_api_key
    domain            = local.backend_domain
  })

  tags = {
    Name    = "finsight-backend"
    Project = "FinSight"
  }

  depends_on = [aws_db_instance.finsight]
}

resource "aws_eip_association" "backend" {
  instance_id   = aws_instance.backend.id
  allocation_id = aws_eip.backend.id
}

output "rds_endpoint" {
  value       = aws_db_instance.finsight.address
  description = "RDS endpoint - use this as DB_HOST in GitHub Actions secrets"
}

output "backend_https_url" {
  value       = "https://${local.backend_domain}"
  description = "The stable HTTPS URL for the backend - use this as both REACT_APP_GO_API and REACT_APP_PYTHON_API in Vercel"
}