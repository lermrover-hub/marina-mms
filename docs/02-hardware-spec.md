# Marina MMS — Server Hardware Specification
**Self-Hosting Guide | Version 1.0 | May 2026**
*Ocean Rover Marina & Boat Yard Management System*

---

## 1. Overview

This document describes the hardware specifications, software stack, and installation procedures for **self-hosting** the Marina MMS application on your own on-premise server. This is an alternative to the cloud deployment described in `01-server-config-guide.md`.

Self-hosting is appropriate when:
- Your marina requires data to remain on-site for regulatory or privacy reasons
- Internet connectivity is unreliable and local access must be guaranteed
- You have existing IT infrastructure and technical staff
- Long-term cost analysis favors owned hardware over monthly cloud fees
- You operate in a location where cloud provider data centres are too far away for acceptable performance

Self-hosting requires ongoing responsibility for: hardware maintenance, operating system updates, security patching, database backups, network administration, and SSL certificate management. If your marina does not have dedicated IT staff, the cloud deployment (Vercel + Supabase) is strongly recommended.

---

## 2. Minimum Requirements — Small Marina (Up to 50 Berths)

This specification supports a single-server deployment suitable for a small marina with up to 50 berths/slots, up to 20 concurrent users, and light repair yard operations.

| Component | Minimum Specification | Notes |
|---|---|---|
| CPU | 4 cores / 8 threads | Intel Core i5 12th gen, AMD Ryzen 5 5600, or equivalent |
| RAM | 16 GB DDR4 | 3200 MHz or faster |
| Primary Storage | 500 GB NVMe SSD | Samsung 970 Evo, WD Black SN850, or equivalent |
| Network Card | 1 Gbps Ethernet | Built-in is fine; dedicated NIC for reliability |
| Dedicated Internet | 100 Mbps symmetric | Static IP required |
| Operating System | Ubuntu 22.04 LTS | 64-bit server edition |
| Power Supply | Reliable UPS 1000VA | APC Back-UPS Pro 1000 or equivalent |
| Physical Security | Locked server cabinet or room | Restrict physical access |

**Estimated hardware cost (Thailand, 2026):** ฿25,000 – ฿50,000 for a mini-PC or entry tower server.

**Suitable hardware examples:**
- Intel NUC 12 Pro with Core i5-1240P (compact, low power)
- Dell OptiPlex 7090 Tower (compact commercial desktop)
- Lenovo ThinkCentre M90t Gen 3 (small form factor)
- Any server-grade mini PC with the above specs

---

## 3. Recommended Specification — Medium Marina (50–200 Berths)

This specification supports a medium marina with 50–200 berths, up to 50 concurrent users, active boat yard operations, photo storage on-site, and management reporting.

| Component | Recommended Specification | Notes |
|---|---|---|
| CPU | 8 cores / 16 threads | Intel Xeon E-2300 series, AMD EPYC 7002, or Intel Core i7-13700 |
| RAM | 32 GB DDR4 ECC | ECC (Error Correcting Code) RAM preferred for data integrity |
| Primary Storage (OS+App) | 1 TB NVMe SSD | For operating system, application, and database |
| Secondary Storage (Backups+Files) | 2 TB HDD | For file uploads (photos, documents) and local backups |
| RAID | RAID 1 for OS drive | Mirrors two drives for automatic failover |
| Network | 1 Gbps dedicated, static IP | With ISP failover if available |
| UPS | 2000VA with network management | APC Smart-UPS 2200 — allows graceful shutdown on power loss |
| Operating System | Ubuntu 22.04 LTS Server | No desktop environment needed |
| Cooling | Adequate server room cooling | Target ambient: 18–24°C |

**Estimated hardware cost (Thailand, 2026):** ฿80,000 – ฿150,000 for a proper rack-mount or tower server.

**Suitable hardware examples:**
- Dell PowerEdge T150 (tower server, affordable, Thailand warranty available)
- HPE ProLiant ML110 Gen10 Plus (tower server, enterprise reliability)
- Lenovo ThinkSystem ST50 V2 (compact tower, good value)

**Important note on internet:** A static IP address is **required** for self-hosting so that your domain's DNS can point to a fixed address. Contact your ISP (True Business, AIS Fibre Business, CAT, NT Internet) specifically for a static IP — this typically costs ฿500–฿2,000 extra per month.

---

## 4. High Availability Configuration — Large Marina (200+ Berths)

For large marinas requiring high availability, zero-downtime maintenance, and disaster recovery:

| Component | Specification | Quantity |
|---|---|---|
| Application Servers | Load-balanced pair | 2× |
| CPU (each app server) | Intel Xeon Silver 4316, 20 cores | 2× |
| RAM (each app server) | 64 GB DDR4 ECC | 2× |
| Dedicated Database Server | PostgreSQL only | 1× |
| CPU (DB server) | Intel Xeon Silver 4310, 12 cores | 1× |
| RAM (DB server) | 128 GB DDR4 ECC | 1× |
| Storage (DB server) | All-flash NAS, 4 TB, RAID 10 | 1× |
| Network switches | Managed L2 gigabit | 2× (redundant) |
| Internet | Dual ISP with failover | 2× providers |
| UPS/Generator | Online UPS + diesel generator | Full coverage |
| Backup server | Off-site or cloud backup | Supabase/S3 |

**Architecture for HA deployment:**

```
Internet Load Balancer (HAProxy or Nginx)
         /               \
App Server 1         App Server 2
(Next.js + PM2)    (Next.js + PM2)
         \               /
    PostgreSQL Primary DB
              |
    PostgreSQL Replica DB (streaming replication)
              |
         Backup Storage (NAS / Cloud)
```

This configuration provides zero-downtime application updates, automatic failover if one app server fails, and database replication for data protection.

---

## 5. Software Stack (Self-Hosted)

| Component | Software | Recommended Version | Purpose |
|---|---|---|---|
| Operating System | Ubuntu Server | 22.04 LTS | Base OS — LTS for 5-year security updates |
| Runtime | Node.js | 20 LTS | JavaScript runtime for Next.js |
| Database | PostgreSQL | 16 | Primary relational database |
| Reverse Proxy / Web Server | Nginx | 1.24+ | SSL termination, proxy to Node.js |
| Process Manager | PM2 | Latest stable | Keeps Next.js running, auto-restart |
| SSL Certificates | Certbot (Let's Encrypt) | Latest | Free auto-renewing SSL certificates |
| Containerization (optional) | Docker + Docker Compose | 24+ | Easier deployment and isolation |
| Monitoring | Prometheus + Grafana | Latest | System and application metrics |
| Log Management | Loki or journald | Built-in / latest | Centralized log storage |
| Backup | pg_dump + rclone | Latest | Database and file backups |
| Firewall | UFW (Uncomplicated Firewall) | Built-in Ubuntu | Network access control |

---

## 6. Self-Hosted Installation Guide

### 6.1 Prepare the Operating System

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git vim htop ufw fail2ban

# Set timezone to Bangkok
sudo timedatectl set-timezone Asia/Bangkok

# Create a dedicated user for the application
sudo useradd -m -s /bin/bash marinaapp
sudo usermod -aG sudo marinaapp
```

### 6.2 Configure Firewall

```bash
# Allow SSH (important — do this before enabling UFW)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Verify status
sudo ufw status verbose
```

Block all other incoming ports. Restrict SSH to known IP addresses if possible:
```bash
# Allow SSH only from your office IP (replace x.x.x.x)
sudo ufw delete allow 22/tcp
sudo ufw allow from x.x.x.x to any port 22
```

### 6.3 Install Docker and Docker Compose

Using Docker simplifies deployment and makes future updates easier:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add current user to docker group (avoids needing sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 6.4 Install PostgreSQL via Docker

```bash
# Create a directory for persistent database storage
sudo mkdir -p /data/postgres
sudo chown 999:999 /data/postgres

# Start PostgreSQL 16 container
docker run -d \
  --name marina-postgres \
  --restart unless-stopped \
  -e POSTGRES_DB=marina_mms \
  -e POSTGRES_USER=marina_user \
  -e POSTGRES_PASSWORD=YourStrongPassword2026! \
  -p 127.0.0.1:5432:5432 \
  -v /data/postgres:/var/lib/postgresql/data \
  postgres:16

# Verify it's running
docker ps | grep marina-postgres

# Test connection
docker exec -it marina-postgres psql -U marina_user -d marina_mms -c "SELECT version();"
```

**Note:** Binding to `127.0.0.1:5432` means PostgreSQL is only accessible locally (not from the internet). This is a critical security measure.

### 6.5 Apply Database Schema

```bash
# Copy migration files to the server
# (assuming you've cloned the repo)
cd /opt/marina-mms

# Apply migrations using the PostgreSQL client inside the container
docker exec -i marina-postgres psql \
  -U marina_user -d marina_mms \
  < database/migrations/001_initial_schema.sql

docker exec -i marina-postgres psql \
  -U marina_user -d marina_mms \
  < database/migrations/002_add_rls.sql

# Continue for all migration files in order
```

### 6.6 Install Node.js

```bash
# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### 6.7 Clone and Configure the Application

```bash
# Clone the repository
sudo mkdir -p /opt/marina-mms
sudo chown $USER:$USER /opt/marina-mms
git clone https://github.com/lermrover-hub/marina-mms.git /opt/marina-mms
cd /opt/marina-mms

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit environment variables for self-hosted setup
nano .env.local
```

Key environment variables for self-hosted deployment (`.env.local`):
```env
# Database — use localhost since PostgreSQL runs on same server
DATABASE_URL=postgresql://marina_user:YourStrongPassword2026!@127.0.0.1:5432/marina_mms

# Next.js public URL
NEXT_PUBLIC_APP_URL=https://marina.yourdomain.com

# NextAuth — generate AUTH_SECRET with: openssl rand -base64 32
AUTH_SECRET=your_generated_secret_here
AUTH_URL=https://marina.yourdomain.com
NEXTAUTH_URL=https://marina.yourdomain.com
AUTH_TRUST_HOST=1

# File storage — local filesystem (or configure MinIO for S3-compatible)
UPLOAD_DIR=/data/marina-uploads

# Email
RESEND_API_KEY=re_your_key
EMAIL_FROM=Marina MMS <noreply@yourdomain.com>
```

### 6.8 Build the Application

```bash
cd /opt/marina-mms

# Build Next.js for production
npm run build

# Verify build succeeded
ls -la .next/
```

The build should complete in 2-5 minutes. If it fails, check for TypeScript errors in the output.

### 6.9 Run with PM2

PM2 keeps the application running continuously and restarts it automatically after server reboots or crashes.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
pm2 start npm --name "marina-mms" -- start

# Verify it's running
pm2 status
pm2 logs marina-mms --lines 20

# Configure PM2 to start on system boot
pm2 startup
# Run the command that PM2 outputs (it will look like: sudo env PATH=... pm2 startup ...)
pm2 save
```

The application will now automatically start after server restarts.

### 6.10 Install and Configure Nginx

Nginx acts as a reverse proxy, handling SSL termination and forwarding requests to the Next.js application running on port 3000.

```bash
sudo apt install -y nginx

# Create a new site configuration
sudo nano /etc/nginx/sites-available/marina-mms
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name marina.yourdomain.com;
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name marina.yourdomain.com;

    # SSL certificates (will be filled by Certbot)
    ssl_certificate /etc/letsencrypt/live/marina.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/marina.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Increase upload size for file/photo uploads
    client_max_body_size 50M;

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/marina-mms /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 6.11 SSL Certificate with Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d marina.yourdomain.com

# Follow the prompts:
# - Enter your email address for renewal notifications
# - Agree to Terms of Service
# - Choose to redirect HTTP to HTTPS (recommended)

# Test automatic renewal
sudo certbot renew --dry-run

# Certbot auto-renews certificates via a systemd timer — verify
sudo systemctl status certbot.timer
```

Certificates are valid for 90 days and auto-renew when 30 days remain. No manual action needed.

---

## 7. Network Requirements

### Internet Connection

| Requirement | Specification | Notes |
|---|---|---|
| Type | Dedicated fiber preferred | Avoid shared/residential connections for business use |
| Speed | Minimum 100 Mbps symmetric | Higher for larger marinas or many concurrent users |
| Static IP | **Required** | Dynamic IP is not compatible with DNS hosting |
| Reliability | SLA-backed business line | Consumer lines have no uptime guarantee |
| Failover | Secondary ISP recommended | Critical for uninterrupted operations |

Contact True Business, AIS Business, or NT Internet for business fiber with static IP in Thailand. Pricing typically starts at ฿2,000–฿5,000/month for 100 Mbps with static IP.

### Open Ports

Configure both your server's UFW firewall and your network router/firewall:

| Port | Protocol | Direction | Purpose |
|---|---|---|---|
| 80 | TCP | Inbound | HTTP (auto-redirects to HTTPS) |
| 443 | TCP | Inbound | HTTPS — main application |
| 22 | TCP | Inbound | SSH — restrict to admin IPs only |

**All other inbound ports should be BLOCKED.**

### VPN for Admin Access

Rather than exposing SSH port 22 to the internet, consider:

1. **WireGuard VPN** (recommended) — lightweight, modern VPN. Admin connects via VPN, then SSH to internal IP. No port 22 exposed publicly.
2. **Tailscale** (easiest) — free for small teams, zero-config mesh VPN. Install on server and admin laptops for secure remote access.

```bash
# Install Tailscale (easiest option)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

---

## 8. Backup Strategy

Regular backups are essential. Unlike Supabase cloud which provides automatic backups, self-hosted setups require manual backup configuration.

### Automated Database Backup Script

Create a daily backup cron job:

```bash
# Create backup directory
sudo mkdir -p /data/backups/database
sudo chown $USER:$USER /data/backups

# Create backup script
nano /opt/scripts/backup-database.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/data/backups/database"
DATE=$(date +%Y-%m-%d)
DB_NAME="marina_mms"
DB_USER="marina_user"
DB_PASSWORD="YourStrongPassword2026!"

# Create compressed database dump
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h 127.0.0.1 -U $DB_USER $DB_NAME \
  --no-owner --no-acl -F c \
  -f "$BACKUP_DIR/marina-mms-$DATE.dump"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.dump" -mtime +30 -delete

echo "Backup completed: marina-mms-$DATE.dump"
```

```bash
chmod +x /opt/scripts/backup-database.sh

# Add to crontab (runs daily at 02:00)
crontab -e
# Add this line:
0 2 * * * /opt/scripts/backup-database.sh >> /var/log/marina-backup.log 2>&1
```

### Offsite Backup with rclone

Use rclone to copy backups to Google Drive, OneDrive, or S3:

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure Google Drive (interactive setup)
rclone config

# Copy backups to Google Drive
rclone copy /data/backups/database remote:marina-mms-backups/
```

### Complete Backup Schedule

| Backup Type | Frequency | Time | Retention | Storage |
|---|---|---|---|---|
| PostgreSQL database dump | Daily | 02:00 | 30 days local, 90 days cloud | Local + Google Drive |
| File uploads (photos/docs) | Daily | 03:00 | 90 days | Google Drive / OneDrive |
| Full server snapshot | Weekly | Sunday 04:00 | 4 weeks | External 4TB drive |
| Application config (`.env.local`, nginx) | On every change | Manual | Forever | Secure password manager / Git private repo |
| Nginx config + SSL | Weekly | — | Indefinitely | USB drive in safe |

---

## 9. System Monitoring (Self-Hosted)

### Basic Monitoring with PM2

```bash
# View real-time status
pm2 monit

# View logs
pm2 logs marina-mms

# View resource usage
pm2 status
```

### Prometheus + Grafana (Recommended for Production)

```bash
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "127.0.0.1:9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "127.0.0.1:3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: your_grafana_password
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

volumes:
  grafana_data:
```

Access Grafana at `http://localhost:3001` (via SSH tunnel for security).

---

## 10. Estimated Costs: Self-Hosted vs Cloud

This comparison helps marina operators make an informed decision between on-premise and cloud deployment.

| Item | Self-Hosted (Medium Marina) | Cloud (Vercel + Supabase) |
|---|---|---|
| **Initial Setup** | | |
| Server hardware | ฿80,000 – ฿150,000 | ฿0 |
| UPS | ฿8,000 – ฿15,000 | ฿0 |
| Installation labor | ฿10,000 – ฿20,000 | ฿0 |
| **Monthly Operating Costs** | | |
| Business internet (static IP) | ฿2,000 – ฿5,000 | ฿0 (use existing) |
| Electricity (server 24/7) | ฿500 – ฿1,500 | ฿0 |
| IT maintenance (hrs/month) | 4–8 hrs × ฿500/hr = ฿2,000 – ฿4,000 | ~0 hrs |
| Vercel hosting | ฿0 | ฿0 – ฿700 (Hobby/Pro) |
| Supabase database | ฿0 | ฿0 – ฿875 (Free/Pro) |
| **Total Monthly** | ฿4,500 – ฿10,500 | ฿0 – ฿1,575 |
| **5-Year Total Cost** | ฿370,000 – ฿780,000 | ฿0 – ฿94,500 |
| **Data sovereignty** | Full control | Data in Singapore/US |
| **Maintenance burden** | High (IT staff required) | Very low |
| **Recommended for** | Large marina with strict data requirements, existing IT team | Most marinas — best value |

**Conclusion:** For the vast majority of marinas, the cloud deployment is the better choice — lower cost, zero maintenance, enterprise-grade reliability, and automatic updates. Self-hosting is justified only when data sovereignty is a strict legal requirement or when the marina is in a location with no reliable internet.

---

## 11. Updating the Application (Self-Hosted)

When a new version is released to GitHub, update the self-hosted installation:

```bash
cd /opt/marina-mms

# Pull latest code
git pull origin main

# Install any new dependencies
npm install

# Apply any new database migrations
docker exec -i marina-postgres psql \
  -U marina_user -d marina_mms \
  < database/migrations/[new_migration].sql

# Build the new version
npm run build

# Restart the application (zero-downtime with PM2 cluster mode)
pm2 reload marina-mms
```

For zero-downtime updates with multiple app servers, use PM2's cluster mode:
```bash
pm2 start npm --name "marina-mms" -i 2 -- start  # Run 2 instances
pm2 reload marina-mms  # Rolling restart — no downtime
```

---

*Document prepared for Ocean Rover Marina & Boat Yard Management System*
*For cloud deployment, see: `01-server-config-guide.md`*
