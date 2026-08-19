variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-west-2"
}

variable "db_password" {
  description = "Master password for the RDS PostgreSQL instance"
  type        = string
  sensitive   = true
}

variable "ssh_key_name" {
  description = "Name of an existing EC2 key pair (create one in the AWS Console under EC2 > Key Pairs first)"
  type        = string
}

variable "my_ip" {
  description = "Your IP address in CIDR form (e.g. 1.2.3.4/32), so SSH is restricted to just you. Find yours at whatismyip.com"
  type        = string
}

variable "alpha_vantage_key" {
  description = "Alpha Vantage API key, used by the fetcher"
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Google Gemini API key, used by the Python NL-to-SQL service"
  type        = string
  sensitive   = true
}

variable "instance_type" {
  description = "EC2 instance type for the backend host"
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}