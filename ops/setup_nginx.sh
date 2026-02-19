#!/bin/bash
set -e

DOMAIN="promo.isitas.org"
PORT="18789"

echo ">>> Setting up Nginx for $DOMAIN -> Port $PORT..."

# 1. Install Nginx + Certbot
sudo dnf install -y nginx python3-certbot-nginx

# 2. Create Reverse Proxy Config
echo ">>> Creating /etc/nginx/conf.d/openclaw.conf..."
cat <<EOF | sudo tee /etc/nginx/conf.d/openclaw.conf
server {
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    listen 80;
}
EOF

# 3. Test & Reload Nginx
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

echo ">>> Nginx setup complete!"
echo ">>> Next step: Run 'sudo certbot --nginx -d $DOMAIN' to enable SSL."
