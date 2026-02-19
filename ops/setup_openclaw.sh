#!/bin/bash

# OpenClaw Setup Script for AWS Free Tier (Amazon Linux 2023)
# Usage: 
# 1. Upload to server: scp -i key.pem setup_openclaw.sh ec2-user@<ip>:~/
# 2. Run: chmod +x setup_openclaw.sh && ./setup_openclaw.sh

set -e # Exit on error

echo ">>> Starting OpenClaw Setup (Amazon Linux 2023)..."

# 1. System Updates
echo ">>> Updating system packages..."
sudo dnf update -y
sudo dnf install -y git

# 2. Swap Configuration (Critical for 1GB RAM instances)
if [ ! -f /swapfile ]; then
    echo ">>> Creating 4GB Swap File..."
    sudo dd if=/dev/zero of=/swapfile bs=128M count=32
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
    echo ">>> Swap created successfully."
else
    echo ">>> Swap file already exists. Skipping."
fi

# 3. Install Node.js v22
echo ">>> Installing Node.js v22..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
    sudo dnf install -y nodejs
else
    echo ">>> Node.js is already installed: $(node -v)"
fi

# 4. Install Dependencies (For headless browsers/playwright)
echo ">>> Installing common dependencies..."
sudo dnf install -y alsa-lib at-spi2-atk atk cups-libs libdrm libXcomposite libXdamage libXrandr libgbm pango nss libxkbcommon

# 5. Install OpenClaw
echo ">>> Installing OpenClaw globally..."
sudo npm install -g openclaw

# 6. Setup PM2 for persistence
echo ">>> Setting up PM2 process manager..."
sudo npm install -g pm2

# Check if already running
if pm2 describe openclaw > /dev/null; then
    echo ">>> OpenClaw already managed by PM2. Restarting..."
    pm2 restart openclaw
else
    echo ">>> Starting OpenClaw on port 18789..."
    pm2 start openclaw --name "openclaw" -- --port 18789
    pm2 save
    
    echo ">>> Generating startup script..."
    # PM2 startup for Amazon Linux (systemd)
    sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user || true
    pm2 save
fi

echo "=========================================="
echo "   SETUP COMPLETE!"
echo "=========================================="
echo "OpenClaw should be running on port 18789."
echo "Public URL: http://$(curl -s http://checkip.amazonaws.com):18789"
echo "Ensure your AWS Security Group allows TCP 18789."
echo "=========================================="
