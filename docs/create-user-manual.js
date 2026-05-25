'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  Footer, PageNumber, PageBreak,
} = require('docx');
const fs = require('fs');

// ─── Colours ──────────────────────────────────────────────────────────────────
const TEAL  = '13988f';
const DARK  = '1f2933';
const GREY  = '647076';
const LGREY = 'f3f4f6';
const WHITE = 'ffffff';
const THEAD = '1a6b67';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function spacer(before = 60, after = 60) {
  return new Paragraph({ spacing: { before, after }, children: [] });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: TEAL })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: DARK })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: GREY })],
  });
}

function para(text, bold = false) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 22, color: DARK, bold })],
  });
}

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

function sub_bullet(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 1080, hanging: 360 },
    children: [
      new TextRun({ text: '–  ', font: 'Arial', size: 20, color: GREY }),
      new TextRun({ text, font: 'Arial', size: 20, color: DARK }),
    ],
  });
}

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

function code(text) {
  return new Paragraph({
    spacing: { before: 30, after: 30 },
    indent: { left: 360, right: 360 },
    shading: { fill: LGREY, type: ShadingType.CLEAR, color: LGREY },
    children: [new TextRun({ text, font: 'Courier New', size: 18, color: DARK })],
  });
}

function hr() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { color: TEAL, size: 6, space: 1, style: BorderStyle.SINGLE } },
    children: [],
  });
}

function infoBox(label, text, fillColor = 'e8f6f5') {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: 180, right: 180 },
    shading: { fill: fillColor, type: ShadingType.CLEAR },
    children: [
      new TextRun({ text: label, font: 'Arial', size: 22, bold: true, color: TEAL }),
      new TextRun({ text, font: 'Arial', size: 22, color: DARK }),
    ],
  });
}

function warningBox(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: 180, right: 180 },
    shading: { fill: 'fff8e1', type: ShadingType.CLEAR },
    children: [
      new TextRun({ text: 'Important: ', font: 'Arial', size: 22, bold: true, color: 'b06000' }),
      new TextRun({ text, font: 'Arial', size: 22, color: DARK }),
    ],
  });
}

function checkItem(text) {
  return new Paragraph({
    spacing: { before: 50, after: 50 },
    indent: { left: 720, hanging: 360 },
    children: [
      new TextRun({ text: '☐  ', font: 'Arial', size: 22, color: TEAL }),
      new TextRun({ text, font: 'Arial', size: 22, color: DARK }),
    ],
  });
}

// ─── Table ────────────────────────────────────────────────────────────────────

function makeTable(headers, rows, colWidths) {
  if (!colWidths) {
    const w = Math.floor(9000 / headers.length);
    colWidths = headers.map(() => w);
  }

  function hCell(text, w) {
    return new TableCell({
      width: { size: w, type: WidthType.DXA },
      shading: { fill: THEAD, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text, font: 'Arial', size: 20, bold: true, color: WHITE })],
      })],
    });
  }

  function dCell(text, w, shade) {
    return new TableCell({
      width: { size: w, type: WidthType.DXA },
      shading: shade ? { fill: 'f0fafa', type: ShadingType.CLEAR } : undefined,
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: String(text), font: 'Arial', size: 20, color: DARK })],
      })],
    });
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
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
        children: headers.map((h, i) => hCell(h, colWidths[i])),
      }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((cell, i) => dCell(cell, colWidths[i], ri % 2 === 0)),
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
      children: [new TextRun({ text: 'Marina MMS', font: 'Arial', size: 72, bold: true, color: TEAL })],
    }),
    spacer(120),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'User Manual', font: 'Arial', size: 48, bold: true, color: DARK })],
    }),
    spacer(180),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 8, color: TEAL } },
      children: [],
    }),
    spacer(120),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'Ocean Rover Marina & Boat Yard Management System',
        font: 'Arial', size: 26, bold: true, color: TEAL,
      })],
    }),
    spacer(120),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'Version 1.0  |  May 2026',
        font: 'Arial', size: 22, color: GREY, italics: true,
      })],
    }),
    spacer(60),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'คู่มือการใช้งานระบบบริหารงานมารีน่าและอู่เรือ',
        font: 'Arial', size: 22, color: GREY, italics: true,
      })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Table of contents ────────────────────────────────────────────────────────

function tocPage() {
  const entries = [
    ['Getting Started', 'Accessing the System, Login, Navigation, User Roles'],
    ['Module 1', 'Dashboard / แดชบอร์ด'],
    ['Module 2', 'Customers / ลูกค้า'],
    ['Module 3', 'Boats / เรือ'],
    ['Module 4', 'Marina Operations / ปฏิบัติการมารีน่า'],
    ['Module 5', 'Ramp & Launch / ทางลาดและการนำเรือลง'],
    ['Module 6', 'Boat Yard / อู่เรือ'],
    ['Module 7', 'Quotations / ใบเสนอราคา'],
    ['Module 8', 'Invoices and Payments / ใบแจ้งหนี้และการชำระเงิน'],
    ['Module 9', 'Inventory / คลังสินค้า'],
    ['Module 10', 'Reports / รายงาน'],
    ['Module 11', 'Customer Portal / พอร์ทัลลูกค้า'],
    ['Module 12', 'Settings / การตั้งค่า'],
    ['Appendix A', 'Keyboard Shortcuts and Navigation Tips'],
    ['Appendix B', 'Common Troubleshooting'],
  ];

  return [
    h1('Table of Contents'),
    hr(),
    spacer(120),
    ...entries.map(([label, desc]) =>
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({ text: `${label}  `, font: 'Arial', size: 22, bold: true, color: TEAL }),
          new TextRun({ text: '— ', font: 'Arial', size: 22, color: GREY }),
          new TextRun({ text: desc, font: 'Arial', size: 22, color: DARK }),
        ],
      })
    ),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Getting Started ─────────────────────────────────────────────────────────

function gettingStarted() {
  const roleRows = [
    ['Super Admin', 'Full access to all modules, settings, users, and data', 'System administrator, IT staff'],
    ['Managing Director', 'Read-only executive dashboard, all reports, approve large discounts', 'Marina owner, MD'],
    ['Marina Manager', 'Berth management, boat movements, ramp bookings, contracts, utility readings', 'Marina manager'],
    ['Boat Yard Manager', 'Service requests, work orders, quotations, job tasks, job completion, contractor management', 'Boat yard manager'],
    ['Finance / Accounting', 'Invoices, payments, receipts, statement of account, financial reports', 'Accountant'],
    ['Sales / Customer Service', 'Customer CRM, quotations, inquiries, communication log', 'Sales staff'],
    ['Operation Supervisor', 'Ramp checklists, operation logs, boat movements, launch/retrieval', 'Dock supervisor'],
    ['Technician', 'View assigned tasks only, upload progress photos, log time, update task status', 'Boat yard technician'],
    ['Security / Gate', 'View daily boat movement schedule, log boat movements, log visitor entry/exit', 'Security guard'],
    ['Customer', 'Customer Portal only — own boats, own invoices, own service requests', 'Boat owner'],
  ];

  return [
    h1('Getting Started / เริ่มต้นใช้งาน'),
    hr(),

    h2('Accessing the System / เข้าสู่ระบบ'),
    para('Open any modern web browser (Chrome, Firefox, Edge, or Safari) and navigate to:'),
    spacer(60),
    infoBox('Production URL: ', 'https://marina-mms.vercel.app'),
    spacer(60),
    para('Or your marina\'s custom domain if configured, e.g., https://marina.oceanrover.com'),
    spacer(),
    para('The system works on desktop computers, tablets, and mobile phones. For daily operations in the yard and on the dock, a tablet or smartphone in landscape mode provides the best experience. No app installation is required — the web application is mobile-responsive and can be saved to your home screen as a Progressive Web App (PWA) for quick access.'),

    h2('Login / เข้าสู่ระบบ'),
    numbered('On the login page, enter your Email address and Password.', 1),
    numbered('Click Sign In (or press Enter).', 2),
    numbered('If you have forgotten your password, click Forgot Password? and follow the email reset instructions.', 3),
    numbered('After successful login, you will be directed to the Dashboard.', 4),
    spacer(),
    infoBox('First login: ', 'Your account is created by the Super Admin. You will receive a welcome email with a temporary password. Log in and change your password immediately via Settings → My Profile → Change Password.'),
    spacer(60),
    infoBox('Session timeout: ', 'For security, sessions expire after 8 hours of inactivity. You will be asked to log in again.'),

    h2('Language / ภาษา'),
    para('The system supports both English and Thai (ภาษาไทย). To change the display language:'),
    numbered('Click your profile picture or name in the top-right corner.', 1),
    numbered('Select Language → choose English or ภาษาไทย.', 2),
    numbered('The interface will refresh in the selected language.', 3),

    h2('Navigation / การนำทาง'),
    para('The system uses a left sidebar navigation with expandable menu sections. The sidebar can be collapsed on smaller screens by clicking the menu icon (☰) in the top-left corner.'),
    spacer(),
    para('Top bar contains:', true),
    bullet('Search box (searches across customers, boats, invoices, work orders)'),
    bullet('Notification bell (shows alerts for overdue invoices, expiring insurance, pending approvals)'),
    bullet('User profile menu'),
    spacer(),
    para('Main navigation sections:', true),
    numbered('Dashboard / แดชบอร์ด', 1),
    numbered('Customers / ลูกค้า', 2),
    numbered('Boats / เรือ', 3),
    numbered('Marina Operations / ปฏิบัติการมารีน่า', 4),
    numbered('Ramp & Launch / ทางลาดและการนำเรือลง', 5),
    numbered('Boat Yard / อู่เรือ', 6),
    numbered('Quotations / ใบเสนอราคา', 7),
    numbered('Invoices / ใบแจ้งหนี้', 8),
    numbered('Payments / การชำระเงิน', 9),
    numbered('Inventory / คลังสินค้า', 10),
    numbered('Reports / รายงาน', 11),
    numbered('Settings / การตั้งค่า', 12),

    h2('User Roles and Permissions / บทบาทผู้ใช้งาน'),
    para('Each user is assigned a role that determines which features they can access:'),
    spacer(120),
    makeTable(['Role', 'Access Level', 'Typical User'], roleRows, [2500, 4500, 2500]),
    spacer(120),
    infoBox('Note: ', 'If you cannot see a feature described in this manual, your role may not have access to it. Contact your Super Admin to adjust permissions.'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 1: Dashboard ──────────────────────────────────────────────────────

function module1() {
  return [
    h1('Module 1: Dashboard / แดชบอร์ด'),
    hr(),

    h2('Overview'),
    para('The Dashboard is the first page you see after logging in. It provides a real-time overview of the marina\'s key performance indicators (KPIs), alerts, and current operational status. The dashboard adapts its content based on your role.'),

    h2('KPI Cards (Key Performance Indicators)'),
    para('The top row of the Dashboard displays summary cards. Each card shows the current value, a comparison to the previous period, and a trend indicator (green upward arrow = improving, red downward arrow = declining).'),
    spacer(),
    para('Revenue Cards:', true),
    bullet('Total Revenue This Month — Sum of all paid and partially paid invoices for the current calendar month, shown in Thai Baht (THB)'),
    bullet('Outstanding Invoices — Total value of all issued invoices not yet fully paid'),
    bullet('Overdue Invoices — Total value of invoices past their due date — shown in red if non-zero'),
    spacer(),
    para('Occupancy Cards:', true),
    bullet('Wet Berth Occupancy — Percentage of wet berths currently occupied (e.g., 82% = 41/50 berths in use)'),
    bullet('Dry Storage Occupancy — Percentage of dry storage slots currently occupied'),
    bullet('Available Berths — Count of berths currently available for new customers'),
    spacer(),
    para('Operations Cards:', true),
    bullet('Open Work Orders — Number of repair/service jobs currently in progress'),
    bullet('Overdue Jobs — Work orders past their estimated completion date — urgent attention required'),
    bullet('Ramp Bookings Today — Number of launch/retrieval operations scheduled for today'),
    spacer(),
    para('Customer Cards:', true),
    bullet('Active Customers — Total customers with active contracts or recent activity'),
    bullet('Pending Quotations — Quotations sent to customers awaiting their response'),
    bullet('New Service Requests — Uninspected service requests requiring attention'),

    h2('Alerts Panel'),
    para('Below the KPI cards, the Alerts panel shows time-sensitive notifications:'),
    bullet('Insurance Expiring Soon — Boats whose insurance expires within 30/60/90 days'),
    bullet('Contract Renewal Due — Berth contracts expiring within 60 days'),
    bullet('Overdue Invoices — Individual invoice alerts with customer name and amount'),
    bullet('Pending Approvals — Quotations awaiting manager approval before sending to customers'),
    bullet('Low Stock Alert — Inventory items below minimum stock level'),
    spacer(),
    para('Click any alert to navigate directly to the relevant record. Dismiss resolved alerts using the checkbox.'),

    h2('Charts Section'),
    bullet('Revenue by Month (Bar Chart) — Displays monthly revenue for the past 12 months with breakdown by business unit. Hover over bars to see exact figures.'),
    bullet('Berth Occupancy Trend (Line Chart) — Shows occupancy percentage over the past 6 months for both Wet Berths and Dry Storage.'),
    bullet('Job Status Distribution (Donut Chart) — Shows current work orders broken down by status.'),
    bullet('Top Customers by Revenue (Table) — Lists the top 10 customers by revenue in the current year.'),

    h2('Quick Actions'),
    para('The Dashboard includes quick-action buttons for the most common tasks:'),
    bullet('+ New Customer — Opens customer creation form'),
    bullet('+ New Ramp Booking — Opens ramp booking calendar'),
    bullet('+ New Service Request — Opens service request form'),
    bullet('+ New Invoice — Opens invoice creation'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 2: Customers ──────────────────────────────────────────────────────

function module2() {
  return [
    h1('Module 2: Customers / ลูกค้า'),
    hr(),

    h2('2.1 Customer List'),
    para('The Customer List page shows all customers registered in the system. By default, it shows active customers sorted by name.'),
    spacer(),
    bullet('Search: Type a customer\'s name, phone number, email, or company name. The list filters in real time.'),
    bullet('Filters: Customer Type, Status, Nationality, Has overdue invoice, Has active contract'),
    bullet('Column headers are clickable to sort ascending/descending'),
    bullet('Export: Click Export to download as Excel (.xlsx) or CSV'),

    h2('2.2 Creating a New Customer'),
    numbered('On the Customer List page, click + New Customer (top right).', 1),
    numbered('Fill in the customer form. Required fields are marked with a red asterisk (*).', 2),
    numbered('Click Save Customer. The customer profile page opens.', 3),
    spacer(),
    para('Key form fields:', true),
    bullet('Customer Type* — Private Owner, Charter Operator, Speedboat Operator, Yacht Broker, Contractor, Supplier'),
    bullet('Full Name* and Company Name'),
    bullet('Nationality, Phone*, Email, Address'),
    bullet('Tax ID / Passport No. — Thai nationals: 13-digit Tax ID; foreigners: Passport number'),
    bullet('Preferred Language — Thai or English (affects document templates)'),
    bullet('Emergency Contact and Billing Contact'),
    bullet('Payment Terms — Net 7, Net 15, Net 30, or Immediate'),
    bullet('Credit Limit — Set to 0 for prepayment required'),
    bullet('Internal Notes — Private notes visible only to staff'),
    bullet('Risk Flag — Adds a warning banner for late payment history'),

    h2('2.3 Customer Profile Page'),
    para('The Customer Profile page is the central hub for all customer information, divided into tabs:'),
    spacer(),
    bullet('Summary Tab — Customer details, financial summary, active contracts, risk flag, quick actions'),
    bullet('Boats Tab — All registered boats with status and links'),
    bullet('Contracts Tab — Active and historical berth/storage contracts'),
    bullet('Quotations Tab — All quotations with status badges'),
    bullet('Invoices Tab — All invoices with payment status (color-coded)'),
    bullet('Payments Tab — All payment records'),
    bullet('Service History Tab — All service requests and work orders'),
    bullet('Documents Tab — Upload area for PDFs, JPGs, PNGs (max 20 MB per file)'),
    bullet('Communication Log Tab — Record of all interactions'),

    h2('2.4 Editing a Customer'),
    numbered('Open the customer profile.', 1),
    numbered('Click Edit (pencil icon, top right of the summary card).', 2),
    numbered('Modify any fields as needed.', 3),
    numbered('Click Save Changes.', 4),
    numbered('Changes are logged in the audit trail.', 5),

    h2('2.5 Customer Status Management'),
    bullet('Active → Inactive: Used when a customer has moved their boat out and has no active contracts'),
    bullet('Active → Blocked: Used when a customer has unresolved disputes or unpaid overdue invoices'),
    bullet('To change status: customer profile → Actions menu → Change Status → select new status → add a reason note'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 3: Boats ──────────────────────────────────────────────────────────

function module3() {
  return [
    h1('Module 3: Boats / เรือ'),
    hr(),

    h2('3.1 Boat List'),
    para('The Boat List displays all registered boats. Filter by:'),
    bullet('Boat type (Speed Boat, Motor Yacht, Sailing Yacht, Catamaran, Power Catamaran, RIB, Other)'),
    bullet('Current status (Active, In Storage, In Water, In Repair, Moved Out)'),
    bullet('Current location (Wet Berth, Dry Storage, In Water, Repair Yard, etc.)'),
    bullet('Insurance expiry (Expiring within 30/60/90 days, Already expired)'),

    h2('3.2 Registering a New Boat'),
    numbered('Click + New Boat from the Boat List or from a customer\'s profile.', 1),
    numbered('If creating from the Boat List, search for and select the owner first.', 2),
    numbered('Fill in the boat details form.', 3),
    numbered('Click Save Boat. The boat profile page opens.', 4),
    spacer(),
    para('Key form fields:', true),
    bullet('Boat Name*, Owner*, Boat Type*, Usage Type (Private, Charter, Racing, Commercial)'),
    bullet('Brand / Builder, Model, Year Built'),
    bullet('Registration Number, Hull Number / HIN, Flag / Country of Registration'),
    bullet('LOA (Length Overall, meters)* — Total length from bow to stern'),
    bullet('Beam (meters)* — Maximum width'),
    bullet('Draft (meters)* — Depth below waterline. Used in tide safety calculations — must be accurate'),
    bullet('Air Draft (meters) — Height above waterline (for bridges and covered storage)'),
    bullet('Weight / Displacement (kg or tonnes) — For crane and travel lift operations'),
    bullet('Hull Material, Engine Type, Engine Brand/Model, Number of Engines, Fuel Type'),
    bullet('Trailer Required, Cradle / Support Type, Special Handling Instructions'),
    bullet('Insurance Provider, Policy Number, Insurance Expiry Date (alerts at 90/60/30 days)'),

    h2('3.3 Boat Profile Page'),
    para('The Boat Profile page tabs include:'),
    bullet('Summary Tab — Current location badge, dimensions summary, owner info, insurance status'),
    bullet('Technical Data Tab — Full detailed specifications; requires Marina Manager or Boat Yard Manager role to edit'),
    bullet('Current Location Tab — Exact berth/slot, Move boat button, location history timeline'),
    bullet('Service History Tab — All past and current work orders'),
    bullet('Documents Tab — Registration certificate, insurance, survey reports'),
    bullet('Photos Tab — Gallery organized by category (General, On Arrival, In Storage, After Repair)'),
    bullet('Quotations and Invoices Tab — All financial records linked to this boat'),

    h2('3.4 Boat Location Rules'),
    warningBox('Every boat must have exactly one active location at all times. The system enforces this rule strictly.'),
    spacer(),
    bullet('When a boat is first registered, it starts with location "Pending Arrival"'),
    bullet('When it arrives, staff log it into its assigned berth/slot — this creates a movement log entry'),
    bullet('To move a boat, use the Move Boat function which closes the old location, creates a movement log, and opens the new location'),
    bullet('Photos are required for major movements (arrival, departure, entering yard for repair)'),
    spacer(),
    infoBox('Override: ', 'If a boat\'s location is incorrect, only a Marina Manager or Super Admin can correct it using the Override Location function, which is logged in the audit trail.'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 4: Marina Operations ─────────────────────────────────────────────

function module4() {
  return [
    h1('Module 4: Marina Operations / ปฏิบัติการมารีน่า'),
    hr(),

    h2('4.1 Berth Map'),
    para('The Berth Map is a visual, interactive layout of your marina\'s wet berths.'),
    spacer(),
    para('Color coding:', true),
    bullet('Green = Available'),
    bullet('Blue = Occupied (active contract)'),
    bullet('Orange = Reserved'),
    bullet('Grey = Maintenance'),
    bullet('Red = Overdue Payment Hold'),
    spacer(),
    para('Click a berth to open its detail panel: berth number, dimensions, current occupant, contract end date, quick actions, and history.'),
    spacer(),
    para('Filtering the map:', true),
    bullet('Show only available berths (for checking availability for a prospective customer)'),
    bullet('Filter by minimum length to find berths that can fit a specific boat'),
    bullet('Filter by section/zone (if your marina is divided into zones)'),

    h2('4.2 Dry Storage Map'),
    para('Similar to the Berth Map but for land-based dry storage slots. Additional information includes:'),
    bullet('Row/Bay/Level — Position identifier for multi-level rack storage'),
    bullet('Forklift access — Whether a forklift can reach this position'),
    bullet('Cover — Whether the slot is covered or open-air'),

    h2('4.3 Berth Assignment'),
    numbered('Navigate to Marina Operations → Berth Assignment or click on a berth in the map.', 1),
    numbered('Click Assign Boat.', 2),
    numbered('Search for the customer or boat.', 3),
    numbered('Select the boat — system only shows berths that can accommodate the boat\'s dimensions.', 4),
    numbered('Set the start date and if applicable, end date.', 5),
    numbered('Link to a contract (if a contract exists, this field will auto-populate).', 6),
    numbered('Upload arrival photos (required for insurance and condition record).', 7),
    numbered('Click Confirm Assignment.', 8),

    h2('4.4 Boat Movements'),
    para('The Boat Movement Log records every time a boat moves between locations.'),
    spacer(),
    para('Logging a movement:', true),
    numbered('Marina Operations → Boat Movements → + New Movement.', 1),
    numbered('Select the boat.', 2),
    numbered('Select movement type: Arrival, Departure, Move to Repair Yard, Move to Storage, Move to Water, Move to Waiting Area, Internal Move.', 3),
    numbered('Set date and time.', 4),
    numbered('From location and To location are auto-filled; adjust if needed.', 5),
    numbered('Upload before/after photos (required for all major movements).', 6),
    numbered('Assign staff member responsible for the movement.', 7),
    numbered('Click Log Movement.', 8),

    h2('4.5 Contracts'),
    para('Marina contracts define the terms of a berth or storage rental agreement.'),
    spacer(),
    para('Creating a new contract:', true),
    numbered('Marina Operations → Contracts → + New Contract.', 1),
    numbered('Select customer and boat.', 2),
    numbered('Select berth or storage slot.', 3),
    numbered('Set contract type: Monthly, Annual, Short-term, Custom Period.', 4),
    numbered('Enter contract dates, pricing, included services, payment terms, and deposit required.', 5),
    numbered('Click Save Contract (creates in Draft status).', 6),
    numbered('Review and click Activate Contract.', 7),
    numbered('Optional: click Generate Contract PDF for the official contract document.', 8),
    spacer(),
    bullet('Renewing: Open contract → Renew → confirm new end date and pricing → Confirm Renewal'),
    bullet('Terminating: Open contract → Actions → Terminate Contract → enter date and reason → Confirm Termination'),

    h2('4.6 Utility Meter Readings'),
    para('For berths with water and electricity meters, record readings monthly for billing purposes.'),
    spacer(),
    numbered('Marina Operations → Utility Readings → + New Reading.', 1),
    numbered('Select berth and enter date of reading.', 2),
    numbered('Enter electricity meter reading (kWh) — current value, not consumption.', 3),
    numbered('Enter water meter reading (cubic meters) — current value.', 4),
    numbered('System calculates consumption and charge automatically.', 5),
    numbered('Upload a photo of the meter reading (recommended for dispute prevention).', 6),
    numbered('Click Save Reading.', 7),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 5: Ramp & Launch ──────────────────────────────────────────────────

function module5() {
  const tideRows = [
    ['06:00', '1.85 m', 'NOT SAFE'],
    ['07:00', '2.34 m', 'NOT SAFE'],
    ['08:00', '2.89 m', 'NOT SAFE'],
    ['09:00', '3.12 m', 'SAFE ✓'],
    ['10:00', '3.45 m', 'SAFE ✓'],
    ['11:00', '3.21 m', 'SAFE ✓'],
    ['12:00', '2.87 m', 'NOT SAFE'],
  ];

  return [
    h1('Module 5: Ramp & Launch / ทางลาดและการนำเรือลง'),
    hr(),

    h2('5.1 Ramp Booking Calendar'),
    para('The Ramp Booking Calendar shows a weekly view of all scheduled ramp operations.'),
    spacer(),
    para('Color codes:', true),
    bullet('Blue = Launch'),
    bullet('Orange = Retrieval'),
    bullet('Green = Confirmed'),
    bullet('Yellow = Pending Tide Check'),
    bullet('Red = Cancelled'),

    h2('5.2 Creating a Ramp Booking'),
    numbered('Ramp & Launch → + New Booking or click + on a time slot in the calendar.', 1),
    numbered('Select Customer*, Boat*, and Operation Type* (Launch, Retrieval, Move to Water, Move to Storage, Dry-out Wash, Fuel).', 2),
    numbered('Enter Requested Date* and Requested Time.', 3),
    numbered('After selecting the boat, system auto-fills Draft, Weight, LOA, and Beam from the boat profile.', 4),
    numbered('Add any special notes from the customer.', 5),

    h2('5.3 Tide Safety Calculation'),
    para('The tide safety calculation checks whether the tide level on the requested date will be safe for the operation.'),
    spacer(),
    infoBox('Formula: ', 'Minimum Required Tide Table Height = (Boat Draft + Trailer Frame Height + Safety Clearance) − Ramp Depth Offset'),
    spacer(),
    para('Input fields:', true),
    bullet('Boat Draft — Auto-filled from boat profile (e.g., 1.20 m for a motor yacht)'),
    bullet('Trailer / Support Frame Height — Default: 0.50 m for standard trailers'),
    bullet('Safety Clearance — Default: 0.30 m (can be increased for heavy or deep-draft vessels)'),
    bullet('Ramp Depth Offset — Default: -1.00 m (configured in Settings → Ramp Configuration)'),
    spacer(),
    para('Example calculation:', true),
    code('Boat Draft:              1.20 m'),
    code('Trailer Frame Height:    0.50 m'),
    code('Safety Clearance:        0.30 m'),
    code('Ramp Depth Offset:      -1.00 m'),
    code('─────────────────────────────────'),
    code('Required Tide Height = (1.20 + 0.50 + 0.30) − (−1.00) = 3.00 m'),
    spacer(120),
    para('The predicted tide height must be at least 3.00 meters above chart datum for the operation to be safe.'),
    spacer(120),
    para('Tide Results Table (example):', true),
    spacer(80),
    makeTable(['Time', 'Predicted Tide Height', 'Status'], tideRows, [2000, 3500, 4000]),
    spacer(120),
    warningBox('Tide predictions are based on astronomical calculations and may differ from actual sea level conditions due to weather, wind direction, barometric pressure, and sea state. Final operational safety confirmation must be assessed on the day of operation by the supervising staff member.'),

    h2('5.4 Operation Checklists'),
    para('Pre-Launch Checklist:', true),
    checkItem('Tide level verified safe by on-site staff'),
    checkItem('Boat documentation on file and valid (insurance not expired)'),
    checkItem('Trailer/cradle appropriate for this boat type'),
    checkItem('All crew briefed on boat handling'),
    checkItem('Engine kill switch and safety equipment checked'),
    checkItem('Fuel level noted'),
    checkItem('Before photos taken (boat, trailer, ramp area)'),
    checkItem('Customer/representative present or authorization confirmed'),
    spacer(),
    para('Post-Launch Checklist:', true),
    checkItem('Boat successfully launched — no damage during operation'),
    checkItem('Boat location updated in system (moved to In Water status)'),
    checkItem('Trailer returned to storage'),
    checkItem('After photos taken'),
    checkItem('Ramp area cleared'),
    checkItem('Operation log completed'),
    checkItem('Invoice generated if pay-per-launch billing applies'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 6: Boat Yard ──────────────────────────────────────────────────────

function module6() {
  return [
    h1('Module 6: Boat Yard / อู่เรือ'),
    hr(),

    h2('6.1 Service Requests'),
    para('A Service Request is how a repair or service job starts. It can be created by staff or by the customer through the Customer Portal.'),
    spacer(),
    para('Creating a Service Request:', true),
    numbered('Boat Yard → Service Requests → + New Request.', 1),
    numbered('Select Customer* and Boat*.', 2),
    numbered('Select Service Type* — Engine, Electrical, Fiberglass, Painting, Antifouling, Interior, Canvas, Stainless/Metal Work, Cleaning/Detailing, Plumbing, Generator, Air Conditioning, Annual Service, Survey, Other.', 3),
    numbered('Set Priority — Low, Normal, High, Urgent.', 4),
    numbered('Enter a detailed Description of the problem or service needed.', 5),
    numbered('Confirm Boat Current Location (auto-filled from boat profile).', 6),
    numbered('Enter Requested Start Date.', 7),
    numbered('Upload Photos of the problem (optional but recommended).', 8),
    numbered('Click Submit Request.', 9),

    h2('6.2 Inspection'),
    para('Before creating a quotation for complex jobs, an inspection is recorded.'),
    numbered('Open the service request → click Record Inspection.', 1),
    numbered('Select Inspector* and enter Inspection Date*.', 2),
    numbered('Record detailed Findings for each area: hull, engine, electrical, interior, osmosis, other.', 3),
    numbered('List Recommended Work based on inspection findings.', 4),
    numbered('Upload inspection photos — these become the "Before" photos in the job record.', 5),
    numbered('Click Save Inspection.', 6),

    h2('6.3 Work Orders'),
    para('A Work Order is created from an accepted quotation and represents the approved, active repair job.'),
    spacer(),
    para('Work Order Detail Page — Tabs:', true),
    bullet('Scope of Work Tab — Summary of all approved work items from the quotation'),
    bullet('Task List Tab — Individual job tasks with: task name, assigned technician, estimated hours, status, notes. Statuses: To Do, In Progress, Waiting, Completed, Verified'),
    bullet('Technician Assignment Tab — Current assignments per task and timesheet entries'),
    bullet('Materials Tab — Parts and materials issued from inventory'),
    bullet('Contractors Tab — External contractors assigned to specific tasks'),
    bullet('Photos Tab — All photos organized by category: Before, During Progress, After Completion, Defect Evidence, Parts Received, Customer Approval Photo, Completion Handover'),
    bullet('Costing Tab — Real-time job costing (Labor, Material, Contractor Revenue vs Actual Costs, Gross Profit, Gross Margin %)'),
    bullet('Completion Tab — Final inspection sign-off, warranty terms, customer handover, Generate Completion Report'),

    h2('6.4 Work Order Status Flow'),
    spacer(60),
    code('New Request'),
    code('    ↓'),
    code('Inspection Required → [Inspection recorded]'),
    code('    ↓'),
    code('Quotation Draft → [Quotation created]'),
    code('    ↓'),
    code('Quotation Sent → [Customer receives quotation]'),
    code('    ↓'),
    code('Waiting Customer Approval'),
    code('    ↓'),
    code('Waiting Deposit → [Customer approves] → [Deposit received]'),
    code('    ↓'),
    code('Approved → [Work Order created]'),
    code('    ↓'),
    code('In Progress → [Tasks underway]'),
    code('    ↓'),
    code('Waiting Parts ← → [Parts arrive] ← Waiting Contractor ← → [Contractor completes]'),
    code('    ↓'),
    code('Completed → [Supervisor inspection passed]'),
    code('    ↓'),
    code('Waiting Invoice → [Invoice generated]'),
    code('    ↓'),
    code('Closed ← [Invoice paid]'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 7: Quotations ─────────────────────────────────────────────────────

function module7() {
  return [
    h1('Module 7: Quotations / ใบเสนอราคา'),
    hr(),

    h2('7.1 Quotation List'),
    para('Status color coding:'),
    bullet('Grey = Draft (not yet sent)'),
    bullet('Blue = Sent (awaiting customer response)'),
    bullet('Green = Accepted'),
    bullet('Red = Rejected or Expired'),
    bullet('Purple = Converted (turned into work order / invoice / contract)'),
    bullet('Orange = Pending Internal Approval'),

    h2('7.2 Creating a Quotation'),
    numbered('Quotations → + New Quotation or from a service request/customer profile.', 1),
    numbered('Link to Service Request (optional), select Customer* and Boat*.', 2),
    numbered('Select Quotation Type* — Boat Repair, Berth/Storage, Ramp Service, Annual Service Package, Ad-hoc Service, Other.', 3),
    numbered('Set Valid Until date (default: 30 days from today).', 4),
    numbered('Add Line Items — click + Add Item for each service or product: Description, Category, Unit, Quantity, Unit Price, Total.', 5),
    numbered('Enter Subtotal (auto-calculated).', 6),
    numbered('Set Discount amount or percentage. Discounts exceeding the threshold require manager approval.', 7),
    numbered('VAT — calculated at 7% by default. Check "Include VAT" box.', 8),
    numbered('Grand Total — auto-calculated: Subtotal − Discount + VAT.', 9),
    numbered('Set Required Deposit (typically 50% for repair jobs).', 10),
    numbered('Add Notes to Customer and Internal Notes.', 11),
    spacer(),
    para('Saving and sending options:', true),
    bullet('Save as Draft — Saves without sending; can edit later'),
    bullet('Request Approval — Submits for manager review if your role requires approval'),
    bullet('Send to Customer — Generates PDF and emails it; status changes to Sent'),

    h2('7.3 Customer Quotation Approval'),
    bullet('Via Customer Portal — Customer logs in, views the quotation, and clicks Accept or Reject with digital signature'),
    bullet('Via Email — The quotation email contains Accept/Reject buttons linking back to the portal'),
    bullet('In Person — Staff can mark quotation as Accepted and note "Verbal approval" or upload a signed physical quotation'),

    h2('7.4 Converting a Quotation'),
    para('Once accepted, click the Convert button on the accepted quotation and select:'),
    bullet('Work Order — For boat repair / service jobs'),
    bullet('Invoice — For simple billing (berth rental, ramp service)'),
    bullet('Contract — For ongoing berth or storage contracts'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 8: Invoices and Payments ─────────────────────────────────────────

function module8() {
  return [
    h1('Module 8: Invoices and Payments / ใบแจ้งหนี้และการชำระเงิน'),
    hr(),

    h2('8.1 Invoice List'),
    para('Use filters to find invoices by:'),
    bullet('Status: Draft, Issued, Partially Paid, Paid, Overdue, Cancelled'),
    bullet('Customer, Boat, Date range, Amount range'),
    spacer(),
    para('Overdue invoices are highlighted in red. The Outstanding view (default) shows only unpaid and partially paid invoices.'),

    h2('8.2 Creating an Invoice'),
    para('Invoices can be created in three ways:', true),
    spacer(),
    h3('From Quotation (most common for repairs)'),
    numbered('Open accepted quotation → click Convert to Invoice.', 1),
    numbered('All line items are transferred automatically.', 2),
    numbered('Review and click Issue Invoice.', 3),
    spacer(),
    h3('From Work Order Completion'),
    numbered('Open completed work order → Actions → Generate Invoice.', 1),
    numbered('Line items built from approved scope of work.', 2),
    numbered('Review and issue.', 3),
    spacer(),
    h3('Manual Invoice'),
    numbered('Invoices → + New Invoice.', 1),
    numbered('Select customer and boat (if applicable).', 2),
    numbered('Add line items manually and set due date.', 3),
    numbered('Click Save Draft then Issue Invoice.', 4),
    spacer(),
    para('Auto-generated Invoice Number format: INV-YYYY-NNNNN (e.g., INV-2026-00142)'),

    h2('8.3 Sending an Invoice to the Customer'),
    numbered('Open the issued invoice.', 1),
    numbered('Click Send Invoice.', 2),
    numbered('Review the PDF preview.', 3),
    numbered('Confirm the recipient email address.', 4),
    numbered('Click Send.', 5),

    h2('8.4 Recording a Payment'),
    numbered('Open the invoice → click Record Payment.', 1),
    numbered('Payment Date* — Date the payment was received (not the date you record it).', 2),
    numbered('Amount Received* — Full or partial amount.', 3),
    numbered('Payment Method* — Cash, Bank Transfer, Credit Card, QR Payment, Cheque, Other.', 4),
    numbered('Bank Account / Reference — bank name, account last 4 digits, transfer reference number.', 5),
    numbered('Upload Payment Slip — bank transfer slip, QR receipt screenshot, or cheque scan.', 6),
    numbered('Add Notes if needed.', 7),
    numbered('Click Confirm Payment.', 8),
    spacer(),
    para('What happens automatically:', true),
    bullet('Invoice status: if full amount → Paid; if partial → Partially Paid'),
    bullet('Outstanding balance recalculated'),
    bullet('Receipt is generated (available to print/download/email)'),
    bullet('Customer\'s outstanding balance on their profile is updated'),

    h2('8.5 Receipts'),
    para('A receipt is automatically generated when a payment is confirmed.'),
    bullet('View Receipt: Open payment record → click View Receipt'),
    bullet('Send Receipt to email the customer'),
    bullet('Download PDF to save or print'),

    h2('8.6 Handling Partial Payments'),
    para('If a customer pays in installments:'),
    bullet('Record each payment separately using Record Payment on the same invoice'),
    bullet('Invoice status shows Partially Paid with the remaining balance'),
    bullet('Each payment generates its own receipt'),
    bullet('Invoice is marked Paid only when the balance reaches zero'),

    h2('8.7 Overdue Invoices'),
    para('The system automatically marks invoices as Overdue when the due date passes and the invoice is not fully paid.'),
    spacer(),
    numbered('Invoices → filter by Overdue status.', 1),
    numbered('Send a payment reminder email by clicking Send Reminder, or note a phone call in the communication log.', 2),
    numbered('For seriously overdue accounts: Customer profile → Actions → Place on Credit Hold.', 3),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 9: Inventory ──────────────────────────────────────────────────────

function module9() {
  return [
    h1('Module 9: Inventory / คลังสินค้า'),
    hr(),

    h2('9.1 Inventory Item Master'),
    para('Adding a new inventory item:', true),
    numbered('Inventory → + New Item.', 1),
    numbered('Item Code — Your internal part number (e.g., ENG-OIL-5W30-4L).', 2),
    numbered('Item Name — Full descriptive name.', 3),
    numbered('Category — Engine Parts, Electrical, Fiberglass Materials, Paint, Antifouling, Stainless/Hardware, Cleaning Supplies, Safety Equipment, Other.', 4),
    numbered('Unit — Liter, Piece, Meter, Kilogram, Set, Box.', 5),
    numbered('Minimum Stock Level — Alert triggered when stock drops below this.', 6),
    numbered('Supplier, Standard Cost, Selling Price.', 7),
    numbered('Chargeable to Customer — Yes (most parts) or No (consumables like sandpaper).', 8),
    numbered('Click Save.', 9),

    h2('9.2 Stock Movements'),
    h3('Receiving stock (Stock In)'),
    numbered('Inventory → Stock Movements → + Receive Stock.', 1),
    numbered('Select item and enter quantity received.', 2),
    numbered('Enter supplier invoice reference and actual unit cost.', 3),
    numbered('Optionally link to a Purchase Order.', 4),
    numbered('Click Confirm Receipt.', 5),

    h3('Issuing stock to a work order (Stock Out)'),
    numbered('Open the Work Order → Materials tab → + Add Material.', 1),
    numbered('Search for item by name or code.', 2),
    numbered('Enter quantity needed — system shows current stock level.', 3),
    numbered('Click Issue to Job. Stock level is reduced immediately.', 4),

    h3('Stock adjustment'),
    numbered('Inventory → Stock Adjustments → + New Adjustment.', 1),
    numbered('Select item and enter the correct on-hand quantity.', 2),
    numbered('System calculates the variance automatically.', 3),
    numbered('Select reason: Damaged/Scrapped, Counting Error, Theft, Used and Not Recorded, Other.', 4),
    numbered('Click Save Adjustment. The stock is updated and logged in the audit trail.', 5),

    h2('9.3 Low Stock Alerts'),
    para('The Dashboard and Inventory module show alerts for items below minimum stock level. The Finance/Operations team should review these weekly and create purchase requests.'),

    h2('9.4 Purchase Requests and Orders'),
    numbered('Inventory → Purchase Requests → + New Request.', 1),
    numbered('Select items needed and quantities, preferred supplier, urgency, and notes.', 2),
    numbered('Submit for approval.', 3),
    numbered('After approval, Finance converts the purchase request to a Purchase Order sent to the supplier.', 4),
    numbered('When goods arrive, the Purchase Order is received and stock levels are updated.', 5),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 10: Reports ───────────────────────────────────────────────────────

function module10() {
  return [
    h1('Module 10: Reports / รายงาน'),
    hr(),

    h2('10.1 Available Reports'),
    para('Financial Reports:', true),
    bullet('Monthly Revenue Report — Total revenue by business unit (Wet Berth, Dry Storage, Ramp Service, Boat Repair, Parts/Materials, Other)'),
    bullet('Customer Aging Report — Outstanding balances grouped by: 0-30, 31-60, 61-90, 90+ days overdue'),
    bullet('Outstanding Invoice Report — All unpaid invoices with contact, due date, and balance'),
    bullet('Revenue by Business Unit — Revenue contribution from each department'),
    spacer(),
    para('Operations Reports:', true),
    bullet('Wet Berth Occupancy Report — Monthly occupancy %, vacant berths, average rate'),
    bullet('Dry Storage Occupancy Report — Same as above for dry storage'),
    bullet('Boat Movement Report — All launches, retrievals, and internal moves for a date range'),
    bullet('Job Profitability Report — Revenue, labor cost, material cost, contractor cost, gross profit, and gross margin % per work order'),
    bullet('Quotation Conversion Report — Quotations sent vs accepted vs rejected; conversion rate'),
    bullet('Contractor Cost Report — External contractor costs by job, contractor, and period'),
    bullet('Inventory Usage Report — Parts/materials used, total cost, total revenue'),
    spacer(),
    para('Safety and Compliance:', true),
    bullet('Safety Incident Report — All logged incidents by type, severity, location, and resolution status'),

    h2('10.2 Generating and Exporting Reports'),
    numbered('Navigate to Reports and select the desired report.', 1),
    numbered('Set the date range: This Month, Last Month, This Quarter, This Year, Custom Range.', 2),
    numbered('Apply any additional filters.', 3),
    numbered('Click Generate Report.', 4),
    numbered('To export: click Export and choose format:', 5),
    sub_bullet('PDF — Formatted professional report for management presentation or email'),
    sub_bullet('Excel (.xlsx) — Raw data in spreadsheet format for further analysis'),
    sub_bullet('CSV — Plain data format for import into accounting software'),

    h2('10.3 Scheduled Reports'),
    para('Schedule automatic email delivery for key reports:'),
    numbered('Open the report → click Schedule.', 1),
    numbered('Set frequency: Daily, Weekly, Monthly, or a specific day of month.', 2),
    numbered('Enter email recipients (can add multiple addresses).', 3),
    numbered('Select format (PDF recommended for management reports).', 4),
    numbered('Click Save Schedule.', 5),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 11: Customer Portal ───────────────────────────────────────────────

function module11() {
  return [
    h1('Module 11: Customer Portal / พอร์ทัลลูกค้า'),
    hr(),

    h2('11.1 What the Customer Portal Is'),
    para('The Customer Portal is a separate, secure view of the system for boat owners. Customers log in at the same URL using their email and password. The system detects their role as "Customer" and shows only their own data — they cannot see any other customer\'s information.'),

    h2('11.2 Giving a Customer Portal Access'),
    numbered('Open the customer profile.', 1),
    numbered('Click Actions → Invite to Customer Portal.', 2),
    numbered('Enter or confirm the customer\'s email address.', 3),
    numbered('Click Send Invitation.', 4),
    numbered('The customer receives a welcome email with a link to set their password.', 5),
    numbered('Once they set a password, their portal is active.', 6),

    h2('11.3 What Customers Can Do in the Portal'),
    para('My Boats:', true),
    bullet('View all registered boats with photos, specifications, current location, insurance expiry status'),
    bullet('Upload or update boat documents (insurance, registration)'),
    bullet('View service history for each boat'),
    spacer(),
    para('Service Requests:', true),
    bullet('Submit a new service request — select their boat, describe the problem, upload photos'),
    bullet('Track the status of all existing service requests and work orders'),
    bullet('Receive notifications when status changes'),
    spacer(),
    para('Ramp Booking:', true),
    bullet('Request a launch or retrieval'),
    bullet('See available time slots (showing confirmed safe tide windows)'),
    bullet('Receive booking confirmations'),
    spacer(),
    para('Quotations:', true),
    bullet('View all quotations issued to them'),
    bullet('Download quotation PDF'),
    bullet('Approve or Reject a quotation digitally with signature'),
    bullet('Request a revision (sends a message to the marina team)'),
    spacer(),
    para('Invoices:', true),
    bullet('View all invoices in a clear, customer-friendly format'),
    bullet('Download invoice PDF'),
    bullet('See payment history and receipts'),
    bullet('Upload a payment slip/proof of transfer'),
    spacer(),
    para('Messages / Inquiries:', true),
    bullet('Send a message to the marina team'),
    bullet('View message history and staff replies'),

    h2('11.4 Customer Portal Tips for Staff'),
    bullet('Encourage customers to use the portal for service requests instead of phone calls — this creates a written record.'),
    bullet('The "Upload Payment Slip" feature reduces the manual work of chasing payment confirmations.'),
    bullet('Quotation digital approval via the portal creates a legally documented acceptance with timestamp and IP address.'),
    bullet('Customers who have not yet been invited can still be managed entirely by staff internally; the portal is optional.'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Module 12: Settings ──────────────────────────────────────────────────────

function module12() {
  const notifRows = [
    ['New service request submitted', 'Boat Yard Manager', 'On'],
    ['Quotation awaiting approval', 'Manager', 'On'],
    ['Quotation approved by customer', 'Sales + Boat Yard Manager', 'On'],
    ['Invoice issued', 'Customer (email)', 'On'],
    ['Invoice overdue', 'Finance + Customer', 'On (3 days after due date)'],
    ['Payment confirmed', 'Customer (receipt email)', 'On'],
    ['Insurance expiring 90 days', 'Customer + Marina Manager', 'On'],
    ['Insurance expiring 30 days', 'Customer + Marina Manager', 'On'],
    ['Insurance expired', 'Customer + Marina Manager', 'On'],
    ['Contract expiring 60 days', 'Customer + Marina Manager', 'On'],
    ['Ramp booking confirmed', 'Customer', 'On'],
    ['Work order status changed', 'Customer', 'On'],
    ['Low stock alert', 'Inventory Manager', 'On'],
  ];

  return [
    h1('Module 12: Settings / การตั้งค่า'),
    hr(),

    h2('12.1 Company Profile'),
    para('Settings → Company Profile'),
    spacer(),
    bullet('Company Name — Official registered name'),
    bullet('Company Name (Thai) — Thai language name for Thai tax documents'),
    bullet('Tax ID — 13-digit Thai Tax ID for tax invoices'),
    bullet('Address, Phone, Email, Website'),
    bullet('Logo — PNG, minimum 300×300px, max 5 MB (appears on all PDF documents)'),
    bullet('Default VAT Rate — 7% (standard Thailand rate)'),
    bullet('Default Currency — THB; Date Format — DD/MM/YYYY; Time Zone — Asia/Bangkok'),

    h2('12.2 Document Templates'),
    para('Settings → Document Templates'),
    spacer(),
    para('Available templates:', true),
    bullet('Quotation, Invoice / Tax Invoice, Receipt, Work Order'),
    bullet('Job Completion Report, Berth Contract, Storage Contract, Ramp Service Confirmation'),
    spacer(),
    para('Customizing a template:', true),
    numbered('Click on the template name.', 1),
    numbered('Modify header section, color scheme, footer text, and language (English, Thai, or Bilingual).', 2),
    numbered('Use the preview button to see how the template looks with sample data.', 3),
    numbered('Click Save Template.', 4),

    h2('12.3 Pricing Rules'),
    para('Settings → Pricing'),
    spacer(),
    bullet('Berth Pricing — Per meter LOA per month; different rates by zone; short-term surcharge multiplier'),
    bullet('Dry Storage Pricing — Per meter LOA per month; power supply surcharge; covered storage premium'),
    bullet('Ramp Service Pricing — Launch fee, retrieval fee, combined discount, after-hours surcharge'),
    bullet('Labor Rates — Standard technician rate, specialist rate, supervisor rate, emergency/overtime multiplier'),
    bullet('Contractor Markup — Default markup on contractor invoices (e.g., 20%)'),
    bullet('Material Markup — Default markup on materials (e.g., 30%)'),
    bullet('Utility Rates — Electricity (THB per kWh), Water (THB per cubic meter)'),

    h2('12.4 User and Permission Management'),
    para('Settings → Users'),
    spacer(),
    para('Creating a new user:', true),
    numbered('Click + Invite User.', 1),
    numbered('Enter email address, full name, and select Role.', 2),
    numbered('Click Send Invitation.', 3),
    numbered('User receives email with link to set their password.', 4),
    spacer(),
    para('Editing user roles:', true),
    numbered('Find the user in the list and click their name.', 1),
    numbered('Change role from dropdown and click Save.', 2),
    numbered('Change takes effect immediately.', 3),
    spacer(),
    infoBox('Deactivating a user: ', 'When staff leaves, open the user\'s profile → click Deactivate Account. The user can no longer log in, but all their historical records remain. This is preferable to deleting a user.'),

    h2('12.5 Email and Notification Settings'),
    para('Settings → Notifications'),
    spacer(120),
    makeTable(['Event', 'Notify', 'Default'], notifRows, [4000, 3000, 2500]),

    h2('12.6 Ramp Configuration'),
    para('Settings → Ramp Configuration'),
    spacer(),
    bullet('Ramp Depth Offset — Default: -1.00 m. Should be measured by a surveyor or determined from ramp construction drawings.'),
    bullet('Default Safety Clearance — Default: 0.30 m.'),
    bullet('Default Trailer Frame Height — Default: 0.50 m. Can be overridden per booking.'),
    bullet('Tide Data Source — Configure the tide data API or upload manual tide tables.'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Appendix A ───────────────────────────────────────────────────────────────

function appendixA() {
  const shortcutRows = [
    ['/', 'Focus the global search box'],
    ['Esc', 'Close modal, cancel edit, or clear search'],
    ['Ctrl+S / Cmd+S', 'Save the current form (in supported editors)'],
    ['Ctrl+Enter', 'Submit form / confirm action'],
    ['Alt+N', 'New record (on list pages)'],
    ['Alt+E', 'Edit current record (on detail pages)'],
    ['Alt+←', 'Go back to previous page'],
  ];

  return [
    h1('Appendix A: Keyboard Shortcuts and Navigation Tips'),
    hr(),

    h2('Keyboard Shortcuts'),
    spacer(120),
    makeTable(['Shortcut', 'Action'], shortcutRows, [3500, 6000]),
    spacer(120),

    h2('Time-Saving Tips for Daily Operations'),
    para('For operation staff starting the morning shift:', true),
    numbered('Go to Dashboard — check today\'s alerts and ramp bookings.', 1),
    numbered('Marina Operations → Boat Movements → Today view — see all scheduled arrivals and departures.', 2),
    numbered('Ramp & Launch → Today — see all ramp operations and tide windows.', 3),
    spacer(),
    para('For Finance staff at end of month:', true),
    numbered('Invoices → filter by Overdue — send reminders to overdue accounts.', 1),
    numbered('Reports → Monthly Revenue Report — generate for the past month.', 2),
    numbered('Reports → Customer Aging — review and escalate 60+ day accounts to management.', 3),
    spacer(),
    para('For Boat Yard Manager:', true),
    numbered('Boat Yard → Work Orders — filter by "In Progress" to see active jobs.', 1),
    numbered('Check "Waiting Parts" jobs — follow up on outstanding parts orders.', 2),
    numbered('"Overdue" badge on Dashboard shows jobs past estimated completion.', 3),
    spacer(),
    para('Using Global Search effectively:', true),
    bullet('Search by boat name (e.g., "Sundancer") — instantly finds the boat, owner, current location, and active jobs'),
    bullet('Search by invoice number (e.g., "INV-2026-00142") — goes directly to the invoice'),
    bullet('Search by customer phone number — finds customer even if you don\'t know their name'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Appendix B ───────────────────────────────────────────────────────────────

function appendixB() {
  return [
    h1('Appendix B: Common Troubleshooting'),
    hr(),

    h2('I Cannot Log In'),
    bullet('Verify you are using the correct email address (passwords are case-insensitive but email must match exactly)'),
    bullet('Check for trailing spaces in the password field'),
    bullet('Use "Forgot Password" to reset your password via email'),
    bullet('If you never received a welcome email, ask your Super Admin to re-send the invitation'),
    bullet('If the login page does not load, check your internet connection and try a different browser'),
    bullet('Clear browser cache: Ctrl+Shift+Delete in most browsers'),

    h2('A Page Shows an Error'),
    bullet('Refresh the page (F5 or Ctrl+R) — temporary errors often resolve on refresh'),
    bullet('Log out and log back in if the error persists'),
    bullet('Note the error message and report it to your Super Admin with: what page you were on, what you were trying to do, and the exact error message'),
    bullet('Super Admin can check Vercel logs for technical details'),

    h2('I Cannot Find a Customer / Boat / Invoice'),
    bullet('Try searching by different fields (phone instead of name, email instead of company)'),
    bullet('Check if the record was accidentally filtered out — click "Clear Filters" on the list page'),
    bullet('The record may be "Inactive" — check the Status filter and set it to "All"'),
    bullet('If you are certain the record should exist, ask your Super Admin to check the audit log'),

    h2('A Photo / Document Will Not Upload'),
    bullet('Check the file size — maximum is 20 MB per file'),
    bullet('Check the file format — accepted formats are JPG, PNG, PDF, and DOCX'),
    bullet('Try a different browser'),
    bullet('On mobile, ensure the app has permission to access your camera/photos'),
    bullet('If uploading from mobile on a slow marina WiFi connection, try again or use the office computer'),

    h2('Tide Calculation Shows "No Tide Data Available"'),
    bullet('Tide data must be uploaded for the requested date range'),
    bullet('Go to Settings → Ramp Configuration → Tide Data → check that tide data covers the required dates'),
    bullet('Contact your Super Admin to upload the tide table if the data is missing'),
    bullet('The Thai Meteorological Department (TMD) provides tide prediction data for Ko Samui and other Thai coastal areas'),

    h2('An Invoice Was Created with the Wrong Amount'),
    bullet('If the invoice is in Draft status: open the invoice → click Edit → correct the amounts → save.'),
    bullet('If the invoice has been Issued but not yet paid: open the invoice → Actions → Cancel Invoice → create a new correct invoice. The cancellation is logged in the audit trail.'),
    bullet('If the invoice has been Partially Paid: contact your Super Admin — corrections require a credit note or manual adjustment reviewed by Finance management.'),
    warningBox('Never delete an issued invoice — always cancel it and create a replacement. Deletion breaks the audit trail.'),

    h2('A Work Order Will Not Move to "In Progress" Status'),
    bullet('Verify the quotation is in "Accepted" status (not just "Sent")'),
    bullet('Check that any required deposit has been recorded (if deposit is required per Settings)'),
    bullet('Verify the customer approval is on record (check Work Order → Completion tab)'),
    bullet('If a manager override is needed, a Marina Manager or Boat Yard Manager can override with a note'),
    spacer(240),
    hr(),
    spacer(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Document prepared for Ocean Rover Marina & Boat Yard Management System', font: 'Arial', size: 18, color: GREY, italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'URL: https://marina-mms.vercel.app  |  GitHub: https://github.com/lermrover-hub/marina-mms', font: 'Arial', size: 18, color: GREY, italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Version 1.0 — May 2026', font: 'Arial', size: 18, color: GREY, italics: true })],
    }),
  ];
}

// ─── Assemble document ────────────────────────────────────────────────────────

const children = [
  ...titlePage(),
  ...tocPage(),
  ...gettingStarted(),
  ...module1(),
  ...module2(),
  ...module3(),
  ...module4(),
  ...module5(),
  ...module6(),
  ...module7(),
  ...module8(),
  ...module9(),
  ...module10(),
  ...module11(),
  ...module12(),
  ...appendixA(),
  ...appendixB(),
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
            new TextRun({ text: 'Marina MMS — User Manual  |  Page ', font: 'Arial', size: 18, color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '888888' }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('C:\\marina-mms\\docs\\03-user-manual.docx', buf);
  const kb = (buf.length / 1024).toFixed(1);
  console.log(`03-user-manual.docx created — ${kb} KB`);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
