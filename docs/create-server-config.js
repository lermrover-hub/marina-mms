'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  Footer, PageNumber, PageBreak,
  TableBorders, convertInchesToTwip,
} = require('docx');
const fs = require('fs');

// ─── Colour palette ───────────────────────────────────────────────────────────
const TEAL  = '13988f';
const DARK  = '1f2933';
const GREY  = '647076';
const LGREY = 'f3f4f6';
const WHITE = 'ffffff';
const THEAD = '1a6b67'; // darker teal for table headers

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normal paragraph, optionally override run options */
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

/** Paragraph with mixed runs (array of TextRun objects) */
function mixedPara(runs, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    ...opts,
    children: runs,
  });
}

/** Blank spacer line */
function spacer(before = 60, after = 60) {
  return new Paragraph({ spacing: { before, after }, children: [] });
}

/** Heading 1 (## in markdown) */
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: TEAL })],
  });
}

/** Heading 2 (### in markdown) */
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: DARK })],
  });
}

/** Heading 3 (#### in markdown) */
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

/** Code block line — Courier New on grey background */
function code(text) {
  return new Paragraph({
    spacing: { before: 30, after: 30 },
    indent: { left: 360, right: 360 },
    shading: { fill: LGREY, type: ShadingType.CLEAR, color: LGREY },
    children: [new TextRun({ text, font: 'Courier New', size: 18, color: DARK })],
  });
}

/** Horizontal rule */
function hr() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { color: TEAL, size: 6, space: 1, style: BorderStyle.SINGLE } },
    children: [],
  });
}

/** Note / callout box */
function note(label, text, fillColor = LGREY, labelColor = TEAL) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { fill: fillColor, type: ShadingType.CLEAR, color: fillColor },
    children: [
      new TextRun({ text: label, font: 'Arial', size: 22, bold: true, color: labelColor }),
      new TextRun({ text, font: 'Arial', size: 22, color: DARK }),
    ],
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
        children: [new TextRun({ text: String(text), font: 'Arial', size: 19, color: DARK })],
      })],
    });
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 0, right: 0 },
    borders: {
      top:     { style: BorderStyle.SINGLE, size: 4, color: TEAL },
      bottom:  { style: BorderStyle.SINGLE, size: 4, color: TEAL },
      left:    { style: BorderStyle.SINGLE, size: 4, color: TEAL },
      right:   { style: BorderStyle.SINGLE, size: 4, color: TEAL },
      insideH: { style: BorderStyle.SINGLE, size: 2, color: 'cccccc' },
      insideV: { style: BorderStyle.SINGLE, size: 2, color: 'cccccc' },
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

// ─── Title page ───────────────────────────────────────────────────────────────

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
        text: 'Server Configuration Guide',
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
        text: 'Version 1.0  |  May 2026',
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

// ─── Table of Contents ────────────────────────────────────────────────────────

function tocPage() {
  const entries = [
    ['1',  'Overview'],
    ['2',  'Prerequisites'],
    ['3',  'Supabase Setup'],
    ['4',  'Vercel Deployment'],
    ['5',  'Custom Domain Setup'],
    ['6',  'Vercel Cron Jobs'],
    ['7',  'Email Setup (Resend)'],
    ['8',  'Monitoring and Alerts'],
    ['9',  'Database Backup'],
    ['10', 'Security Hardening'],
    ['11', 'CI/CD Pipeline'],
    ['12', 'Troubleshooting'],
    ['13', 'Self-Hosting Alternative'],
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

// ─── Section 1 — Overview ─────────────────────────────────────────────────────

function section1() {
  return [
    h1('1. Overview'),
    hr(),
    spacer(),
    para('Marina MMS is deployed as a modern cloud-native application using three primary services: Vercel for application hosting and serverless functions, Supabase for the PostgreSQL database and file storage, and GitHub for source control and CI/CD automation.'),
    spacer(),
    h2('Architecture Diagram'),
    spacer(60),
    code('┌─────────────────────────────────────────────────────────────────┐'),
    code('│                        INTERNET / USERS                         │'),
    code('└────────────────────────────┬────────────────────────────────────┘'),
    code('                             │ HTTPS'),
    code('                             ▼'),
    code('┌─────────────────────────────────────────────────────────────────┐'),
    code('│                         VERCEL EDGE                             │'),
    code('│  ┌─────────────────────────────────────────────────────────┐   │'),
    code('│  │              Next.js 15.5 Application                   │   │'),
    code('│  │   App Router  |  API Routes  |  Cron Jobs (billing)     │   │'),
    code('│  │              NextAuth v5 (JWT)                          │   │'),
    code('│  └─────────────────────────────────────────────────────────┘   │'),
    code('└─────────────────────────────────────────────────────────────────┘'),
    code('                              │ HTTPS / REST / Realtime'),
    code('                              ▼'),
    code('┌─────────────────────────────────────────────────────────────────┐'),
    code('│                        SUPABASE CLOUD                           │'),
    code('│  PostgreSQL 16 (mms_* tables, RLS enabled)                      │'),
    code('│  Storage Buckets: marina-photos, marina-docs                     │'),
    code('│  Auth Service (optional)                                         │'),
    code('└─────────────────────────────────────────────────────────────────┘'),
    code('                              ↑ git push'),
    code('┌─────────────────────────────────────────────────────────────────┐'),
    code('│                         GITHUB                                  │'),
    code('│   Repository: lermrover-hub/marina-mms                          │'),
    code('│   main branch → auto-deploy to Vercel Production               │'),
    code('│   PR branches → Vercel Preview deployments                      │'),
    code('└─────────────────────────────────────────────────────────────────┘'),
    spacer(120),
    para('This architecture provides high availability, automatic scaling, zero-maintenance infrastructure, and a generous free tier suitable for most marina deployments. All components are managed services — no server administration is required.'),
    spacer(200),
  ];
}

// ─── Section 2 — Prerequisites ────────────────────────────────────────────────

function section2() {
  return [
    h1('2. Prerequisites'),
    hr(),
    spacer(),
    para('Before setting up the system, ensure the following accounts and tools are available:'),
    spacer(60),
    bullet('GitHub account — for source code hosting and CI/CD. Create at github.com if needed. The repository is already available at lermrover-hub/marina-mms.'),
    bullet('Vercel account — for application hosting. Register at vercel.com using your GitHub account for easiest setup. The Hobby (free) plan supports most marina operations; Pro plan ($20/month) adds team collaboration and higher limits.'),
    bullet('Supabase account — for PostgreSQL database and file storage. Register at supabase.com. The Free plan includes 500 MB database and 1 GB file storage, suitable for initial deployment.'),
    bullet('Node.js 20 LTS or later — required only for local development. Download from nodejs.org. Not needed for cloud-only deployment.'),
    bullet('Domain name (optional but recommended) — a custom domain such as marina.yourdomain.com provides a professional URL. Can be purchased from GoDaddy, Namecheap, Cloudflare, or similar registrars for approximately $10-15/year.'),
    bullet('Resend account (optional) — for sending automated emails such as invoice notifications and quote approvals. Register at resend.com. Free tier allows 3,000 emails/month.'),
    spacer(200),
  ];
}

// ─── Section 3 — Supabase Setup ───────────────────────────────────────────────

function section3() {
  const coreTablesList = [
    'mms_customers, mms_boats, mms_berths, mms_storage_slots',
    'mms_service_requests, mms_work_orders, mms_job_tasks',
    'mms_quotations, mms_invoices, mms_payments, mms_receipts',
    'mms_boat_movements, mms_ramp_bookings, mms_tide_records',
    'mms_inventory_items, mms_stock_movements',
    'mms_users, mms_roles, mms_audit_logs',
  ];

  return [
    h1('3. Supabase Setup'),
    hr(),

    h2('3.1 Create Project'),
    numbered('Log in to supabase.com and click New Project.', 1),
    numbered('Select your organization (or create one for your marina).', 2),
    numbered('Fill in the project details:', 3),
    bullet('Name: marina-mms'),
    bullet('Database Password: Choose a strong password with uppercase, lowercase, numbers, and symbols. Minimum 20 characters. Example: MarinaOcean2026!Secure#DB. Write this down and store it securely — it cannot be recovered.'),
    bullet('Region: Southeast Asia (Singapore) — ap-southeast-1 — this is the closest region to Ko Samui and will give the best performance for Thai-based operations.'),
    numbered('Click Create new project and wait 2-3 minutes for provisioning.', 4),
    spacer(),

    h2('3.2 Get API Keys'),
    numbered('In your Supabase project dashboard, go to Project Settings (gear icon in left sidebar) → API.', 1),
    numbered('Under Project URL, copy the URL. It will look like: https://csltloqbjupxqwbkunsd.supabase.co', 2),
    numbered('Under Project API Keys, copy:', 3),
    bullet('anon public key — starts with eyJ.... This is safe to expose in frontend code.'),
    bullet('service_role key — starts with eyJ.... This has full database access. NEVER expose this in frontend code or commit it to Git. It is used only in server-side API routes.'),
    numbered('Store these keys in a secure password manager. You will need them for the Vercel environment variables in Section 4.2.', 4),
    spacer(),
    note('Security note: ', 'The service_role key bypasses all Row Level Security policies. If it is ever accidentally exposed, immediately regenerate it from Project Settings → API → Rotate keys.', 'fff8e1', 'cc7700'),
    spacer(),

    h2('3.3 Database Tables'),
    para('The Marina MMS database schema is maintained as migration files in the repository under /database/migrations/. To apply the schema:'),
    numbered('In Supabase Dashboard, click SQL Editor in the left sidebar.', 1),
    numbered('Click New query.', 2),
    numbered('Open each migration file from the repository in order (e.g., 001_initial_schema.sql, 002_add_rls.sql).', 3),
    numbered('Copy the file contents and paste into the SQL Editor.', 4),
    numbered('Click Run (or press Ctrl+Enter).', 5),
    numbered('Verify success: no red error messages should appear.', 6),
    numbered('Repeat for each migration file in numerical order.', 7),
    spacer(),
    para('All tables use the prefix mms_ to avoid conflicts with Supabase system tables. Core tables include:'),
    ...coreTablesList.map(t => bullet(t)),
    spacer(),
    para('Enable Row Level Security (RLS): After running migrations, verify RLS is enabled:'),
    code('-- Check RLS status for all mms_ tables'),
    code('SELECT tablename, rowsecurity'),
    code('FROM pg_tables'),
    code("WHERE schemaname = 'public' AND tablename LIKE 'mms_%';"),
    spacer(60),
    para('All tables should show rowsecurity = true. If any show false, run:'),
    code('ALTER TABLE mms_tablename ENABLE ROW LEVEL SECURITY;'),
    spacer(),

    h2('3.4 Storage Setup'),
    para('Supabase Storage is used for file uploads including work order photos, boat documents, insurance certificates, and payment slips.'),
    numbered('In Supabase Dashboard, click Storage in the left sidebar.', 1),
    numbered('Click Create a new bucket.', 2),
    numbered('Create the following buckets:', 3),
    spacer(60),
    h3('Bucket 1: marina-documents'),
    bullet('Name: marina-documents'),
    bullet('Public: No (private — access controlled by signed URLs)'),
    bullet('Used for: contracts, insurance documents, boat registration papers, quotations, invoices'),
    spacer(60),
    h3('Bucket 2: marina-photos'),
    bullet('Name: marina-photos'),
    bullet('Public: No (private — access controlled)'),
    bullet('Used for: work order before/after photos, boat condition photos, completion evidence, ramp operation photos'),
    spacer(60),
    numbered('Set storage policies to allow authenticated users to upload to their own folders:', 4),
    code('-- Allow authenticated users to upload files'),
    code("CREATE POLICY \"Users can upload files\""),
    code('ON storage.objects FOR INSERT'),
    code('TO authenticated'),
    code("WITH CHECK (bucket_id IN ('marina-documents', 'marina-photos'));"),
    code(''),
    code('-- Allow authenticated users to view files'),
    code("CREATE POLICY \"Users can view files\""),
    code('ON storage.objects FOR SELECT'),
    code('TO authenticated'),
    code("USING (bucket_id IN ('marina-documents', 'marina-photos'));"),
    spacer(200),
  ];
}

// ─── Section 4 — Vercel Deployment ───────────────────────────────────────────

function section4() {
  const envRows = [
    ['NEXT_PUBLIC_SUPABASE_URL', 'https://csltloqbjupxqwbkunsd.supabase.co', 'Supabase project URL from Project Settings → API', 'Yes'],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIs...', 'Supabase anon/public key — safe for frontend', 'Yes'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIs...', 'Supabase service_role key — server-side only', 'Yes'],
    ['AUTH_SECRET', 'k9Xm2pQr7nYjL4vBsT8wUcA3dFhE6iOZ', 'Random 32+ character string for NextAuth JWT signing', 'Yes'],
    ['AUTH_URL', 'https://marina-mms.vercel.app', 'Full production URL (no trailing slash)', 'Yes'],
    ['NEXTAUTH_URL', 'https://marina-mms.vercel.app', 'Same as AUTH_URL — required for NextAuth compatibility', 'Yes'],
    ['AUTH_TRUST_HOST', '1', "Must be set to '1' when deployed behind Vercel's proxy", 'Yes'],
    ['RESEND_API_KEY', 're_AbCdEfGhIjKlMn...', 'Resend API key for sending emails', 'No (disables email)'],
    ['EMAIL_FROM', 'Marina MMS <noreply@yourdomain.com>', 'Sender name and email for outgoing messages', 'No'],
    ['EMAIL_TEST_TO', 'admin@yourmarina.com', 'Email address for test delivery verification', 'No'],
  ];

  return [
    h1('4. Vercel Deployment'),
    hr(),

    h2('4.1 Connect GitHub Repository'),
    numbered('Log in to vercel.com.', 1),
    numbered('Click Add New → Project.', 2),
    numbered('Under Import Git Repository, click Continue with GitHub.', 3),
    numbered('Authorize Vercel to access your GitHub account.', 4),
    numbered('Find and select the repository: lermrover-hub/marina-mms.', 5),
    numbered('Click Import.', 6),
    numbered('Vercel will auto-detect Next.js as the framework — no changes needed.', 7),
    numbered('Do NOT click Deploy yet — first set up environment variables in the next step.', 8),
    spacer(),

    h2('4.2 Environment Variables'),
    para('Before deploying, configure all required environment variables. In the Vercel project setup screen, click Environment Variables and add each of the following:'),
    spacer(120),
    makeTable(['Variable', 'Example Value', 'Description', 'Required'], envRows),
    spacer(120),
    note('Environment scope: ', "Set all variables to apply to Production, Preview, and Development environments unless otherwise noted. AUTH_URL and NEXTAUTH_URL should be set to different values for Production vs Preview if you use different domains.", LGREY, TEAL),
    spacer(60),
    note('Sensitive variables: ', 'Mark SUPABASE_SERVICE_ROLE_KEY, AUTH_SECRET, and RESEND_API_KEY as sensitive in Vercel — this hides them from the dashboard after saving.', 'fff8e1', 'cc7700'),
    spacer(),

    h2('4.3 Generate AUTH_SECRET'),
    para('The AUTH_SECRET must be a cryptographically random string of at least 32 characters. Use one of these methods:'),
    spacer(60),
    h3('Method 1 — OpenSSL (Linux/Mac/WSL):'),
    code('openssl rand -base64 32'),
    spacer(60),
    h3('Method 2 — Node.js (any platform):'),
    code("node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""),
    spacer(60),
    h3('Method 3 — PowerShell (Windows):'),
    code('[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))'),
    spacer(60),
    h3('Method 4 — Online (for convenience only, not recommended for production):'),
    code('https://generate-secret.vercel.app/32'),
    spacer(),
    para('Copy the output and paste it as the value for AUTH_SECRET. Do not use a simple password or guessable string — this secret protects all user sessions.'),
    spacer(),

    h2('4.4 Deploy'),
    numbered('After setting all environment variables, click Deploy.', 1),
    numbered('Vercel will build the Next.js application. This typically takes 2-4 minutes.', 2),
    numbered('Watch the build log for errors. Common issues:', 3),
    bullet('Missing environment variables — check all required vars are set'),
    bullet('TypeScript errors — check the build output for "Type error:" messages'),
    bullet('Module not found — ensure npm install completed in the build'),
    numbered('On successful deployment, you will see a green checkmark and a URL like https://marina-mms.vercel.app.', 4),
    numbered('Verify the deployment:', 5),
    bullet('Open the URL in a browser — the login page should appear'),
    bullet('Try logging in with admin credentials'),
    bullet('Navigate to Dashboard — KPI cards should load'),
    bullet('Check Customers and Boats pages load correctly'),
    spacer(200),
  ];
}

// ─── Section 5 — Custom Domain ────────────────────────────────────────────────

function section5() {
  return [
    h1('5. Custom Domain Setup'),
    hr(),
    spacer(),
    para('A custom domain provides a professional URL for your marina staff and customers, such as marina.oceanrover.com or mms.yourmarina.com.'),
    spacer(),

    h2('On Vercel'),
    numbered('Go to your Vercel project → Settings → Domains.', 1),
    numbered('Click Add Domain.', 2),
    numbered('Enter your desired domain, e.g., marina.yourmarina.com.', 3),
    numbered('Vercel will display a CNAME record to add to your DNS provider. Note the values shown:', 4),
    bullet('Type: CNAME'),
    bullet('Name: marina'),
    bullet('Value: cname.vercel-dns.com'),
    spacer(),

    h2('On Your DNS Provider'),
    para('Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and navigate to DNS settings for your domain.'),
    spacer(60),
    h3('Cloudflare:'),
    numbered('DNS → Records → Add Record', 1),
    numbered('Type: CNAME, Name: marina, Target: cname.vercel-dns.com, Proxy: DNS only (grey cloud, NOT orange/proxied)', 2),
    numbered('Save', 3),
    spacer(60),
    h3('GoDaddy:'),
    numbered('My Products → Your Domain → DNS → Add', 1),
    numbered('Type: CNAME, Host: marina, Points to: cname.vercel-dns.com, TTL: 3600', 2),
    numbered('Save Changes', 3),
    spacer(60),
    h3('Namecheap:'),
    numbered('Domain List → Manage → Advanced DNS → Add New Record', 1),
    numbered('Type: CNAME Record, Host: marina, Value: cname.vercel-dns.com, TTL: Automatic', 2),
    numbered('Save All Changes', 3),
    spacer(),
    para('DNS propagation typically takes 5-60 minutes. You can monitor it at dnschecker.org.'),
    spacer(),

    h2('Update Environment Variables'),
    para('After DNS propagates, update the following Vercel environment variables to use your custom domain:'),
    bullet('AUTH_URL → https://marina.yourmarina.com'),
    bullet('NEXTAUTH_URL → https://marina.yourmarina.com'),
    spacer(),
    para('Redeploy the application for changes to take effect (or Vercel may auto-redeploy on env var change).'),
    spacer(),

    h2('SSL Certificate'),
    para('Vercel automatically provisions a free Let\'s Encrypt SSL certificate for all connected domains. This happens within minutes of DNS propagation — no manual steps are needed. Verify by checking that your domain shows a padlock icon (https://) in the browser. The certificate auto-renews every 90 days without any action required.'),
    spacer(200),
  ];
}

// ─── Section 6 — Cron Jobs ────────────────────────────────────────────────────

function section6() {
  const cronRows = [
    ['Recurring Billing', '0 8 1 * *', 'Runs on the 1st of every month at 08:00 UTC (15:00 Bangkok time) — auto-generates monthly invoices for berth and storage contracts'],
    ['Insurance Expiry Alerts', '0 9 * * *', 'Daily at 09:00 UTC — checks for insurance documents expiring within 30/60/90 days and sends alerts'],
    ['Contract Renewal Alerts', '0 9 15 * *', '15th of each month — checks for contracts expiring within 30/60 days'],
  ];

  return [
    h1('6. Vercel Cron Jobs'),
    hr(),
    spacer(),
    para('Marina MMS uses Vercel Cron Jobs for automated background tasks. These are already configured in the vercel.json file in the repository root.'),
    spacer(120),
    makeTable(['Job', 'Schedule', 'Description'], cronRows),
    spacer(120),
    para('To verify cron jobs are active:'),
    numbered('Vercel Dashboard → your project → Cron Jobs tab', 1),
    numbered('All configured jobs should appear with their schedule and last execution time', 2),
    numbered('You can manually trigger a cron job by clicking Run Now for testing', 3),
    spacer(),
    note('Security: ', 'Cron endpoint API routes are protected by verifying the x-vercel-cron: 1 header, which is only set by Vercel\'s cron system. Direct external calls to these endpoints are rejected.', LGREY, TEAL),
    spacer(200),
  ];
}

// ─── Section 7 — Email Setup ──────────────────────────────────────────────────

function section7() {
  return [
    h1('7. Email Setup (Resend)'),
    hr(),
    spacer(),
    para('Automated email is used for sending quotations, invoice notifications, payment receipts, and expiry alerts to customers.'),
    spacer(),

    h2('Setup Steps'),
    numbered('Go to resend.com and create a free account.', 1),
    numbered('Navigate to Domains → Add Domain.', 2),
    numbered('Enter your marina\'s email domain (e.g., yourmarina.com).', 3),
    numbered('Resend will provide DNS records to add (SPF, DKIM, DMARC). Add these to your DNS provider:', 4),
    bullet('SPF TXT record: v=spf1 include:_spf.resend.com ~all'),
    bullet('DKIM CNAME records (3 records provided by Resend)'),
    bullet('DMARC TXT record: v=DMARC1; p=none; rua=mailto:admin@yourmarina.com'),
    numbered('Wait for DNS verification (usually 5-30 minutes). Resend Dashboard will show "Verified" when complete.', 5),
    numbered('Go to API Keys → Create API Key.', 6),
    bullet('Name: marina-mms-production'),
    bullet('Permission: Sending access'),
    bullet('Domain: Select your verified domain'),
    numbered('Copy the API key starting with re_.... You will only see it once.', 7),
    numbered('In Vercel Dashboard → your project → Settings → Environment Variables:', 8),
    code('RESEND_API_KEY = re_your_api_key'),
    code('EMAIL_FROM = Marina MMS <noreply@yourmarina.com>'),
    numbered('Redeploy the application.', 9),
    spacer(),

    h2('Test Email Sending'),
    numbered('Log in to Marina MMS as Super Admin.', 1),
    numbered('Navigate to Settings → Email Settings → Send Test Email.', 2),
    numbered('A test email should arrive at the EMAIL_TEST_TO address within 1-2 minutes.', 3),
    numbered('If not received, check: Vercel function logs for errors, Resend dashboard for sent/failed status, spam folder.', 4),
    spacer(200),
  ];
}

// ─── Section 8 — Monitoring ───────────────────────────────────────────────────

function section8() {
  const alertRows = [
    ['Response time', '> 3 seconds', '> 8 seconds', 'Check DB queries, function timeouts'],
    ['Error rate', '> 1%', '> 5%', 'Check function logs, Sentry'],
    ['Uptime', '< 99.9%', '< 99%', 'Check Vercel/Supabase status pages'],
    ['DB size', '> 400 MB', '> 480 MB', 'Upgrade Supabase plan'],
  ];

  return [
    h1('8. Monitoring and Alerts'),
    hr(),

    h2('Vercel Analytics'),
    para('Enable built-in performance monitoring:'),
    numbered('Vercel Dashboard → your project → Analytics tab.', 1),
    numbered('Click Enable Analytics.', 2),
    numbered('Provides: page load times, Core Web Vitals, traffic overview, error rates.', 3),
    numbered('No code changes needed — analytics are injected automatically.', 4),
    spacer(),

    h2('Uptime Monitoring (Free Options)'),
    para('Set up external uptime checks to be alerted if the system goes down:'),
    spacer(60),
    h3('UptimeRobot (Recommended — Free tier: 50 monitors, 5-minute checks):'),
    numbered('Register at uptimerobot.com', 1),
    numbered('New Monitor → HTTP(s)', 2),
    numbered('URL: https://marina-mms.vercel.app', 3),
    numbered('Check interval: 5 minutes', 4),
    numbered('Alert contacts: add admin email (admin@yourmarina.com)', 5),
    numbered('Optionally add Telegram or Slack notifications', 6),
    spacer(60),
    h3('BetterStack (Free tier: 10 monitors, 3-minute checks):'),
    numbered('Register at betterstack.com', 1),
    numbered('Uptime → New Monitor', 2),
    numbered('Similar setup to UptimeRobot with nicer dashboard', 3),
    spacer(),
    para('Consider creating a public status page at status.yourmarina.com using BetterStack\'s free status page feature — this lets you communicate outages to customers professionally.'),
    spacer(),

    h2('Error Monitoring'),
    h3('Vercel Function Logs (Built-in):'),
    numbered('Vercel Dashboard → your project → Deployments → select latest deployment', 1),
    numbered('Click Functions tab to see real-time serverless function logs', 2),
    numbered('Click Runtime Logs for live streaming', 3),
    spacer(60),
    h3('Sentry (Optional — recommended for production):'),
    numbered('Register at sentry.io (free tier: 5,000 errors/month)', 1),
    numbered('Create new project → Next.js', 2),
    numbered('Follow Sentry\'s Next.js setup guide to add the SDK', 3),
    numbered('Errors will appear in Sentry dashboard with stack traces and user context', 4),
    spacer(),

    h2('Recommended Alert Thresholds'),
    spacer(120),
    makeTable(['Metric', 'Warning', 'Critical', 'Action'], alertRows),
    spacer(200),
  ];
}

// ─── Section 9 — Database Backup ─────────────────────────────────────────────

function section9() {
  const backupRows = [
    ['Automatic (Supabase)', 'Daily', 'Supabase built-in', 'Supabase cloud'],
    ['Manual SQL export', 'Weekly', 'pg_dump or SQL Editor', 'Google Drive / OneDrive'],
    ['Critical tables export', 'Monthly', 'CSV via SQL Editor', 'External hard drive'],
    ['File storage backup', 'Monthly', 'Supabase Storage download', 'External hard drive'],
  ];

  return [
    h1('9. Database Backup'),
    hr(),

    h2('Supabase Automatic Backups'),
    para('Supabase provides automated daily backups:'),
    bullet('Free plan: 7 days of point-in-time recovery'),
    bullet('Pro plan ($25/month): 30 days of point-in-time recovery with daily snapshots'),
    spacer(),
    para('To restore from backup:'),
    numbered('Supabase Dashboard → Database → Backups', 1),
    numbered('Select a backup date', 2),
    numbered('Click Restore (this will restore to a new project — you then update env vars)', 3),
    spacer(),

    h2('Manual SQL Export'),
    para('For additional safety, export your data manually on a regular schedule:'),
    code('-- Run in Supabase SQL Editor to export as CSV'),
    code('COPY (SELECT * FROM mms_customers) TO STDOUT WITH CSV HEADER;'),
    code('COPY (SELECT * FROM mms_boats) TO STDOUT WITH CSV HEADER;'),
    code('COPY (SELECT * FROM mms_invoices) TO STDOUT WITH CSV HEADER;'),
    code('-- Repeat for each critical table'),
    spacer(),
    para('Or using pg_dump from a machine with PostgreSQL client tools:'),
    code('# Get connection string from: Supabase → Settings → Database → Connection string (URI)'),
    code('pg_dump "postgresql://postgres:[password]@db.csltloqbjupxqwbkunsd.supabase.co:5432/postgres" \\'),
    code('  --no-owner --no-acl -F c \\'),
    code('  -f backup-marina-mms-$(date +%Y-%m-%d).dump'),
    spacer(),

    h2('Recommended Backup Schedule'),
    spacer(120),
    makeTable(['Backup Type', 'Frequency', 'Method', 'Storage Location'], backupRows),
    spacer(120),
    note('3-2-1 Rule: ', 'Store backups in at least two separate locations following the 3-2-1 rule: 3 copies, 2 different media, 1 off-site.', LGREY, TEAL),
    spacer(200),
  ];
}

// ─── Section 10 — Security Hardening ─────────────────────────────────────────

function section10() {
  return [
    h1('10. Security Hardening'),
    hr(),

    h2('Environment Variable Security'),
    bullet('Never commit .env.local to Git. This file is already in .gitignore but double-check: git status should not show .env.local.'),
    bullet('Rotate AUTH_SECRET every 6 months. Generate a new secret, update it in Vercel, and redeploy. Users will be logged out and need to log in again — schedule this during off-peak hours.'),
    bullet('Rotate SUPABASE_SERVICE_ROLE_KEY if it is ever accidentally exposed. Go to Supabase → Project Settings → API → Regenerate key.'),
    bullet('Use a strong Supabase database password. Minimum 20 characters with mixed case, numbers, and symbols.'),
    bullet('Never share API keys via email, Slack, or messaging apps — use a password manager or secure vault.'),
    spacer(),

    h2('Supabase Row Level Security'),
    para('RLS ensures database-level access control so even if the application code has a bug, users cannot access other users\' data.'),
    spacer(),
    para('Key RLS policies to verify:'),
    code('-- Customers can only see their own data'),
    code('CREATE POLICY "customer_own_data" ON mms_invoices'),
    code('  FOR ALL TO authenticated'),
    code('  USING (customer_id = (SELECT customer_id FROM mms_users WHERE id = auth.uid()));'),
    code(''),
    code('-- Staff can see all data (their role is checked in app layer)'),
    code('CREATE POLICY "staff_full_access" ON mms_invoices'),
    code('  FOR ALL TO authenticated'),
    code("  USING (EXISTS (SELECT 1 FROM mms_users WHERE id = auth.uid() AND role IN ('admin','manager','finance')));"),
    spacer(),
    para('Test RLS by:'),
    numbered('Creating a test customer account', 1),
    numbered('Logging in as that customer', 2),
    numbered('Attempting to access /api/customers — should only return the customer\'s own record', 3),
    numbered('Attempting to access /api/invoices/[other-customer-invoice-id] — should return 403 Forbidden', 4),
    spacer(),

    h2('Vercel Security Settings'),
    bullet('DDoS Protection: Automatically provided by Vercel\'s edge network — no configuration needed.'),
    bullet('Password Protection for Staging: In Vercel → Project → Settings → Deployment Protection, add password protection to Preview deployments so staging URLs are not publicly accessible.'),
    bullet('Vercel Firewall (Pro): Upgrade to Vercel Pro to use the WAF (Web Application Firewall) for advanced threat protection.'),
    spacer(),

    h2('API Security'),
    bullet('All admin API routes validate the session role server-side using auth() from NextAuth'),
    bullet('Cron endpoints check for the x-vercel-cron: 1 header'),
    bullet('Customer portal API routes filter all queries by the authenticated user\'s customer_id'),
    bullet('Rate limiting is applied to auth endpoints to prevent brute force attacks'),
    bullet('File upload endpoints validate file types and sizes before accepting uploads'),
    spacer(200),
  ];
}

// ─── Section 11 — CI/CD Pipeline ─────────────────────────────────────────────

function section11() {
  const branchRows = [
    ['main', 'Production', 'https://marina-mms.vercel.app'],
    ['develop', 'Preview', 'https://marina-mms-git-develop-[team].vercel.app'],
    ['feature/*', 'Preview', 'https://marina-mms-git-feature-[team].vercel.app'],
    ['Pull Requests', 'Preview', 'Unique URL per PR, posted as GitHub comment'],
  ];

  return [
    h1('11. CI/CD Pipeline'),
    hr(),
    spacer(),
    para('Marina MMS uses a fully automated deployment pipeline:'),
    spacer(),

    h2('How It Works'),
    code('Developer writes code'),
    code('    ↓'),
    code('git push to GitHub'),
    code('    ↓'),
    code('Vercel webhook triggered (within seconds)'),
    code('    ↓'),
    code('Vercel pulls latest code'),
    code('    ↓'),
    code('npm install → npm run build (TypeScript compile, Next.js build)'),
    code('    ↓'),
    code('Build passes? → Deploy to production (main branch)'),
    code('            → Deploy to preview URL (other branches/PRs)'),
    code('Build fails?  → Deployment blocked, email notification sent'),
    spacer(),

    h2('Branch Strategy'),
    spacer(120),
    makeTable(['Branch', 'Deployment', 'URL'], branchRows),
    spacer(),

    h2('Rollback'),
    para('If a deployment causes issues:'),
    numbered('Vercel Dashboard → your project → Deployments tab', 1),
    numbered('Find the last known-good deployment', 2),
    numbered('Click the three-dot menu → Promote to Production', 3),
    numbered('The previous version is live within 30 seconds', 4),
    spacer(),

    h2('Zero-Downtime Deployments'),
    para('Vercel performs blue-green deployments — the new version is fully built before traffic is switched. There is no downtime during normal deployments. Database migrations, however, should be backward-compatible (add columns before removing old ones) to avoid errors during the switchover period.'),
    spacer(200),
  ];
}

// ─── Section 12 — Troubleshooting ────────────────────────────────────────────

function section12() {
  const troubleRows = [
    ['Login not working', '"Configuration error" or redirect loop', 'Check AUTH_URL, NEXTAUTH_URL, and AUTH_TRUST_HOST=1 are set correctly in Vercel'],
    ['500 Internal Server Error', 'Blank page or error page', 'Open Vercel Dashboard → Deployments → Functions → check error logs for stack trace'],
    ['Cannot connect to database', '"relation does not exist" or connection timeout', 'Verify NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct; check Supabase project is not paused (free projects pause after 7 days of inactivity)'],
    ['Email not sending', 'Quotations/invoices not received by customers', 'Verify RESEND_API_KEY is correct; check Resend dashboard for delivery status; verify domain DNS records are set'],
    ['Middleware/auth error', '"AUTH_SECRET is not set" in logs', 'Ensure AUTH_SECRET is set in Vercel env vars without invisible characters (copy-paste from a plain text source)'],
    ['Supabase project paused', '"Project is paused" error', 'Log in to supabase.com, click on the project, click Restore project (takes 1-2 minutes)'],
    ['File upload failing', 'Photos or documents not saving', 'Check Supabase Storage buckets exist with correct names; verify storage RLS policies; check file size limits (50 MB default)'],
    ['Cron jobs not running', 'Recurring billing not generating', 'Check vercel.json is present and correctly formatted; verify in Vercel Dashboard → Cron Jobs tab; check cron endpoint logs'],
    ['Build failing after code change', 'Red X on GitHub commit', 'Click the failing check → View build log; fix TypeScript/ESLint errors shown; do not skip the type check'],
    ['Slow page loads', 'Pages taking > 5 seconds', 'Check Supabase query performance in Dashboard → Database → Query Performance; add database indexes as needed'],
  ];

  return [
    h1('12. Troubleshooting'),
    hr(),
    spacer(120),
    makeTable(['Problem', 'Symptoms', 'Solution'], troubleRows),
    spacer(120),

    h2('Supabase Free Tier Limitations'),
    para('If your project is on the Supabase free tier, be aware of these limits:'),
    bullet('Database pauses after 7 days of inactivity — set up UptimeRobot to ping the app daily to prevent this'),
    bullet('500 MB database storage — upgrade to Pro ($25/month) when approaching this limit'),
    bullet('1 GB file storage — marina photo uploads can accumulate quickly; monitor usage and upgrade as needed'),
    bullet('50,000 monthly active users — more than sufficient for marina operations'),
    bullet('2 GB bandwidth/month — sufficient for most marinas; monitor in Supabase Dashboard → Settings → Usage'),
    spacer(200),
  ];
}

// ─── Section 13 — Self-Hosting Alternative ───────────────────────────────────

function section13() {
  return [
    h1('13. Self-Hosting Alternative'),
    hr(),
    spacer(),
    para('For marinas that prefer on-premise hosting due to data privacy requirements, unreliable internet, or regulatory compliance, see the companion document:'),
    spacer(),
    note('See: ', '02-hardware-spec.md — Complete on-premise server hardware specification and installation guide', LGREY, TEAL),
    spacer(),
    para('Self-hosting provides full data control but requires ongoing server maintenance, backup management, security patching, and local IT expertise. The cloud deployment (Vercel + Supabase) is recommended for most marinas as it eliminates infrastructure overhead and provides enterprise-grade reliability at low cost.'),
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
        text: 'Technical support: See GitHub repository at github.com/lermrover-hub/marina-mms',
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
  ...section12(),
  ...section13(),
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
            new TextRun({ text: 'Marina MMS — Server Configuration Guide  |  Page ', font: 'Arial', size: 18, color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '888888' }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('C:\\marina-mms\\docs\\01-server-config-guide.docx', buf);
  const kb = (buf.length / 1024).toFixed(1);
  console.log(`01-server-config-guide.docx created — ${kb} KB`);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
