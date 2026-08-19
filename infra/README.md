# FinSight AWS Infrastructure

Terraform config that replaces Render + Neon with:

- **RDS PostgreSQL** (`db.t3.micro` by default) - the database
- **EC2** (`t3.micro` by default) - runs the Go backend and Python NL-to-SQL
  service as Docker containers, fronted by **Caddy** for automatic HTTPS
  (via a free [sslip.io](https://sslip.io) domain, so no DNS setup needed)
- An **Elastic IP** so the host has a stable address
- Security groups for both

Deploys into the default VPC - no custom networking, matching the scale of
this project.

## Cost

Rough estimate, us-west-2, both instance types left at their defaults:

- **First 12 months on a new AWS account:** effectively free. Both
  `db.t3.micro` (RDS) and `t3.micro` (EC2) fall under the AWS Free Tier's
  750 hours/month allowances.
- **After the free tier (or on an account that's already used it):**
  roughly **$20/month** - approximately $13/month for the RDS instance,
  $7-8/month for the EC2 instance, plus a few cents for the 20GB of gp3
  storage and the Elastic IP (free while attached to a running instance).

These are ballpark figures - check the
[AWS Pricing Calculator](https://calculator.aws/) for exact numbers in your
region.

## One-time setup

1. **AWS account.** Sign up at aws.amazon.com if you don't have one.
2. **IAM user.** Create one with programmatic access (IAM console → Users →
   Create user → attach `AdministratorAccess` for simplicity, or scope it
   down to EC2/RDS/VPC permissions if you'd rather not use admin).
3. **AWS CLI**, authenticated with that user's credentials under a named
   profile (`aws configure` or `aws login`, matching the `profile = "default"`
   already set in `main.tf` - change that if you use a different profile
   name).
4. **Terraform** (`>= 1.15.0`, per the `required_version` in `main.tf`).
5. **An EC2 key pair.** AWS Console → EC2 → Key Pairs → Create key pair.
   Download the `.pem` and keep it safe - this is `ssh_key_name` below.
   (**Do not commit the `.pem` file to git.**)
6. **Your own public IP**, in CIDR form (e.g. `1.2.3.4/32`). Look it up at
   [whatismyip.com](https://whatismyip.com). This restricts SSH access to
   just you - it's `my_ip` below.

## Deploy

```bash
cd infra
terraform init

terraform plan \
  -var="db_password=<choose a strong password>" \
  -var="ssh_key_name=<your EC2 key pair name>" \
  -var="my_ip=<your IP>/32" \
  -var="alpha_vantage_key=<your Alpha Vantage API key>" \
  -var="gemini_api_key=<your Gemini API key>"

terraform apply \
  -var="db_password=<choose a strong password>" \
  -var="ssh_key_name=<your EC2 key pair name>" \
  -var="my_ip=<your IP>/32" \
  -var="alpha_vantage_key=<your Alpha Vantage API key>" \
  -var="gemini_api_key=<your Gemini API key>"
```

`db_password`, `ssh_key_name`, `my_ip`, `alpha_vantage_key`, and
`gemini_api_key` have no defaults and are required every time. `aws_region`,
`instance_type`, and `db_instance_class` have sane defaults and can be
overridden the same way if needed.

Tip: instead of retyping `-var` flags, put them in an `infra/terraform.tfvars`
file (already covered by `.gitignore`, since it holds secrets in plaintext)
and just run `terraform plan` / `terraform apply` with no flags.

Note: `aws_region` in `variables.tf` currently isn't wired into the
`provider "aws"` block in `main.tf` - the provider is pinned directly to
`us-west-2`. Passing `-var="aws_region=..."` won't change where things
deploy unless `main.tf` is updated to reference `var.aws_region`.

`terraform apply` takes several minutes - most of it is RDS provisioning.

## After apply: update GitHub Actions and Vercel

Terraform prints two outputs when it finishes (`terraform output` to see
them again later):

- **`rds_endpoint`** → update these GitHub Actions repo secrets (Settings →
  Secrets and variables → Actions), used by `.github/workflows/fetch-stocks.yml`:
  - `DB_HOST` = the `rds_endpoint` value
  - `DB_PORT` = `5432`
  - `DB_USER` = `finsight_admin`
  - `DB_PASSWORD` = the same value you passed as `db_password`
  - `DB_NAME` = `finsight`

- **`backend_https_url`** → update these Vercel project env vars:
  - `REACT_APP_GO_API` = the `backend_https_url` value
  - `REACT_APP_PYTHON_API` = the `backend_https_url` value

  Redeploy on Vercel afterward (env var changes need a redeploy to take
  effect), and manually trigger the `Fetch Stock Data` GitHub Actions
  workflow once so the new database gets populated.

## Verify it worked

```bash
curl https://<backend_https_url>/api/health      # -> {"status":"ok"}
curl https://<backend_https_url>/api/stocks      # -> [] until the fetcher has run once
```

Then open the Vercel frontend and try a natural-language query end to end.

To check on the instance itself:

```bash
ssh -i finsight-key.pem ubuntu@<elastic IP>       # only works from my_ip
cd /opt/finsight
docker compose -f docker-compose.prod.yml ps      # both containers should be "Up"
journalctl -u caddy --no-pager -n 50               # Caddy / TLS cert issuance logs
```

## Security note: the RDS security group

`aws_security_group.rds` intentionally allows inbound Postgres (port 5432)
from `0.0.0.0/0`. This is deliberate, not an oversight: the GitHub Actions
fetcher job has no fixed IP to allowlist, so both it and the EC2 instance
need to reach RDS from wherever they happen to run. Access is protected by
password authentication plus enforced TLS (`DB_SSLMODE=require`) rather than
network-level restriction - this is the same security model Neon itself
used. If you want stricter network isolation later, put the fetcher behind a
static egress IP (e.g. a NAT Gateway or a self-hosted runner) and narrow the
ingress rule to that CIDR plus the EC2 security group.

## Tear down

```bash
cd infra
terraform destroy \
  -var="db_password=<same value>" \
  -var="ssh_key_name=<same value>" \
  -var="my_ip=<same value>" \
  -var="alpha_vantage_key=<same value>" \
  -var="gemini_api_key=<same value>"
```

`skip_final_snapshot = true` on the RDS instance means **destroying it
deletes all data permanently, with no final snapshot**. Back up anything you
need first (e.g. `pg_dump`).
