'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  Footer, PageNumber, PageBreak, NumberingType, LevelFormat,
  TableBorders, convertInchesToTwip, ImageRun
} = require('docx');
const fs = require('fs');

// ─── Colour palette ───────────────────────────────────────────────────────────
const TEAL   = '13988f';
const DARK   = '1f2933';
const GREY   = '647076';
const LGREY  = 'f3f4f6';
const WHITE  = 'ffffff';
const THEAD  = '1a6b67'; // darker teal for table headers

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normal paragraph */
function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    ...opts,
    children: [new TextRun({
      text,
      font: 'Arial',
      size: 22,
      color: DARK,
      ...(opts.run || {}),
    })],
  });
}

/** Blank spacer line */
function spacer(before = 60, after = 60) {
  return new Paragraph({ spacing: { before, after }, children: [] });
}

/** Heading 1 */
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: TEAL })],
  });
}

/** Heading 2 */
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: DARK })],
  });
}

/** Heading 3 */
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 60 },
    children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: GREY })],
  });
}

/** Bullet list item */
function bullet(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 720, hanging: 360 },
    children: [
      new TextRun({ text: '•  ', font: 'Arial', size: 22, color: TEAL, bold: true }),
      new TextRun({ text, font: 'Arial', size: 22, color: DARK }),
    ],
  });
}

/** Numbered list item */
function numbered(text, n) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 720, hanging: 360 },
    children: [
      new TextRun({ text: `${n}.  `, font: 'Arial', size: 22, color: TEAL, bold: true }),
      new TextRun({ text, font: 'Arial', size: 22, color: DARK }),
    ],
  });
}

/** Code block paragraph */
function code(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 360, right: 360 },
    shading: { fill: LGREY, type: ShadingType.CLEAR, color: LGREY },
    children: [new TextRun({ text, font: 'Courier New', size: 18, color: DARK })],
  });
}

/** Bold inline label inside a normal paragraph */
function boldPara(label, rest) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: label, font: 'Arial', size: 22, bold: true, color: DARK }),
      new TextRun({ text: rest, font: 'Arial', size: 22, color: DARK }),
    ],
  });
}

/** Horizontal rule (thin teal border bottom paragraph) */
function hr() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { color: TEAL, size: 6, space: 1, style: BorderStyle.SINGLE } },
    children: [],
  });
}

// ─── Table builder ────────────────────────────────────────────────────────────

function makeTable(headers, rows) {
  const colWidths = headers.map(() => Math.floor(9000 / headers.length));

  function headerCell(text) {
    return new TableCell({
      shading: { fill: THEAD, type: ShadingType.CLEAR, color: THEAD },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text, font: 'Arial', size: 20, bold: true, color: WHITE })],
      })],
    });
  }

  function dataCell(text, shade = false) {
    return new TableCell({
      shading: shade ? { fill: 'f0fafa', type: ShadingType.CLEAR, color: 'f0fafa' } : undefined,
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: String(text), font: 'Arial', size: 20, color: DARK })],
      })],
    });
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 0, right: 0 },
    borders: {
      top:           { style: BorderStyle.SINGLE, size: 4, color: TEAL },
      bottom:        { style: BorderStyle.SINGLE, size: 4, color: TEAL },
      left:          { style: BorderStyle.SINGLE, size: 4, color: TEAL },
      right:         { style: BorderStyle.SINGLE, size: 4, color: TEAL },
      insideH:       { style: BorderStyle.SINGLE, size: 2, color: 'cccccc' },
      insideV:       { style: BorderStyle.SINGLE, size: 2, color: 'cccccc' },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(h => headerCell(h)),
      }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map(cell => dataCell(cell, ri % 2 === 0)),
      })),
    ],
  });
}

// ─── Document sections ────────────────────────────────────────────────────────

function titlePage() {
  return [
    spacer(2880),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'Marina MMS',
        font: 'Arial', size: 72, bold: true, color: TEAL,
      })],
    }),
    spacer(120),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'Server Hardware Specification',
        font: 'Arial', size: 48, bold: true, color: DARK,
      })],
    }),
    spacer(240),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 8, color: TEAL } },
      children: [],
    }),
    spacer(120),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'Self-Hosting Guide  |  Version 1.0  |  May 2026',
        font: 'Arial', size: 24, color: GREY, italics: true,
      })],
    }),
    spacer(60),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'Ocean Rover Marina & Boat Yard Management System',
        font: 'Arial', size: 22, color: GREY,
      })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function tocPage() {
  const entries = [
    ['1', 'Overview'],
    ['2', 'Minimum Requirements — Small Marina (Up to 50 Berths)'],
    ['3', 'Recommended Specification — Medium Marina (50–200 Berths)'],
    ['4', 'High Availability Configuration — Large Marina (200+ Berths)'],
    ['5', 'Software Stack (Self-Hosted)'],
    ['6', 'Self-Hosted Installation Guide'],
    ['7', 'Network Requirements'],
    ['8', 'Backup Strategy'],
    ['9', 'System Monitoring (Self-Hosted)'],
    ['10', 'Estimated Costs: Self-Hosted vs Cloud'],
    ['11', 'Updating the Application (Self-Hosted)'],
  ];

  return [
    h1('Table of Contents'),
    hr(),
    spacer(120),
    ...entries.map(([num, title]) =>
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({ text: `${num}.  `, font: 'Arial', size: 22, bold: true, color: TEAL }),
          new TextRun({ text: title, font: 'Arial', size: 22, color: DARK }),
        ],
      })
    ),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Main content ─────────────────────────────────────────────────────────────

function section1() {
  return [
    h1('1. Overview'),
    hr(),
    spacer(),
    para('This document describes the hardware specifications, software stack, and installation procedures for self-hosting the Marina MMS application on your own on-premise server. This is an alternative to the cloud deployment described in 01-server-config-guide.md.'),
    spacer(),
    para('Self-hosting is appropriate when:', { run: { bold: true } }),
    bullet('Your marina requires data to remain on-site for regulatory or privacy reasons'),
    bullet('Internet connectivity is unreliable and local access must be guaranteed'),
    bullet('You have existing IT infrastructure and technical staff'),
    bullet('Long-term cost analysis favors owned hardware over monthly cloud fees'),
    bullet('You operate in a location where cloud provider data centres are too far away for acceptable performance'),
    spacer(),
    para('Self-hosting requires ongoing responsibility for: hardware maintenance, operating system updates, security patching, database backups, network administration, and SSL certificate management. If your marina does not have dedicated IT staff, the cloud deployment (Vercel + Supabase) is strongly recommended.'),
    spacer(200),
  ];
}

function section2() {
  const rows = [
    ['CPU', '4 cores / 8 threads', 'Intel Core i5 12th gen, AMD Ryzen 5 5600, or equivalent'],
    ['RAM', '16 GB DDR4', '3200 MHz or faster'],
    ['Primary Storage', '500 GB NVMe SSD', 'Samsung 970 Evo, WD Black SN850, or equivalent'],
    ['Network Card', '1 Gbps Ethernet', 'Built-in is fine; dedicated NIC for reliability'],
    ['Dedicated Internet', '100 Mbps symmetric', 'Static IP required'],
    ['Operating System', 'Ubuntu 22.04 LTS', '64-bit server edition'],
    ['Power Supply', 'Reliable UPS 1000VA', 'APC Back-UPS Pro 1000 or equivalent'],
    ['Physical Security', 'Locked server cabinet or room', 'Restrict physical access'],
  ];

  return [
    h1('2. Minimum Requirements — Small Marina (Up to 50 Berths)'),
    hr(),
    spacer(),
    para('This specification supports a single-server deployment suitable for a small marina with up to 50 berths/slots, up to 20 concurrent users, and light repair yard operations.'),
    spacer(120),
    makeTable(['Component', 'Minimum Specification', 'Notes'], rows),
    spacer(120),
    boldPara('Estimated hardware cost (Thailand, 2026): ', '฿25,000 – ฿50,000 for a mini-PC or entry tower server.'),
    spacer(),
    para('Suitable hardware examples:', { run: { bold: true } }),
    bullet('Intel NUC 12 Pro with Core i5-1240P (compact, low power)'),
    bullet('Dell OptiPlex 7090 Tower (compact commercial desktop)'),
    bullet('Lenovo ThinkCentre M90t Gen 3 (small form factor)'),
    bullet('Any server-grade mini PC with the above specs'),
    spacer(200),
  ];
}

function section3() {
  const rows = [
    ['CPU', '8 cores / 16 threads', 'Intel Xeon E-2300 series, AMD EPYC 7002, or Intel Core i7-13700'],
    ['RAM', '32 GB DDR4 ECC', 'ECC (Error Correcting Code) RAM preferred for data integrity'],
    ['Primary Storage (OS+App)', '1 TB NVMe SSD', 'For operating system, application, and database'],
    ['Secondary Storage (Backups+Files)', '2 TB HDD', 'For file uploads (photos, documents) and local backups'],
    ['RAID', 'RAID 1 for OS drive', 'Mirrors two drives for automatic failover'],
    ['Network', '1 Gbps dedicated, static IP', 'With ISP failover if available'],
    ['UPS', '2000VA with network management', 'APC Smart-UPS 2200 — allows graceful shutdown on power loss'],
    ['Operating System', 'Ubuntu 22.04 LTS Server', 'No desktop environment needed'],
    ['Cooling', 'Adequate server room cooling', 'Target ambient: 18–24°C'],
  ];

  return [
    h1('3. Recommended Specification — Medium Marina (50–200 Berths)'),
    hr(),
    spacer(),
    para('This specification supports a medium marina with 50–200 berths, up to 50 concurrent users, active boat yard operations, photo storage on-site, and management reporting.'),
    spacer(120),
    makeTable(['Component', 'Recommended Specification', 'Notes'], rows),
    spacer(120),
    boldPara('Estimated hardware cost (Thailand, 2026): ', '฿80,000 – ฿150,000 for a proper rack-mount or tower server.'),
    spacer(),
    para('Suitable hardware examples:', { run: { bold: true } }),
    bullet('Dell PowerEdge T150 (tower server, affordable, Thailand warranty available)'),
    bullet('HPE ProLiant ML110 Gen10 Plus (tower server, enterprise reliability)'),
    bullet('Lenovo ThinkSystem ST50 V2 (compact tower, good value)'),
    spacer(),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      shading: { fill: 'fff8e1', type: ShadingType.CLEAR },
      children: [
        new TextRun({ text: 'Important note on internet: ', font: 'Arial', size: 22, bold: true, color: DARK }),
        new TextRun({ text: 'A static IP address is required for self-hosting so that your domain\'s DNS can point to a fixed address. Contact your ISP (True Business, AIS Fibre Business, CAT, NT Internet) specifically for a static IP — this typically costs ฿500–฿2,000 extra per month.', font: 'Arial', size: 22, color: DARK }),
      ],
    }),
    spacer(200),
  ];
}

function section4() {
  const rows = [
    ['Application Servers', 'Load-balanced pair', '2×'],
    ['CPU (each app server)', 'Intel Xeon Silver 4316, 20 cores', '2×'],
    ['RAM (each app server)', '64 GB DDR4 ECC', '2×'],
    ['Dedicated Database Server', 'PostgreSQL only', '1×'],
    ['CPU (DB server)', 'Intel Xeon Silver 4310, 12 cores', '1×'],
    ['RAM (DB server)', '128 GB DDR4 ECC', '1×'],
    ['Storage (DB server)', 'All-flash NAS, 4 TB, RAID 10', '1×'],
    ['Network switches', 'Managed L2 gigabit', '2× (redundant)'],
    ['Internet', 'Dual ISP with failover', '2× providers'],
    ['UPS/Generator', 'Online UPS + diesel generator', 'Full coverage'],
    ['Backup server', 'Off-site or cloud backup', 'Supabase/S3'],
  ];

  return [
    h1('4. High Availability Configuration — Large Marina (200+ Berths)'),
    hr(),
    spacer(),
    para('For large marinas requiring high availability, zero-downtime maintenance, and disaster recovery:'),
    spacer(120),
    makeTable(['Component', 'Specification', 'Quantity'], rows),
    spacer(120),
    para('Architecture for HA deployment:', { run: { bold: true } }),
    spacer(60),
    code('Internet Load Balancer (HAProxy or Nginx)'),
    code('         /               \\'),
    code('App Server 1         App Server 2'),
    code('(Next.js + PM2)    (Next.js + PM2)'),
    code('         \\               /'),
    code('    PostgreSQL Primary DB'),
    code('              |'),
    code('    PostgreSQL Replica DB (streaming replication)'),
    code('              |'),
    code('         Backup Storage (NAS / Cloud)'),
    spacer(120),
    para('This configuration provides zero-downtime application updates, automatic failover if one app server fails, and database replication for data protection.'),
    spacer(200),
  ];
}

function section5() {
  const rows = [
    ['Operating System', 'Ubuntu Server', '22.04 LTS', 'Base OS — LTS for 5-year security updates'],
    ['Runtime', 'Node.js', '20 LTS', 'JavaScript runtime for Next.js'],
    ['Database', 'PostgreSQL', '16', 'Primary relational database'],
    ['Reverse Proxy / Web Server', 'Nginx', '1.24+', 'SSL termination, proxy to Node.js'],
    ['Process Manager', 'PM2', 'Latest stable', 'Keeps Next.js running, auto-restart'],
    ['SSL Certificates', 'Certbot (Let\'s Encrypt)', 'Latest', 'Free auto-renewing SSL certificates'],
    ['Containerization (optional)', 'Docker + Docker Compose', '24+', 'Easier deployment and isolation'],
    ['Monitoring', 'Prometheus + Grafana', 'Latest', 'System and application metrics'],
    ['Log Management', 'Loki or journald', 'Built-in / latest', 'Centralized log storage'],
    ['Backup', 'pg_dump + rclone', 'Latest', 'Database and file backups'],
    ['Firewall', 'UFW (Uncomplicated Firewall)', 'Built-in Ubuntu', 'Network access control'],
  ];

  return [
    h1('5. Software Stack (Self-Hosted)'),
    hr(),
    spacer(120),
    makeTable(['Component', 'Software', 'Recommended Version', 'Purpose'], rows),
    spacer(200),
  ];
}

function section6() {
  return [
    h1('6. Self-Hosted Installation Guide'),
    hr(),

    h2('6.1 Prepare the Operating System'),
    code('# Update system packages'),
    code('sudo apt update && sudo apt upgrade -y'),
    code(''),
    code('# Install essential tools'),
    code('sudo apt install -y curl wget git vim htop ufw fail2ban'),
    code(''),
    code('# Set timezone to Bangkok'),
    code('sudo timedatectl set-timezone Asia/Bangkok'),
    code(''),
    code('# Create a dedicated user for the application'),
    code('sudo useradd -m -s /bin/bash marinaapp'),
    code('sudo usermod -aG sudo marinaapp'),
    spacer(),

    h2('6.2 Configure Firewall'),
    code('# Allow SSH (important — do this before enabling UFW)'),
    code('sudo ufw allow 22/tcp'),
    code(''),
    code('# Allow HTTP and HTTPS'),
    code('sudo ufw allow 80/tcp'),
    code('sudo ufw allow 443/tcp'),
    code(''),
    code('# Enable firewall'),
    code('sudo ufw enable'),
    code(''),
    code('# Verify status'),
    code('sudo ufw status verbose'),
    spacer(),
    para('Block all other incoming ports. Restrict SSH to known IP addresses if possible:'),
    code('# Allow SSH only from your office IP (replace x.x.x.x)'),
    code('sudo ufw delete allow 22/tcp'),
    code('sudo ufw allow from x.x.x.x to any port 22'),
    spacer(),

    h2('6.3 Install Docker and Docker Compose'),
    code('# Install Docker'),
    code('curl -fsSL https://get.docker.com | sh'),
    code(''),
    code('# Add current user to docker group (avoids needing sudo)'),
    code('sudo usermod -aG docker $USER'),
    code('newgrp docker'),
    code(''),
    code('# Verify installation'),
    code('docker --version'),
    code('docker compose version'),
    spacer(),

    h2('6.4 Install PostgreSQL via Docker'),
    code('# Create a directory for persistent database storage'),
    code('sudo mkdir -p /data/postgres'),
    code('sudo chown 999:999 /data/postgres'),
    code(''),
    code('# Start PostgreSQL 16 container'),
    code('docker run -d \\'),
    code('  --name marina-postgres \\'),
    code('  --restart unless-stopped \\'),
    code('  -e POSTGRES_DB=marina_mms \\'),
    code('  -e POSTGRES_USER=marina_user \\'),
    code('  -e POSTGRES_PASSWORD=YourStrongPassword2026! \\'),
    code('  -p 127.0.0.1:5432:5432 \\'),
    code('  -v /data/postgres:/var/lib/postgresql/data \\'),
    code('  postgres:16'),
    code(''),
    code('# Verify it\'s running'),
    code('docker ps | grep marina-postgres'),
    code(''),
    code('# Test connection'),
    code('docker exec -it marina-postgres psql -U marina_user -d marina_mms -c "SELECT version();"'),
    spacer(),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      shading: { fill: LGREY, type: ShadingType.CLEAR },
      children: [
        new TextRun({ text: 'Note: ', font: 'Arial', size: 22, bold: true, color: TEAL }),
        new TextRun({ text: 'Binding to 127.0.0.1:5432 means PostgreSQL is only accessible locally (not from the internet). This is a critical security measure.', font: 'Arial', size: 22, color: DARK }),
      ],
    }),
    spacer(),

    h2('6.5 Apply Database Schema'),
    code('# Copy migration files to the server'),
    code('cd /opt/marina-mms'),
    code(''),
    code('# Apply migrations using the PostgreSQL client inside the container'),
    code('docker exec -i marina-postgres psql \\'),
    code('  -U marina_user -d marina_mms \\'),
    code('  < database/migrations/001_initial_schema.sql'),
    code(''),
    code('docker exec -i marina-postgres psql \\'),
    code('  -U marina_user -d marina_mms \\'),
    code('  < database/migrations/002_add_rls.sql'),
    code(''),
    code('# Continue for all migration files in order'),
    spacer(),

    h2('6.6 Install Node.js'),
    code('# Install Node.js 20 LTS via NodeSource'),
    code('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -'),
    code('sudo apt install -y nodejs'),
    code(''),
    code('# Verify'),
    code('node --version   # Should show v20.x.x'),
    code('npm --version    # Should show 10.x.x'),
    spacer(),

    h2('6.7 Clone and Configure the Application'),
    code('# Clone the repository'),
    code('sudo mkdir -p /opt/marina-mms'),
    code('sudo chown $USER:$USER /opt/marina-mms'),
    code('git clone https://github.com/lermrover-hub/marina-mms.git /opt/marina-mms'),
    code('cd /opt/marina-mms'),
    code(''),
    code('# Install dependencies'),
    code('npm install'),
    code(''),
    code('# Create environment file'),
    code('cp .env.example .env.local'),
    code(''),
    code('# Edit environment variables for self-hosted setup'),
    code('nano .env.local'),
    spacer(),
    para('Key environment variables for self-hosted deployment (.env.local):'),
    code('# Database — use localhost since PostgreSQL runs on same server'),
    code('DATABASE_URL=postgresql://marina_user:YourStrongPassword2026!@127.0.0.1:5432/marina_mms'),
    code(''),
    code('# Next.js public URL'),
    code('NEXT_PUBLIC_APP_URL=https://marina.yourdomain.com'),
    code(''),
    code('# NextAuth — generate AUTH_SECRET with: openssl rand -base64 32'),
    code('AUTH_SECRET=your_generated_secret_here'),
    code('AUTH_URL=https://marina.yourdomain.com'),
    code('NEXTAUTH_URL=https://marina.yourdomain.com'),
    code('AUTH_TRUST_HOST=1'),
    code(''),
    code('# File storage — local filesystem'),
    code('UPLOAD_DIR=/data/marina-uploads'),
    code(''),
    code('# Email'),
    code('RESEND_API_KEY=re_your_key'),
    code('EMAIL_FROM=Marina MMS <noreply@yourdomain.com>'),
    spacer(),

    h2('6.8 Build the Application'),
    code('cd /opt/marina-mms'),
    code(''),
    code('# Build Next.js for production'),
    code('npm run build'),
    code(''),
    code('# Verify build succeeded'),
    code('ls -la .next/'),
    spacer(),
    para('The build should complete in 2-5 minutes. If it fails, check for TypeScript errors in the output.'),
    spacer(),

    h2('6.9 Run with PM2'),
    para('PM2 keeps the application running continuously and restarts it automatically after server reboots or crashes.'),
    code('# Install PM2 globally'),
    code('sudo npm install -g pm2'),
    code(''),
    code('# Start the application'),
    code('pm2 start npm --name "marina-mms" -- start'),
    code(''),
    code('# Verify it\'s running'),
    code('pm2 status'),
    code('pm2 logs marina-mms --lines 20'),
    code(''),
    code('# Configure PM2 to start on system boot'),
    code('pm2 startup'),
    code('# Run the command that PM2 outputs'),
    code('pm2 save'),
    spacer(),

    h2('6.10 Install and Configure Nginx'),
    para('Nginx acts as a reverse proxy, handling SSL termination and forwarding requests to the Next.js application running on port 3000.'),
    code('sudo apt install -y nginx'),
    code(''),
    code('# Create a new site configuration'),
    code('sudo nano /etc/nginx/sites-available/marina-mms'),
    spacer(),
    para('Nginx configuration block:'),
    code('server {'),
    code('    listen 80;'),
    code('    server_name marina.yourdomain.com;'),
    code('    return 301 https://$server_name$request_uri;'),
    code('}'),
    code(''),
    code('server {'),
    code('    listen 443 ssl http2;'),
    code('    server_name marina.yourdomain.com;'),
    code('    ssl_certificate /etc/letsencrypt/live/marina.yourdomain.com/fullchain.pem;'),
    code('    ssl_certificate_key /etc/letsencrypt/live/marina.yourdomain.com/privkey.pem;'),
    code('    include /etc/letsencrypt/options-ssl-nginx.conf;'),
    code('    client_max_body_size 50M;'),
    code('    location / {'),
    code('        proxy_pass http://127.0.0.1:3000;'),
    code('        proxy_http_version 1.1;'),
    code('        proxy_set_header Host $host;'),
    code('        proxy_set_header X-Real-IP $remote_addr;'),
    code('        proxy_set_header X-Forwarded-Proto $scheme;'),
    code('    }'),
    code('}'),
    code(''),
    code('# Enable the site'),
    code('sudo ln -s /etc/nginx/sites-available/marina-mms /etc/nginx/sites-enabled/'),
    code('sudo nginx -t'),
    code('sudo systemctl reload nginx'),
    spacer(),

    h2('6.11 SSL Certificate with Certbot'),
    code('# Install Certbot'),
    code('sudo apt install -y certbot python3-certbot-nginx'),
    code(''),
    code('# Obtain SSL certificate'),
    code('sudo certbot --nginx -d marina.yourdomain.com'),
    code(''),
    code('# Test automatic renewal'),
    code('sudo certbot renew --dry-run'),
    code(''),
    code('# Verify systemd timer'),
    code('sudo systemctl status certbot.timer'),
    spacer(),
    para('Certificates are valid for 90 days and auto-renew when 30 days remain. No manual action needed.'),
    spacer(200),
  ];
}

function section7() {
  const netRows = [
    ['Type', 'Dedicated fiber preferred', 'Avoid shared/residential connections for business use'],
    ['Speed', 'Minimum 100 Mbps symmetric', 'Higher for larger marinas or many concurrent users'],
    ['Static IP', 'Required', 'Dynamic IP is not compatible with DNS hosting'],
    ['Reliability', 'SLA-backed business line', 'Consumer lines have no uptime guarantee'],
    ['Failover', 'Secondary ISP recommended', 'Critical for uninterrupted operations'],
  ];

  const portRows = [
    ['80', 'TCP', 'Inbound', 'HTTP (auto-redirects to HTTPS)'],
    ['443', 'TCP', 'Inbound', 'HTTPS — main application'],
    ['22', 'TCP', 'Inbound', 'SSH — restrict to admin IPs only'],
  ];

  return [
    h1('7. Network Requirements'),
    hr(),

    h2('Internet Connection'),
    spacer(120),
    makeTable(['Requirement', 'Specification', 'Notes'], netRows),
    spacer(120),
    para('Contact True Business, AIS Business, or NT Internet for business fiber with static IP in Thailand. Pricing typically starts at ฿2,000–฿5,000/month for 100 Mbps with static IP.'),

    h2('Open Ports'),
    para('Configure both your server\'s UFW firewall and your network router/firewall:'),
    spacer(120),
    makeTable(['Port', 'Protocol', 'Direction', 'Purpose'], portRows),
    spacer(120),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      shading: { fill: 'fff3f3', type: ShadingType.CLEAR },
      children: [new TextRun({ text: 'All other inbound ports should be BLOCKED.', font: 'Arial', size: 22, bold: true, color: 'cc0000' })],
    }),

    h2('VPN for Admin Access'),
    para('Rather than exposing SSH port 22 to the internet, consider:'),
    numbered('WireGuard VPN (recommended) — lightweight, modern VPN. Admin connects via VPN, then SSH to internal IP. No port 22 exposed publicly.', 1),
    numbered('Tailscale (easiest) — free for small teams, zero-config mesh VPN. Install on server and admin laptops for secure remote access.', 2),
    spacer(),
    code('# Install Tailscale (easiest option)'),
    code('curl -fsSL https://tailscale.com/install.sh | sh'),
    code('sudo tailscale up'),
    spacer(200),
  ];
}

function section8() {
  const backupRows = [
    ['PostgreSQL database dump', 'Daily', '02:00', '30 days local, 90 days cloud', 'Local + Google Drive'],
    ['File uploads (photos/docs)', 'Daily', '03:00', '90 days', 'Google Drive / OneDrive'],
    ['Full server snapshot', 'Weekly', 'Sunday 04:00', '4 weeks', 'External 4TB drive'],
    ['Application config (.env.local, nginx)', 'On every change', 'Manual', 'Forever', 'Secure password manager / Git private repo'],
    ['Nginx config + SSL', 'Weekly', '—', 'Indefinitely', 'USB drive in safe'],
  ];

  return [
    h1('8. Backup Strategy'),
    hr(),
    spacer(),
    para('Regular backups are essential. Unlike Supabase cloud which provides automatic backups, self-hosted setups require manual backup configuration.'),

    h2('Automated Database Backup Script'),
    para('Create a daily backup cron job:'),
    code('# Create backup directory'),
    code('sudo mkdir -p /data/backups/database'),
    code('sudo chown $USER:$USER /data/backups'),
    code(''),
    code('# Create backup script'),
    code('nano /opt/scripts/backup-database.sh'),
    spacer(),
    code('#!/bin/bash'),
    code('BACKUP_DIR="/data/backups/database"'),
    code('DATE=$(date +%Y-%m-%d)'),
    code('DB_NAME="marina_mms"'),
    code('DB_USER="marina_user"'),
    code('DB_PASSWORD="YourStrongPassword2026!"'),
    code(''),
    code('# Create compressed database dump'),
    code('PGPASSWORD=$DB_PASSWORD pg_dump \\'),
    code('  -h 127.0.0.1 -U $DB_USER $DB_NAME \\'),
    code('  --no-owner --no-acl -F c \\'),
    code('  -f "$BACKUP_DIR/marina-mms-$DATE.dump"'),
    code(''),
    code('# Keep only last 30 days of backups'),
    code('find $BACKUP_DIR -name "*.dump" -mtime +30 -delete'),
    code(''),
    code('echo "Backup completed: marina-mms-$DATE.dump"'),
    spacer(),
    code('chmod +x /opt/scripts/backup-database.sh'),
    code(''),
    code('# Add to crontab (runs daily at 02:00)'),
    code('crontab -e'),
    code('# Add this line:'),
    code('0 2 * * * /opt/scripts/backup-database.sh >> /var/log/marina-backup.log 2>&1'),
    spacer(),

    h2('Offsite Backup with rclone'),
    code('# Install rclone'),
    code('curl https://rclone.org/install.sh | sudo bash'),
    code(''),
    code('# Configure Google Drive (interactive setup)'),
    code('rclone config'),
    code(''),
    code('# Copy backups to Google Drive'),
    code('rclone copy /data/backups/database remote:marina-mms-backups/'),
    spacer(),

    h2('Complete Backup Schedule'),
    spacer(120),
    makeTable(['Backup Type', 'Frequency', 'Time', 'Retention', 'Storage'], backupRows),
    spacer(200),
  ];
}

function section9() {
  return [
    h1('9. System Monitoring (Self-Hosted)'),
    hr(),

    h2('Basic Monitoring with PM2'),
    code('# View real-time status'),
    code('pm2 monit'),
    code(''),
    code('# View logs'),
    code('pm2 logs marina-mms'),
    code(''),
    code('# View resource usage'),
    code('pm2 status'),
    spacer(),

    h2('Prometheus + Grafana (Recommended for Production)'),
    code('# docker-compose.monitoring.yml'),
    code('version: \'3.8\''),
    code('services:'),
    code('  prometheus:'),
    code('    image: prom/prometheus:latest'),
    code('    volumes:'),
    code('      - ./prometheus.yml:/etc/prometheus/prometheus.yml'),
    code('    ports:'),
    code('      - "127.0.0.1:9090:9090"'),
    code('    restart: unless-stopped'),
    code(''),
    code('  grafana:'),
    code('    image: grafana/grafana:latest'),
    code('    ports:'),
    code('      - "127.0.0.1:3001:3000"'),
    code('    environment:'),
    code('      GF_SECURITY_ADMIN_PASSWORD: your_grafana_password'),
    code('    volumes:'),
    code('      - grafana_data:/var/lib/grafana'),
    code('    restart: unless-stopped'),
    code(''),
    code('volumes:'),
    code('  grafana_data:'),
    spacer(),
    para('Access Grafana at http://localhost:3001 (via SSH tunnel for security).'),
    spacer(200),
  ];
}

function section10() {
  const costRows = [
    ['Server hardware', '฿80,000 – ฿150,000', '฿0'],
    ['UPS', '฿8,000 – ฿15,000', '฿0'],
    ['Installation labor', '฿10,000 – ฿20,000', '฿0'],
    ['Business internet (static IP) /month', '฿2,000 – ฿5,000', '฿0 (use existing)'],
    ['Electricity (server 24/7) /month', '฿500 – ฿1,500', '฿0'],
    ['IT maintenance /month', '฿2,000 – ฿4,000', '~0 hrs'],
    ['Vercel hosting /month', '฿0', '฿0 – ฿700'],
    ['Supabase database /month', '฿0', '฿0 – ฿875'],
    ['Total Monthly', '฿4,500 – ฿10,500', '฿0 – ฿1,575'],
    ['5-Year Total Cost', '฿370,000 – ฿780,000', '฿0 – ฿94,500'],
    ['Data sovereignty', 'Full control', 'Data in Singapore/US'],
    ['Maintenance burden', 'High (IT staff required)', 'Very low'],
    ['Recommended for', 'Large marina with strict data requirements', 'Most marinas — best value'],
  ];

  return [
    h1('10. Estimated Costs: Self-Hosted vs Cloud'),
    hr(),
    spacer(),
    para('This comparison helps marina operators make an informed decision between on-premise and cloud deployment.'),
    spacer(120),
    makeTable(['Item', 'Self-Hosted (Medium Marina)', 'Cloud (Vercel + Supabase)'], costRows),
    spacer(120),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      shading: { fill: LGREY, type: ShadingType.CLEAR },
      children: [
        new TextRun({ text: 'Conclusion: ', font: 'Arial', size: 22, bold: true, color: TEAL }),
        new TextRun({ text: 'For the vast majority of marinas, the cloud deployment is the better choice — lower cost, zero maintenance, enterprise-grade reliability, and automatic updates. Self-hosting is justified only when data sovereignty is a strict legal requirement or when the marina is in a location with no reliable internet.', font: 'Arial', size: 22, color: DARK }),
      ],
    }),
    spacer(200),
  ];
}

function section11() {
  return [
    h1('11. Updating the Application (Self-Hosted)'),
    hr(),
    spacer(),
    para('When a new version is released to GitHub, update the self-hosted installation:'),
    code('cd /opt/marina-mms'),
    code(''),
    code('# Pull latest code'),
    code('git pull origin main'),
    code(''),
    code('# Install any new dependencies'),
    code('npm install'),
    code(''),
    code('# Apply any new database migrations'),
    code('docker exec -i marina-postgres psql \\'),
    code('  -U marina_user -d marina_mms \\'),
    code('  < database/migrations/[new_migration].sql'),
    code(''),
    code('# Build the new version'),
    code('npm run build'),
    code(''),
    code('# Restart the application (zero-downtime with PM2 cluster mode)'),
    code('pm2 reload marina-mms'),
    spacer(),
    para('For zero-downtime updates with multiple app servers, use PM2\'s cluster mode:'),
    code('pm2 start npm --name "marina-mms" -i 2 -- start  # Run 2 instances'),
    code('pm2 reload marina-mms  # Rolling restart — no downtime'),
    spacer(240),
    hr(),
    spacer(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'Document prepared for Ocean Rover Marina & Boat Yard Management System',
        font: 'Arial', size: 18, color: GREY, italics: true,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'For cloud deployment, see: 01-server-config-guide.md',
        font: 'Arial', size: 18, color: GREY, italics: true,
      })],
    }),
  ];
}

// ─── Assemble and write ───────────────────────────────────────────────────────

const children = [
  ...titlePage(),
  ...tocPage(),
  ...section1(),
  ...section2(),
  ...section3(),
  ...section4(),
  ...section5(),
  ...section6(),
  ...section7(),
  ...section8(),
  ...section9(),
  ...section10(),
  ...section11(),
];

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22 } },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: 'Marina MMS — Hardware Specification  |  Page ', font: 'Arial', size: 18, color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '888888' }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('C:\\marina-mms\\docs\\02-hardware-spec.docx', buf);
  const kb = (buf.length / 1024).toFixed(1);
  console.log(`02-hardware-spec.docx created — ${kb} KB`);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
