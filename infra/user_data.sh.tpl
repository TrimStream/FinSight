#!/bin/bash
# EC2 boot script for the FinSight backend host (Ubuntu 22.04).
# Rendered by Terraform's templatefile() - see aws_instance.backend in main.tf.
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

# cloud-init's own background processes (e.g. unattended-upgrades) can briefly
# hold the dpkg lock on a freshly booted instance; wait it out instead of
# letting apt-get fail the whole boot script.
wait_for_apt() {
  while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
    sleep 2
  done
}

wait_for_apt
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

# --- Install Docker Engine + Compose plugin (official Docker apt repo) ---
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $VERSION_CODENAME stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

wait_for_apt
apt-get update -y
wait_for_apt
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

# --- Install Caddy (official Caddy apt repo) ---
wait_for_apt
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null

wait_for_apt
apt-get update -y
wait_for_apt
apt-get install -y caddy

# --- Clone FinSight ---
git clone https://github.com/TrimStream/FinSight.git /opt/finsight
cd /opt/finsight

# --- Write .env.prod for the backend + python containers ---
cat > /opt/finsight/.env.prod <<EOF
DB_HOST=${db_host}
DB_PORT=${db_port}
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_NAME=${db_name}
DB_SSLMODE=require
ALPHA_VANTAGE_KEY=${alpha_vantage_key}
GEMINI_API_KEY=${gemini_api_key}
EOF
chmod 600 /opt/finsight/.env.prod

# --- Bind container ports to localhost only - Caddy is the sole public entrypoint ---
sed -i 's/"8080:8080"/"127.0.0.1:8080:8080"/' docker-compose.prod.yml
sed -i 's/"8001:8001"/"127.0.0.1:8001:8001"/' docker-compose.prod.yml

# --- Build and start the app ---
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# --- Configure Caddy: route AI/query traffic to the Python service, everything else to Go ---
cat > /etc/caddy/Caddyfile <<EOF
${domain} {
    handle /api/query* {
        reverse_proxy 127.0.0.1:8001
    }

    handle /api/health {
        reverse_proxy 127.0.0.1:8001
    }

    handle {
        reverse_proxy 127.0.0.1:8080
    }
}
EOF

systemctl restart caddy
systemctl enable caddy
