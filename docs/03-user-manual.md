# Marina MMS — User Manual
**Ocean Rover Marina & Boat Yard Management System**
Version 1.0 | May 2026

*คู่มือการใช้งานระบบบริหารงานมารีน่าและอู่เรือ*

---

## Getting Started / เริ่มต้นใช้งาน

### Accessing the System / เข้าสู่ระบบ

Open any modern web browser (Chrome, Firefox, Edge, or Safari) and navigate to:

**Production URL:** `https://marina-mms.vercel.app`

Or your marina's custom domain if configured, e.g., `https://marina.oceanrover.com`

The system works on desktop computers, tablets, and mobile phones. For daily operations in the yard and on the dock, a tablet or smartphone in landscape mode provides the best experience. No app installation is required — the web application is mobile-responsive and can be saved to your home screen as a Progressive Web App (PWA) for quick access.

### Login / เข้าสู่ระบบ

1. On the login page, enter your **Email address** and **Password**.
2. Click **Sign In** (or press Enter).
3. If you have forgotten your password, click **Forgot Password?** and follow the email reset instructions.
4. After successful login, you will be directed to the Dashboard.

**First login:** Your account is created by the Super Admin. You will receive a welcome email with a temporary password. Log in and change your password immediately via **Settings → My Profile → Change Password**.

**Session timeout:** For security, sessions expire after 8 hours of inactivity. You will be asked to log in again.

### Language / ภาษา

The system supports both **English** and **Thai (ภาษาไทย)**. To change the display language:
1. Click your profile picture or name in the top-right corner.
2. Select **Language** → choose **English** or **ภาษาไทย**.
3. The interface will refresh in the selected language.

### Navigation / การนำทาง

The system uses a **left sidebar navigation** with expandable menu sections. The sidebar can be collapsed on smaller screens by clicking the menu icon (☰) in the top-left corner.

**Top bar** contains:
- Search box (searches across customers, boats, invoices, work orders)
- Notification bell (shows alerts for overdue invoices, expiring insurance, pending approvals)
- User profile menu

**Main navigation sections:**
1. Dashboard / แดชบอร์ด
2. Customers / ลูกค้า
3. Boats / เรือ
4. Marina Operations / ปฏิบัติการมารีน่า
5. Ramp & Launch / ทางลาดและการนำเรือลง
6. Boat Yard / อู่เรือ
7. Quotations / ใบเสนอราคา
8. Invoices / ใบแจ้งหนี้
9. Payments / การชำระเงิน
10. Inventory / คลังสินค้า
11. Reports / รายงาน
12. Settings / การตั้งค่า

---

### User Roles and Permissions / บทบาทผู้ใช้งาน

Each user is assigned a role that determines which features they can access. The table below summarizes access levels:

| Role | Access Level | Typical User |
|---|---|---|
| **Super Admin** | Full access to all modules, settings, users, and data | System administrator, IT staff |
| **Managing Director** | Read-only executive dashboard, all reports, approve large discounts | Marina owner, MD |
| **Marina Manager** | Berth management, boat movements, ramp bookings, contracts, utility readings | Marina manager |
| **Boat Yard Manager** | Service requests, work orders, quotations, job tasks, job completion, contractor management | Boat yard manager |
| **Finance / Accounting** | Invoices, payments, receipts, statement of account, financial reports | Accountant |
| **Sales / Customer Service** | Customer CRM, quotations, inquiries, communication log | Sales staff |
| **Operation Supervisor** | Ramp checklists, operation logs, boat movements, launch/retrieval | Dock supervisor |
| **Technician** | View assigned tasks only, upload progress photos, log time, update task status | Boat yard technician |
| **Security / Gate** | View daily boat movement schedule, log boat movements, log visitor entry/exit | Security guard |
| **Customer** | Customer Portal only — own boats, own invoices, own service requests | Boat owner |

If you cannot see a feature described in this manual, your role may not have access to it. Contact your Super Admin to adjust permissions.

---

## Module 1: Dashboard / แดชบอร์ด

### Overview

The Dashboard is the first page you see after logging in. It provides a real-time overview of the marina's key performance indicators (KPIs), alerts, and current operational status. The dashboard adapts its content based on your role — a Marina Manager sees different information than a Finance staff member.

### KPI Cards (Key Performance Indicators)

The top row of the Dashboard displays summary cards. Each card shows the current value, a comparison to the previous period, and a trend indicator (green upward arrow = improving, red downward arrow = declining).

**Revenue Cards:**
- **Total Revenue This Month** — Sum of all paid and partially paid invoices for the current calendar month, shown in Thai Baht (THB)
- **Outstanding Invoices** — Total value of all issued invoices not yet fully paid
- **Overdue Invoices** — Total value of invoices past their due date — shown in red if non-zero

**Occupancy Cards:**
- **Wet Berth Occupancy** — Percentage of wet berths currently occupied (e.g., 82% = 41/50 berths in use)
- **Dry Storage Occupancy** — Percentage of dry storage slots currently occupied
- **Available Berths** — Count of berths currently available for new customers

**Operations Cards:**
- **Open Work Orders** — Number of repair/service jobs currently in progress
- **Overdue Jobs** — Work orders past their estimated completion date — urgent attention required
- **Ramp Bookings Today** — Number of launch/retrieval operations scheduled for today

**Customer Cards:**
- **Active Customers** — Total customers with active contracts or recent activity
- **Pending Quotations** — Quotations sent to customers awaiting their response
- **New Service Requests** — Uninspected service requests requiring attention

### Alerts Panel

Below the KPI cards, the **Alerts** panel shows time-sensitive notifications requiring action:

- **Insurance Expiring Soon** — Boats whose insurance expires within 30/60/90 days. Click to view the boat and contact the owner.
- **Contract Renewal Due** — Berth contracts expiring within 60 days
- **Overdue Invoices** — Individual invoice alerts with customer name and amount
- **Pending Approvals** — Quotations awaiting manager approval before sending to customers
- **Low Stock Alert** — Inventory items below minimum stock level

Click any alert to navigate directly to the relevant record. Dismiss resolved alerts using the checkbox.

### Charts Section

**Revenue by Month (Bar Chart)** — Displays monthly revenue for the past 12 months, with breakdown by business unit (Wet Berth, Dry Storage, Ramp Service, Boat Repair, Other). Hover over bars to see exact figures.

**Berth Occupancy Trend (Line Chart)** — Shows occupancy percentage over the past 6 months for both Wet Berths and Dry Storage. Useful for spotting seasonal patterns and planning marketing campaigns.

**Job Status Distribution (Donut Chart)** — Shows current work orders broken down by status (In Progress, Waiting Parts, Waiting Customer Approval, etc.). Helps the Boat Yard Manager prioritize attention.

**Top Customers by Revenue (Table)** — Lists the top 10 customers by revenue in the current year. Click a customer name to go to their profile.

### Quick Actions

The Dashboard includes quick-action buttons for the most common tasks:
- **+ New Customer** — Opens customer creation form
- **+ New Ramp Booking** — Opens ramp booking calendar
- **+ New Service Request** — Opens service request form
- **+ New Invoice** — Opens invoice creation

---

## Module 2: Customers / ลูกค้า

### 2.1 Customer List

The Customer List page shows all customers registered in the system. By default, it shows active customers sorted by name.

**Search:** Type a customer's name, phone number, email, or company name in the search box at the top. The list filters in real time.

**Filters:** Click **Filters** to expand filter options:
- Customer Type (Private Owner, Charter Operator, Speedboat Operator, Yacht Broker, Contractor, Supplier)
- Status (Prospect, Active, Inactive, Blocked)
- Nationality
- Has overdue invoice (Yes/No)
- Has active contract (Yes/No)

**Column headers** in the table are clickable to sort ascending/descending. Default columns: ID, Name, Type, Phone, Email, Active Boats, Outstanding Balance, Status.

**Export:** Click **Export** to download the customer list as Excel (.xlsx) or CSV.

### 2.2 Creating a New Customer

1. On the Customer List page, click **+ New Customer** (top right).
2. Fill in the customer form. Required fields are marked with a red asterisk (*):
   - **Customer Type*** — Select from dropdown. This affects available fields and billing rules.
   - **Full Name*** — Individual's name, or blank if company
   - **Company Name** — Fill if type is charter operator, company, etc.
   - **Nationality** — Select from dropdown (default: Thai)
   - **Phone*** — Primary contact number
   - **Email** — Used for login (Customer Portal) and notifications
   - **Address** — Full mailing address
   - **Tax ID / Passport No.** — For invoice tax compliance (Thai nationals: 13-digit Tax ID; foreigners: Passport number)
   - **Preferred Language** — Thai or English (affects document templates generated for this customer)
   - **Emergency Contact** — Name and phone of emergency contact person
   - **Billing Contact** — If different from the primary contact (useful for yacht brokers or companies where billing goes to accounts department)
   - **Payment Terms** — Net 7, Net 15, Net 30, or Immediate (affects invoice due date calculation)
   - **Credit Limit** — Maximum outstanding balance allowed (set to 0 for prepayment required)
   - **Internal Notes** — Private notes visible only to staff (not shown in customer portal)
   - **Risk Flag** — Check if this customer has a history of late payment or disputes (adds a warning banner on their profile)
3. Click **Save Customer**. The customer profile page opens.

### 2.3 Customer Profile Page

The Customer Profile page is the central hub for all information about a customer. It is divided into tabs:

**Summary Tab (default view):**
- Customer details overview card with name, type, contact info, status
- Financial summary: Total billed (lifetime), Total paid, Outstanding balance, Credit limit vs used
- Active contracts badge (if any)
- Risk flag warning banner (if flagged)
- Quick action buttons: New Quotation, New Invoice, New Service Request, Send Message

**Boats Tab:**
- Lists all boats registered to this customer
- Each row shows: Boat name, type, current location, insurance status, quick link to boat profile
- **+ Add Boat** button to register a new boat for this customer

**Contracts Tab:**
- All active and historical berth/storage contracts
- Contract number, type, berth/slot assigned, start date, end date, monthly fee, status
- Click contract to view full terms or renew

**Quotations Tab:**
- All quotations created for this customer
- Status badges: Draft, Sent, Accepted, Rejected, Expired, Converted
- Click to open quotation detail

**Invoices Tab:**
- All invoices for this customer
- Shows invoice number, date, amount, paid amount, balance, status (color-coded)
- Click to open invoice detail

**Payments Tab:**
- All payment records from this customer
- Date, amount, method, linked invoice, receipt number

**Service History Tab:**
- All service requests and work orders, past and present
- Date, job type, description, status, amount billed
- Click any job to see full work order detail

**Documents Tab:**
- Uploaded files: boat insurance, registration documents, signed contracts, ID copies
- Upload area with drag-and-drop support
- Supported formats: PDF, JPG, PNG (max 20 MB per file)

**Communication Log Tab:**
- Record of all interactions with the customer
- Manually add notes (phone calls, in-person visits, WhatsApp messages)
- System automatically logs: quotation sent, invoice sent, payment confirmed, quote approved

### 2.4 Editing a Customer

1. Open the customer profile.
2. Click **Edit** (pencil icon, top right of the summary card).
3. Modify any fields as needed.
4. Click **Save Changes**.
5. Changes are logged in the audit trail.

### 2.5 Customer Status Management

To change a customer's status:
- **Active** → **Inactive:** Used when a customer has moved their boat out and has no active contracts. They remain in the system for history.
- **Active** → **Blocked:** Used when a customer has unresolved disputes, unpaid overdue invoices, or other issues. A blocked customer cannot be linked to new quotations or contracts until unblocked by a manager.
- To change status: customer profile → **Actions** menu → **Change Status** → select new status → add a reason note.

---

## Module 3: Boats / เรือ

### 3.1 Boat List

The Boat List displays all registered boats. Filter by:
- Boat type (Speed Boat, Motor Yacht, Sailing Yacht, Catamaran, Power Catamaran, RIB, Other)
- Current status (Active, In Storage, In Water, In Repair, Moved Out)
- Current location (Wet Berth, Dry Storage, In Water, Repair Yard, etc.)
- Owner nationality
- Insurance expiry (Expiring within 30/60/90 days, Already expired)

### 3.2 Registering a New Boat

1. Click **+ New Boat** from the Boat List or from a customer's profile.
2. If creating from the Boat List, you will be asked to search for and select the owner first.
3. Fill in the boat details form:

**Basic Information:**
- **Boat Name*** — The name displayed on the hull
- **Owner*** — Link to customer profile (auto-filled if creating from customer profile)
- **Boat Type*** — Speed Boat, Motor Yacht, Sailing Yacht, Catamaran, Power Catamaran, RIB, Fishing Boat, Other
- **Usage Type** — Private, Charter, Racing, Commercial
- **Brand / Builder** — e.g., Sunseeker, Azimut, Beneteau, Sea Ray
- **Model** — e.g., Predator 57, Azimut 50
- **Year Built** — 4-digit year

**Registration:**
- **Registration Number** — Official boat registration number (ทะเบียนเรือ)
- **Hull Number / HIN** — Hull Identification Number (found on transom)
- **Flag / Country of Registration** — Thailand, UK, BVI, Cayman Islands, etc.

**Dimensions (critical for berth assignment and ramp operations):**
- **LOA (Length Overall, meters)*** — Total length from bow to stern
- **Beam (meters)*** — Maximum width
- **Draft (meters)*** — Depth below waterline. **This field is used in tide safety calculations — must be accurate**
- **Air Draft (meters)** — Height above waterline (for bridges and covered storage)
- **Weight / Displacement (kg or tonnes)** — For crane and travel lift operations

**Hull and Engine:**
- **Hull Material** — Fiberglass, Aluminum, Steel, Wood, Carbon Fiber
- **Engine Type** — Inboard, Outboard, Sterndrive, Sail (no engine)
- **Engine Brand/Model** — e.g., Volvo Penta IPS, Yanmar, Mercury
- **Number of Engines** — 1, 2, 3, 4+
- **Fuel Type** — Diesel, Petrol, Electric, Hybrid

**Handling:**
- **Trailer Required** — Yes/No (if Yes, specify trailer type)
- **Cradle / Support Type** — Type of keel support needed for dry storage
- **Special Handling Instructions** — Any critical notes for yard staff (e.g., "Keel bolts exposed — use flat pads", "Twin rudders — support carefully", "Retractable keel — must be lowered before travel lift")

**Documents and Insurance:**
- **Insurance Provider** — Name of insurance company
- **Insurance Policy Number**
- **Insurance Expiry Date** — The system will send alerts 90/60/30 days before expiry

4. Click **Save Boat**. The boat profile page opens.

### 3.3 Boat Profile Page

The Boat Profile page shows all information about a single boat. Tabs include:

**Summary Tab:**
- Current location badge (color-coded by location type)
- Physical dimensions summary card
- Owner contact information with quick links
- Insurance status (green = valid, orange = expiring soon, red = expired)
- Status badges for any active work orders or bookings

**Technical Data Tab:**
- Full detailed specifications: all dimensions, materials, engine data
- Edit button for updating technical data (Marina Manager or Boat Yard Manager role required)

**Current Location Tab:**
- Shows the exact berth/slot or location
- Move boat button (creates a boat movement log)
- Location history — timeline of all locations this boat has been in

**Service History Tab:**
- All past and current work orders, sorted by date
- Summary: job type, dates, cost, status
- Click any job to see full work order

**Documents Tab:**
- Registration certificate, insurance certificate, survey reports
- Upload new documents with category labels
- Documents with expiry dates show countdown badges

**Photos Tab:**
- Photo gallery of the boat
- Categories: General, On Arrival, In Storage, After Repair, Customer Supplied
- Upload photos (JPG/PNG, max 20 MB each)

**Quotations and Invoices Tab:**
- All financial records linked to this boat

### 3.4 Boat Location Rules

Every boat must have exactly one active location at all times. The system enforces this:

- When a boat is first registered, it starts with location **"Pending Arrival"**
- When it arrives, staff log it into its assigned berth/slot — this creates a movement log entry
- To move a boat, use the **Move Boat** function which: closes the old location, creates a movement log, and opens the new location
- Photos are required for major movements (arrival, departure, entering yard for repair)

If a boat's location is incorrect (e.g., data entry error), only a Marina Manager or Super Admin can correct it using the **Override Location** function, which is logged in the audit trail.

---

## Module 4: Marina Operations / ปฏิบัติการมารีน่า

### 4.1 Berth Map

The Berth Map is a visual, interactive layout of your marina's wet berths.

**How to read the map:**
- Each berth is displayed as a rectangle with its berth number
- Color coding: **Green** = Available, **Blue** = Occupied (active contract), **Orange** = Reserved, **Grey** = Maintenance, **Red** = Overdue Payment Hold
- Hover over a berth to see a tooltip: berth number, dimensions (length × beam), current occupant (if any), contract expiry
- Click a berth to open its detail panel on the right

**Berth Detail Panel** (right side when a berth is selected):
- Berth number, dimensions, maximum LOA/Beam/Draft
- Current occupant: boat name, owner, contract end date
- Quick actions: Assign new boat, View contract, Mark as maintenance
- History: previous occupants

**Filtering the map:**
- Show only available berths (for checking availability for a prospective customer)
- Filter by minimum length to find berths that can fit a specific boat
- Filter by section/zone (if your marina is divided into zones)

### 4.2 Dry Storage Map

Similar to the Berth Map but for land-based dry storage slots. Shows:
- Grid layout of storage rack or yard positions
- Maximum boat dimensions for each slot
- Current occupant details
- Slot reservation and availability status

For dry storage, additional information includes:
- **Row/Bay/Level** — Position identifier for multi-level rack storage
- **Forklift access** — Whether a forklift can reach this position
- **Cover** — Whether the slot is covered or open-air

### 4.3 Berth Assignment

To assign a boat to a berth or storage slot:

1. Navigate to **Marina Operations** → **Berth Assignment** or click on a berth in the map.
2. Click **Assign Boat**.
3. Search for the customer or boat.
4. Select the boat from the dropdown.
5. Select the berth/slot from the available options (system only shows berths that can accommodate the boat's dimensions).
6. Set the start date and if applicable, end date (for short-term bookings).
7. Link to a contract (if a contract exists, this field will auto-populate).
8. Upload arrival photos (required for insurance and condition record).
9. Click **Confirm Assignment**.

The boat's current location is updated, a movement log entry is created, and the berth status changes to Occupied.

### 4.4 Boat Movements

The Boat Movement Log records every time a boat moves between locations. This is critical for:
- Insurance purposes (condition documentation)
- Knowing where every boat is at all times
- Billing (knowing when a boat was in storage vs. in water)

**Logging a movement:**
1. **Marina Operations** → **Boat Movements** → **+ New Movement**.
2. Select the boat.
3. Select movement type: Arrival, Departure, Move to Repair Yard, Move to Storage, Move to Water, Move to Waiting Area, Internal Move.
4. Set date and time.
5. From location and To location are auto-filled based on current location; adjust if needed.
6. Upload before/after photos (required for all major movements).
7. Add notes for special circumstances.
8. Assign staff member responsible for the movement.
9. Click **Log Movement**.

**Daily movement schedule:** The Boat Movements page has a **Today** view showing all planned movements for today — arrivals, departures, and ramp operations. This is the primary screen for Operation Supervisors and Security staff each morning.

### 4.5 Contracts

Marina contracts define the terms of a berth or storage rental agreement.

**Creating a new contract:**
1. **Marina Operations** → **Contracts** → **+ New Contract**.
2. Select customer and boat.
3. Select berth or storage slot.
4. Contract type: Monthly, Annual, Short-term, Custom Period.
5. Enter contract dates: start date and end date (or open-ended for month-to-month).
6. Pricing: the monthly rate (auto-filled from pricing rules for the berth type, but can be overridden with manager approval).
7. Services included: list any included services (water, electricity, security, etc.).
8. Payment terms: when payment is due each month (e.g., 1st of month, on anniversary date).
9. Deposit required: amount of security deposit.
10. Special terms: any custom clauses agreed with the customer.
11. Click **Save Contract** to create in Draft status.
12. Review and click **Activate Contract** to make it active.
13. Optional: click **Generate Contract PDF** to produce the official contract document for signature.

**Renewing a contract:** Open the existing contract → click **Renew** → confirm new end date and updated pricing → click **Confirm Renewal**. The old contract is closed and a new one is created.

**Terminating a contract:** Open the contract → **Actions** → **Terminate Contract** → enter termination date and reason → click **Confirm Termination**. The berth/slot becomes available after the termination date. Note: outstanding invoices and deposit refund must be handled separately through the Billing module.

### 4.6 Utility Meter Readings

For berths with water and electricity meters, record readings monthly for billing purposes.

**Recording a meter reading:**
1. **Marina Operations** → **Utility Readings** → **+ New Reading**.
2. Select berth.
3. Enter date of reading (typically end of month).
4. Enter electricity meter reading (kWh) — current value, not consumption.
5. Enter water meter reading (cubic meters or liters) — current value.
6. System calculates consumption = current reading − previous reading.
7. System calculates charge = consumption × unit rate (from pricing settings).
8. Upload a photo of the meter reading (recommended for dispute prevention).
9. Click **Save Reading**.

The utility charges are automatically added to the next invoice generation for that berth contract. If readings are not entered by the billing date, the system will alert the Finance team.

---

## Module 5: Ramp & Launch / ทางลาดและการนำเรือลง

### 5.1 Ramp Booking Calendar

The Ramp Booking Calendar shows a weekly view of all scheduled ramp operations: launches, retrievals, dry-out washes, fueling, and other ramp-based activities.

**Viewing the calendar:**
- Navigate with the left/right arrows to move between weeks.
- Color codes: **Blue** = Launch, **Orange** = Retrieval, **Green** = Confirmed, **Yellow** = Pending Tide Check, **Red** = Cancelled.
- Click any booking to see its details on the right panel.

**Today's operations view:** Click the **Today** button to see a simplified list view of today's ramp operations with timing, crew assignment, and status.

### 5.2 Creating a Ramp Booking

1. **Ramp & Launch** → **+ New Booking** or click **+** on a time slot in the calendar.
2. Fill in the booking form:

**Basic Details:**
- **Customer*** — Search and select customer
- **Boat*** — Select from customer's registered boats (dimensions auto-fill)
- **Operation Type*** — Launch, Retrieval, Move to Water, Move to Storage, Dry-out Wash, Fuel
- **Requested Date*** — Preferred date for the operation
- **Requested Time** — Preferred time (may be adjusted based on tide)
- **Notes** — Any special requests from the customer

**After selecting the boat, the system auto-fills from boat profile:**
- Boat Draft (meters)
- Boat Weight (kg)
- Boat LOA and Beam (for trailer selection)

### 5.3 Tide Safety Calculation

This is one of the most important features of the Ramp module. The system checks whether the tide level on the requested date will be safe for the operation.

**How the calculation works:**

The key formula is:
```
Minimum Required Tide Table Height = 
  (Boat Draft + Trailer Frame Height + Safety Clearance) - Ramp Depth Offset
```

In the booking form:
1. **Boat Draft** — Auto-filled from boat profile (e.g., 1.20 m for a motor yacht)
2. **Trailer / Support Frame Height** — Height of the trailer or keel support blocks above the ramp surface. Default is 0.50 m for standard trailers. Adjust if using custom cradles.
3. **Safety Clearance** — Additional buffer for safety. Default is 0.30 m. Can be increased by the Operation Supervisor for heavy or deep-draft vessels.
4. **Ramp Depth Offset** — The depth of the end of the ramp relative to chart datum (sea level at lowest tide). Default is **-1.00 m** (meaning the ramp end is 1 meter below the lowest recorded tide). This value is configured in **Settings → Ramp Configuration** and should be verified by a marine surveyor.

**Example calculation:**
- Boat Draft: 1.20 m
- Trailer Frame Height: 0.50 m
- Safety Clearance: 0.30 m
- Ramp Depth Offset: -1.00 m
- **Minimum Required Tide Height = (1.20 + 0.50 + 0.30) − (−1.00) = 2.00 + 1.00 = 3.00 m**

This means the predicted tide height must be at least **3.00 meters** above chart datum for the operation to be safe.

**Tide Results Table:**

After entering the boat and ramp parameters, click **Calculate Safe Times**. The system queries the tide prediction database and returns a table for the requested date:

| Time | Predicted Tide Height | Status |
|---|---|---|
| 06:00 | 1.85 m | NOT SAFE |
| 07:00 | 2.34 m | NOT SAFE |
| 08:00 | 2.89 m | NOT SAFE |
| 09:00 | 3.12 m | **SAFE** |
| 10:00 | 3.45 m | **SAFE** |
| 11:00 | 3.21 m | **SAFE** |
| 12:00 | 2.87 m | NOT SAFE |

The system automatically highlights the **Earliest Safe Time** (09:00 in the example above) and the **Safe Time Window** (09:00–11:00).

**Operational Warning (displayed on screen and printed on the booking confirmation):**

> Important: Tide predictions are based on astronomical calculations and may differ from actual sea level conditions due to weather, wind direction, barometric pressure, and sea state. Actual sea level may be higher or lower than predicted. Final operational safety confirmation must be assessed on the day of operation by the supervising staff member.

**Booking confirmation:** After reviewing the tide window, the Operation Supervisor selects the confirmed time, assigns crew, assigns trailer, and clicks **Confirm Booking**. The customer receives a booking confirmation email.

### 5.4 Operation Checklists

For each launch and retrieval, staff must complete a pre-operation checklist and post-operation checklist.

**Pre-Launch Checklist:**
- [ ] Tide level verified safe by on-site staff
- [ ] Boat documentation on file and valid (insurance not expired)
- [ ] Trailer/cradle appropriate for this boat type
- [ ] All crew briefed on boat handling
- [ ] Engine kill switch and safety equipment checked
- [ ] Fuel level noted
- [ ] Before photos taken (boat, trailer, ramp area)
- [ ] Customer/representative present or authorization confirmed

**Post-Launch Checklist:**
- [ ] Boat successfully launched — no damage during operation
- [ ] Boat location updated in system (moved to In Water status)
- [ ] Trailer returned to storage
- [ ] After photos taken
- [ ] Ramp area cleared
- [ ] Operation log completed
- [ ] Invoice generated if pay-per-launch billing applies

Access checklists from the booking detail page → **Checklists** tab → select Pre-Operation or Post-Operation → tick items and click **Submit Checklist**.

---

## Module 6: Boat Yard / อู่เรือ

### 6.1 Service Requests

A Service Request is how a repair or service job starts. It can be created by:
- Staff on behalf of a customer (phone call, walk-in)
- Customer through the Customer Portal (they submit it themselves)

**Creating a Service Request:**
1. **Boat Yard** → **Service Requests** → **+ New Request**.
2. **Customer*** — Search and select.
3. **Boat*** — Select from customer's boats.
4. **Service Type*** — Engine, Electrical, Fiberglass, Painting, Antifouling, Interior, Canvas, Stainless/Metal Work, Cleaning/Detailing, Plumbing, Generator, Air Conditioning, Annual Service, Survey, Other.
5. **Priority** — Low, Normal, High, Urgent.
6. **Description** — Detailed description of the problem or service needed. More detail helps the quotation be more accurate.
7. **Boat Current Location** — Where is the boat now? (auto-filled from boat profile)
8. **Requested Start Date** — When does the customer want the work to start?
9. **Upload Photos** — Customer can submit photos of the problem (great for initial assessment without the boat being present).
10. Click **Submit Request**.

The service request is created in **New Request** status. The Boat Yard Manager receives a notification and will review it.

### 6.2 Inspection

Before creating a quotation for complex jobs, an inspection is recorded.

**Recording an inspection:**
1. Open the service request → click **Record Inspection**.
2. **Inspector*** — Select the staff member who performed the inspection.
3. **Inspection Date*** — When was the boat inspected?
4. **Findings** — Detailed technical findings for each area:
   - Hull condition
   - Engine/mechanical condition
   - Electrical system condition
   - Interior condition
   - Osmosis/blistering observations
   - Other findings
5. **Recommended Work** — Based on inspection, list recommended actions.
6. **Estimated Scope** — Rough estimate of work scope (full details come in quotation).
7. **Photos** — Upload inspection photos (these become the "Before" photos in the job record). Photograph all areas of concern.
8. Click **Save Inspection**.

The service request status moves to **Inspection Recorded**. The Boat Yard Manager can now create a quotation.

### 6.3 Work Orders

A Work Order is created from an accepted quotation and represents the approved, active repair job.

**Work Order Detail Page — Tabs:**

**Scope of Work Tab:**
- Summary of all approved work items from the quotation
- Job categories and descriptions
- Approved total value
- Any changes or additional work (variations) added after approval

**Task List Tab:**
- Individual job tasks broken down from the scope of work
- Each task has: task name, assigned technician, estimated hours, status, notes
- Task statuses: To Do, In Progress, Waiting (parts/contractor/customer), Completed, Verified
- **+ Add Task** button for adding tasks discovered during the job
- Drag-and-drop reordering

**Technician Assignment Tab:**
- Current technician assignments per task
- Timesheet entries: date, technician, hours worked, task, notes
- **+ Log Time** button for technicians to log their hours

**Materials Tab:**
- Parts and materials issued to this job from inventory
- Each item: part number, description, quantity, unit cost, total cost, charged to customer (Yes/No)
- **+ Add Material** button links to inventory search
- System updates stock levels when materials are issued

**Contractors Tab:**
- External contractors assigned to specific tasks
- Contractor name, work description, quoted cost, actual cost, status
- **+ Add Contractor** button
- Contractor purchase orders can be generated here

**Photos Tab:**
- All photos for this job organized by category
- Categories: **Before**, **During Progress**, **After Completion**, **Defect Evidence**, **Parts Received**, **Customer Approval Photo**, **Completion Handover**
- Upload photos using the camera icon (mobile) or drag-and-drop (desktop)
- Each photo shows upload date, uploaded by, and category
- Photos are used in the completion report and handover documentation

**Costing Tab:**
- Real-time job costing based on logged timesheets and material usage:
  - Labor Revenue (from quotation)
  - Material Revenue (from quotation)
  - Contractor Revenue (from quotation)
  - Total Revenue (from quotation)
  - Actual Labor Cost (from timesheet hours × technician cost rate)
  - Actual Material Cost (from stock issue at cost price)
  - Actual Contractor Cost (from contractor invoices received)
  - **Gross Profit = Total Revenue − Total Actual Cost**
  - **Gross Margin % = Gross Profit / Total Revenue × 100**

**Completion Tab:**
- Final inspection sign-off
- Completion photos
- Warranty terms (if applicable)
- Customer handover notes
- Generate Completion Report button
- Close Work Order button (requires supervisor verification)

### 6.4 Work Order Status Flow

Work orders progress through statuses in a defined flow:

```
New Request
    ↓
Inspection Required → [Inspection recorded]
    ↓
Quotation Draft → [Quotation created]
    ↓
Quotation Sent → [Customer receives quotation]
    ↓
Waiting Customer Approval
    ↓
Waiting Deposit → [Customer approves] → [Deposit received]
    ↓
Approved → [Work Order created]
    ↓
In Progress → [Tasks underway]
    ↓
Waiting Parts ← → [Parts arrive] ← Waiting Contractor ← → [Contractor completes]
    ↓
Completed → [Supervisor inspection passed]
    ↓
Waiting Invoice → [Invoice generated]
    ↓
Closed ← [Invoice paid]
```

At each status change, the system logs who changed it, when, and optionally requires a note explaining the status change.

---

## Module 7: Quotations / ใบเสนอราคา

### 7.1 Quotation List

The Quotation List shows all quotations. Filter by status, customer, boat, date range, or quotation type (service, storage, ramp, contract).

Status color coding:
- **Grey** = Draft (not yet sent)
- **Blue** = Sent (awaiting customer response)
- **Green** = Accepted
- **Red** = Rejected or Expired
- **Purple** = Converted (turned into work order / invoice / contract)
- **Orange** = Pending Internal Approval

### 7.2 Creating a Quotation

1. **Quotations** → **+ New Quotation** or from a service request/customer profile.
2. **Link to Service Request** — If creating from a service request, this auto-links. Otherwise, leave blank for a standalone quotation.
3. **Customer*** and **Boat*** — Select customer and applicable boat.
4. **Quotation Type*** — Boat Repair, Berth/Storage, Ramp Service, Annual Service Package, Ad-hoc Service, Other.
5. **Valid Until*** — Expiry date (default: 30 days from today, configurable in Settings).
6. **Add Line Items** — Build the quotation line by line:
   - Click **+ Add Item** for each service or product
   - For each item: Description, Category (Labor/Material/Contractor/Service), Unit (hours/meters/units/lump sum), Quantity, Unit Price, Total (auto-calculated)
   - For repair quotations, you can also fill in the internal **Cost** column (not shown to the customer) — this is used for margin calculation
7. **Subtotal** — Calculated automatically.
8. **Discount** — Enter a discount amount or percentage. If the discount exceeds the threshold set in Settings (e.g., > 10%), the quotation automatically enters "Pending Internal Approval" status and a manager notification is sent.
9. **VAT** — Calculated at 7% by default (configurable in Settings). Check the "Include VAT" box.
10. **Grand Total** — Auto-calculated: Subtotal − Discount + VAT.
11. **Required Deposit** — Enter the deposit amount required before work begins (typically 50% for repair jobs).
12. **Notes to Customer** — Any conditions, scope limitations, exclusions, or notes to appear on the printed quotation.
13. **Internal Notes** — Private notes for staff (e.g., "Customer wants completion before July — prioritize", "Parts lead time 2 weeks").

**Saving and sending:**
- **Save as Draft** — Saves without sending. You can come back and edit it.
- **Request Approval** — If your role requires manager approval, this submits it for review. A manager will receive a notification.
- **Send to Customer** — Generates the quotation PDF and emails it to the customer's email address. You can preview the PDF before sending. The quotation status changes to Sent.

### 7.3 Customer Quotation Approval

When a customer receives a quotation, they can:
- **Via Customer Portal** — Log in, view the quotation, and click **Accept** or **Reject**. They must provide a digital signature for acceptance.
- **Via Email** — The quotation email contains Accept/Reject buttons that link back to the portal.
- **In Person** — Staff can mark the quotation as Accepted and note "Verbal approval" or upload a signed physical quotation.

### 7.4 Converting a Quotation

Once accepted, a quotation can be converted to:
- **Work Order** — For boat repair / service jobs
- **Invoice** — For simple billing (berth rental, ramp service)
- **Contract** — For ongoing berth or storage contracts

Click the **Convert** button on the accepted quotation and select the conversion type. All line items are carried over.

---

## Module 8: Invoices and Payments / ใบแจ้งหนี้และการชำระเงิน

### 8.1 Invoice List

The Invoice List shows all invoices sorted by date (newest first). Use filters to find:
- Status: Draft, Issued, Partially Paid, Paid, Overdue, Cancelled
- Customer
- Boat
- Date range
- Amount range

**Overdue invoices** are highlighted in red. The **Outstanding** view (default) shows only unpaid and partially paid invoices.

### 8.2 Creating an Invoice

Invoices can be created in three ways:

**1. From Quotation (most common for repairs):**
- Open accepted quotation → click **Convert to Invoice**
- All line items are transferred automatically
- Review and click **Issue Invoice**

**2. From Work Order Completion:**
- Open completed work order → **Actions** → **Generate Invoice**
- Line items built from approved scope of work
- Review and issue

**3. Manual Invoice:**
- **Invoices** → **+ New Invoice**
- Select customer and boat (if applicable)
- Add line items manually
- Set due date
- Add any reference (contract number, booking reference)
- Click **Save Draft** then **Issue Invoice**

**Invoice fields:**
- **Invoice Number** — Auto-generated (format: INV-YYYY-NNNNN, e.g., INV-2026-00142)
- **Invoice Date** — Today by default
- **Due Date** — Calculated from payment terms (e.g., Net 30 = today + 30 days)
- **Billing Address** — Auto-filled from customer profile
- **Tax ID** — Customer's tax ID for tax invoice compliance
- **Line Items** — Description, quantity, unit price, total per line
- **Subtotal, Discount, VAT, Grand Total** — Auto-calculated
- **Notes** — Payment instructions, bank details, any relevant notes

### 8.3 Sending an Invoice to the Customer

1. Open the issued invoice.
2. Click **Send Invoice**.
3. Review the PDF preview — this is exactly what the customer will receive.
4. Confirm the recipient email address (from customer profile, can be changed).
5. Click **Send**.
6. Status is now **Issued** and the sent timestamp is recorded.

Alternatively, click **Download PDF** to save the invoice PDF and send it via WhatsApp, email, or print and hand to the customer.

### 8.4 Recording a Payment

When a customer pays (by any method), record it immediately:

1. Open the invoice → click **Record Payment**.
2. **Payment Date*** — Date the payment was received (not the date you record it)
3. **Amount Received*** — If full payment, this matches the balance due; for partial payment, enter the amount received
4. **Payment Method*** — Cash, Bank Transfer, Credit Card, QR Payment, Cheque, Other
5. **Bank Account / Reference** — For bank transfer: bank name, account number last 4 digits, transfer reference number; for QR: QR transaction ID
6. **Upload Payment Slip** — Upload the bank transfer slip, QR receipt screenshot, or cheque scan. This is important for dispute resolution.
7. **Notes** — Any additional notes (e.g., "Customer paid in two transfers on same day")
8. Click **Confirm Payment**.

**What happens automatically:**
- Invoice status updates: if full amount → **Paid**; if partial → **Partially Paid**
- Outstanding balance recalculated
- Receipt is generated (available to print/download/email)
- Customer's outstanding balance on their profile is updated

### 8.5 Receipts

A receipt is automatically generated when a payment is confirmed. To view and send:
1. Open the payment record → click **View Receipt** or from the invoice page → **Payments** tab → click receipt icon.
2. Click **Send Receipt** to email it to the customer.
3. Click **Download PDF** to save or print.

Receipts include: receipt number, date, customer name, description of payment, amount received, payment method, remaining balance if any, and the signature of the recording staff member.

### 8.6 Handling Partial Payments

If a customer pays in installments (common for large repair jobs):
- Record each payment separately using **Record Payment** on the same invoice
- The invoice status shows **Partially Paid** with the remaining balance
- Each payment generates its own receipt
- The invoice is marked **Paid** only when the balance reaches zero

### 8.7 Overdue Invoices

The system automatically marks invoices as **Overdue** when the due date passes and the invoice is not fully paid. Finance staff receive daily alerts listing all overdue invoices.

**Following up on overdue invoices:**
1. **Invoices** → filter by **Overdue** status.
2. For each overdue invoice, you can: send a payment reminder email (pre-written template) by clicking **Send Reminder**, or note a phone call in the communication log.
3. For seriously overdue accounts, use **Customer** profile → **Actions** → **Place on Credit Hold** which blocks new quotations from being issued.

---

## Module 9: Inventory / คลังสินค้า

### 9.1 Inventory Item Master

The inventory master lists all parts, materials, and consumables used in boat repairs and marina operations.

**Adding a new inventory item:**
1. **Inventory** → **+ New Item**.
2. **Item Code** — Your internal part number (e.g., ENG-OIL-5W30-4L)
3. **Item Name** — Full descriptive name
4. **Category** — Engine Parts, Electrical, Fiberglass Materials, Paint, Antifouling, Stainless/Hardware, Cleaning Supplies, Safety Equipment, Other
5. **Unit** — How the item is measured (Liter, Piece, Meter, Kilogram, Set, Box)
6. **Minimum Stock Level** — When stock drops below this number, an alert is triggered
7. **Supplier** — Primary supplier (link to supplier record)
8. **Standard Cost** — Average purchase cost per unit
9. **Selling Price** — Price charged to customers when included in work order
10. **Chargeable to Customer** — Yes (most parts) or No (consumables like sandpaper absorbed into overhead)
11. Click **Save**.

### 9.2 Stock Movements

All stock movements (in, out, adjustments) are recorded.

**Receiving stock (Stock In):**
1. **Inventory** → **Stock Movements** → **+ Receive Stock**.
2. Select item.
3. Enter quantity received.
4. Enter supplier invoice reference.
5. Enter actual unit cost (may differ from standard cost — used to update average cost).
6. Enter receipt date.
7. Optionally link to a Purchase Order.
8. Click **Confirm Receipt**.

**Issuing stock to a work order (Stock Out):**
1. Open the Work Order → **Materials** tab → **+ Add Material**.
2. Search for item by name or code.
3. Enter quantity needed.
4. System shows current stock level and checks availability.
5. Click **Issue to Job**.
6. Stock level is reduced immediately.

**Stock adjustment:**
If a physical count reveals a discrepancy from the system:
1. **Inventory** → **Stock Adjustments** → **+ New Adjustment**.
2. Select item.
3. Enter the correct on-hand quantity.
4. System calculates the variance (e.g., System: 10, Physical Count: 8, Variance: -2).
5. Select reason: Damaged/Scrapped, Counting Error, Theft, Used and Not Recorded, Other.
6. Click **Save Adjustment**. The stock is updated and the adjustment is logged in the audit trail.

### 9.3 Low Stock Alerts

The Dashboard and Inventory module show alerts for items below minimum stock level. The Finance/Operations team should review these weekly and create purchase requests.

### 9.4 Purchase Requests and Orders

When stock needs to be ordered:
1. **Inventory** → **Purchase Requests** → **+ New Request**.
2. Select items needed and quantities.
3. Select preferred supplier.
4. Add urgency and notes.
5. Submit for approval.

After approval, Finance or the manager converts the purchase request to a **Purchase Order** which is sent to the supplier. When goods arrive, the Purchase Order is received and stock levels are updated.

---

## Module 10: Reports / รายงาน

### 10.1 Available Reports

Marina MMS includes the following management reports. Access via **Reports** in the left sidebar.

**Financial Reports:**

**Monthly Revenue Report** — Total revenue for a selected month broken down by: Wet Berth, Dry Storage, Ramp Service, Boat Repair, Parts/Materials, Other Services. Compared against the previous month and same month last year. Shows invoiced, collected, and outstanding amounts.

**Customer Aging Report** — Lists all customers with outstanding balances, grouped by how overdue they are: 0-30 days, 31-60 days, 61-90 days, 90+ days. Essential for Finance team's monthly collection follow-up.

**Outstanding Invoice Report** — All unpaid invoices with customer contact, invoice date, due date, and balance. Sortable by overdue days. Used for daily collection management.

**Revenue by Business Unit** — Tracks revenue contribution from each department over any time period. Useful for business planning.

**Operations Reports:**

**Wet Berth Occupancy Report** — Shows occupancy percentage for each month, which berths were vacant and for how long, average occupancy rate. Helps pricing and marketing decisions.

**Dry Storage Occupancy Report** — Same as above for dry storage.

**Boat Movement Report** — All launches, retrievals, and internal moves for a date range. Shows peak activity periods, most active boats, and staff utilization.

**Job Profitability Report** — For all completed work orders in a period: revenue, labor cost, material cost, contractor cost, gross profit, and gross margin percentage. Sortable by margin to identify most and least profitable job types. Essential for pricing decisions.

**Quotation Conversion Report** — Shows how many quotations were sent vs accepted vs rejected in each period. Calculates conversion rate and value. Helps Sales/Management understand sales effectiveness.

**Contractor Cost Report** — External contractor costs by job, contractor, and period. Useful for contractor performance review and budgeting.

**Inventory Usage Report** — Which parts/materials were used most, total cost per item, total revenue from materials. Used for procurement planning and pricing review.

**Safety and Compliance:**

**Safety Incident Report** — All logged incidents by type, severity, location, and resolution status. Required for compliance and insurance.

### 10.2 Generating and Exporting Reports

1. Navigate to **Reports** and select the desired report.
2. Set the date range (most reports offer: This Month, Last Month, This Quarter, This Year, Custom Range).
3. Apply any additional filters (e.g., specific customer, specific job category, specific berth zone).
4. Click **Generate Report**.
5. The report displays in the browser with charts and tables.
6. To export: click **Export** and choose format:
   - **PDF** — Formatted professional report, suitable for management presentation or email
   - **Excel (.xlsx)** — Raw data in spreadsheet format, suitable for further analysis in Excel
   - **CSV** — Plain data format for import into accounting software or custom analysis

### 10.3 Scheduled Reports

For key reports needed monthly (e.g., Monthly Revenue, Customer Aging), you can schedule automatic email delivery:
1. Open the report → click **Schedule**.
2. Set frequency: Daily, Weekly, Monthly, or a specific day of month.
3. Enter email recipients (can add multiple addresses).
4. Select format (PDF recommended for management reports).
5. Click **Save Schedule**.

Reports are generated and emailed automatically on schedule.

---

## Module 11: Customer Portal / พอร์ทัลลูกค้า

### 11.1 What the Customer Portal Is

The Customer Portal is a separate, secure view of the system for boat owners. Customers log in at the same URL (`https://marina-mms.vercel.app`) using their email and password. The system detects their role as "Customer" and shows only their own data — they cannot see any other customer's information.

### 11.2 Giving a Customer Portal Access

1. Open the customer profile.
2. Click **Actions** → **Invite to Customer Portal**.
3. Enter or confirm the customer's email address.
4. Click **Send Invitation**.
5. The customer receives a welcome email with a link to set their password.
6. Once they set a password, their portal is active.

Password reset: customers can use the "Forgot Password" link on the login page to reset their own password.

### 11.3 What Customers Can Do in the Portal

**My Boats:**
- View all registered boats with photos, specifications, current location, insurance expiry status
- Upload or update boat documents (insurance, registration)
- See current berth or storage location
- View service history for each boat

**Service Requests:**
- Submit a new service request — select their boat, describe the problem, upload photos
- Track the status of all existing service requests and work orders
- Receive notifications when status changes

**Ramp Booking:**
- Request a launch or retrieval
- See available time slots (showing confirmed safe tide windows)
- View history of past ramp operations
- Receive booking confirmations

**Quotations:**
- View all quotations issued to them
- Download quotation PDF
- **Approve** or **Reject** a quotation digitally with signature
- Request a revision (sends a message to the marina team)

**Invoices:**
- View all invoices in a clear, customer-friendly format
- Download invoice PDF
- See payment history and receipts
- Upload a payment slip/proof of transfer

**Documents:**
- Upload boat insurance, registration papers, survey reports, and any other documents
- These are visible to marina staff for compliance verification

**Messages / Inquiries:**
- Send a message to the marina team
- View message history and staff replies
- This replaces ad-hoc WhatsApp/email communication for record-keeping

### 11.4 Customer Portal Tips for Staff

- Encourage customers to use the portal for service requests instead of phone calls — this creates a written record of exactly what they asked for.
- The "Upload Payment Slip" feature reduces the manual work of chasing payment confirmations — customers can upload directly and Finance is notified.
- Quotation digital approval via the portal creates a legally documented acceptance with timestamp and IP address — better than verbal approval.
- Customers who have not yet been invited can still be managed entirely by staff internally; the portal is optional for customers.

---

## Module 12: Settings / การตั้งค่า

### 12.1 Company Profile

**Settings** → **Company Profile**

Fill in your marina's official information used on all documents:
- **Company Name** — Official registered name (e.g., "Ocean Rover Marina Co., Ltd.")
- **Company Name (Thai)** — Thai language name for Thai tax documents
- **Tax ID** — 13-digit Thai Tax ID for tax invoices
- **Address** — Full registered address
- **Phone, Email, Website**
- **Logo** — Upload your marina logo (PNG, minimum 300×300px, max 5 MB) — appears on all PDF documents
- **VAT Registration** — Check if VAT-registered; enter VAT ID
- **Default VAT Rate** — 7% (standard Thailand rate) — can be changed for special cases
- **Default Currency** — THB (configurable)
- **Date Format** — DD/MM/YYYY (Thai business standard)
- **Time Zone** — Asia/Bangkok

Click **Save Company Profile**.

### 12.2 Document Templates

Marina MMS generates professional PDF documents. Customize their appearance and content:

**Settings** → **Document Templates**

Available templates:
- **Quotation** — Layout for quotation PDFs sent to customers
- **Invoice / Tax Invoice** — Layout for standard invoice and VAT tax invoice
- **Receipt** — Layout for payment receipts
- **Work Order** — Layout for internal work order documents
- **Job Completion Report** — Layout for the handover document given to customers
- **Berth Contract** — Layout for berth rental agreements
- **Storage Contract** — Layout for dry storage agreements
- **Ramp Service Confirmation** — Layout for launch/retrieval booking confirmations

**Customizing a template:**
1. Click on the template name.
2. The template editor shows the current layout.
3. You can modify:
   - Header section: logo size/position, company name format, contact info layout
   - Color scheme: primary color (default: navy blue to match marina branding)
   - Footer text: payment terms, disclaimer text, signature lines
   - Language: templates can be set to English, Thai, or Bilingual (side by side)
4. Use the preview button to see how the template looks with sample data.
5. Click **Save Template**.

**Default language per customer:** Individual customers can have a preferred language set on their profile (Thai or English), and the system will use the appropriate template language automatically when generating their documents.

### 12.3 Pricing Rules

**Settings** → **Pricing**

Set default pricing for all service types. These prices auto-fill in quotations but can be overridden per quotation.

**Berth Pricing:**
- Pricing per meter LOA per month (e.g., ฿500/m/month for standard berths)
- Different rates for berth zones (A, B, C zones can have different rates)
- Short-term surcharge multiplier (e.g., 1.5× for less than 3 months)

**Dry Storage Pricing:**
- Pricing per meter LOA per month
- Power supply surcharge (for berths with power)
- Covered storage premium

**Ramp Service Pricing:**
- Launch fee: standard, under 30 ft, over 30 ft
- Retrieval fee
- Combined launch+retrieval discount
- Surcharge for after-hours operations

**Labor Rates:**
- Standard technician rate (THB per hour)
- Specialist rate (fiberglass, painting, electrical)
- Supervisor rate
- Emergency/outside-hours multiplier (e.g., 1.5×)

**Contractor Markup:**
- Default markup percentage on contractor invoices (e.g., 20%)

**Material Markup:**
- Default markup on materials used in jobs (e.g., 30%)

**Utility Rates:**
- Electricity: THB per kWh
- Water: THB per cubic meter

**VAT Settings:**
- Default: 7% (Thai VAT)
- Exempt categories (if any)

### 12.4 User and Permission Management

**Settings** → **Users**

**Creating a new user:**
1. Click **+ Invite User**.
2. Enter email address and full name.
3. Select **Role** from dropdown.
4. Click **Send Invitation**.
5. The user receives an email with a link to set their password.

**Editing user roles:**
1. Find the user in the list.
2. Click their name to open their profile.
3. Change role from dropdown.
4. Click **Save**.
5. Change takes effect immediately — user's current session is updated on next page load.

**Deactivating a user** (when staff leaves):
1. Open the user's profile.
2. Click **Deactivate Account**.
3. The user can no longer log in, but all their historical records remain.
4. This is preferable to deleting a user, as deletion would remove the "created by" attribution from their records.

**Permission customization:** While roles have default permissions, Super Admin can fine-tune individual permissions for any user via the **Permissions** tab on their user profile.

### 12.5 Email and Notification Settings

**Settings** → **Notifications**

Configure when the system sends automated emails and in-app notifications:

| Event | Notify | Default |
|---|---|---|
| New service request submitted | Boat Yard Manager | On |
| Quotation awaiting approval | Manager | On |
| Quotation approved by customer | Sales + Boat Yard Manager | On |
| Invoice issued | Customer (email) | On |
| Invoice overdue | Finance + Customer | On (3 days after due date) |
| Payment confirmed | Customer (receipt email) | On |
| Insurance expiring 90 days | Customer + Marina Manager | On |
| Insurance expiring 30 days | Customer + Marina Manager | On |
| Insurance expired | Customer + Marina Manager | On |
| Contract expiring 60 days | Customer + Marina Manager | On |
| Ramp booking confirmed | Customer | On |
| Work order status changed | Customer | On |
| Low stock alert | Inventory Manager | On |

Turn individual notifications on or off by toggling the switch. Adjust lead times for expiry warnings (e.g., change insurance warning to 60/30/7 days instead of 90/30).

### 12.6 Ramp Configuration

**Settings** → **Ramp Configuration**

- **Ramp Depth Offset** — Default: -1.00 m. This should be measured by a surveyor or determined from the ramp construction drawings. It represents the depth of the ramp end below chart datum.
- **Default Safety Clearance** — Default: 0.30 m. Minimum clearance between boat bottom and ramp/seafloor.
- **Default Trailer Frame Height** — Default: 0.50 m. Can be overridden per booking for custom cradles.
- **Tide Data Source** — Configure the tide data API or upload manual tide tables.

---

## Appendix A: Keyboard Shortcuts and Navigation Tips

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `/` | Focus the global search box |
| `Esc` | Close modal, cancel edit, or clear search |
| `Ctrl+S` / `Cmd+S` | Save the current form (in supported editors) |
| `Ctrl+Enter` | Submit form / confirm action |
| `Alt+N` | New record (on list pages) |
| `Alt+E` | Edit current record (on detail pages) |
| `Alt+←` | Go back to previous page |

### Time-Saving Tips for Daily Operations

**For operation staff starting the morning shift:**
1. Go to **Dashboard** — check today's alerts and ramp bookings
2. **Marina Operations** → **Boat Movements** → **Today view** — see all scheduled arrivals and departures
3. **Ramp & Launch** → **Today** — see all ramp operations and tide windows

**For Finance staff at end of month:**
1. **Invoices** → filter by **Overdue** — send reminders to overdue accounts
2. **Reports** → **Monthly Revenue Report** — generate for the past month
3. **Reports** → **Customer Aging** — review and escalate 60+ day accounts to management

**For Boat Yard Manager:**
1. **Boat Yard** → **Work Orders** — filter by "In Progress" to see active jobs
2. Check "Waiting Parts" jobs — follow up on outstanding parts orders
3. "Overdue" badge on Dashboard shows jobs past estimated completion

**Using Global Search effectively:**
- Search by boat name (e.g., "Sundancer") — instantly finds the boat, owner, current location, and active jobs
- Search by invoice number (e.g., "INV-2026-00142") — goes directly to the invoice
- Search by customer phone number — finds customer even if you don't know their name

---

## Appendix B: Common Troubleshooting

### I Cannot Log In

- Verify you are using the correct email address (passwords are case-insensitive but email must match exactly)
- Check for trailing spaces in the password field
- Use "Forgot Password" to reset your password via email
- If you never received a welcome email, ask your Super Admin to re-send the invitation
- If the login page does not load, check your internet connection and try a different browser
- Clear browser cache: Ctrl+Shift+Delete in most browsers

### A Page Shows an Error

- Refresh the page (F5 or Ctrl+R) — temporary errors often resolve on refresh
- Log out and log back in if the error persists
- Note the error message and report it to your Super Admin with: what page you were on, what you were trying to do, the exact error message
- Super Admin can check Vercel logs for technical details

### I Cannot Find a Customer / Boat / Invoice

- Try searching by different fields (phone instead of name, email instead of company)
- Check if the record was accidentally filtered out — click "Clear Filters" on the list page
- The record may be "Inactive" — check the Status filter and set it to "All" to see inactive records
- If you are certain the record should exist, ask your Super Admin to check the audit log for any accidental deletions

### A Photo / Document Will Not Upload

- Check the file size — maximum is 20 MB per file
- Check the file format — accepted formats are JPG, PNG, PDF, and DOCX
- Try a different browser
- On mobile, ensure the app has permission to access your camera/photos
- If uploading from mobile on a slow marina WiFi connection, try again or use the office computer

### Tide Calculation Shows "No Tide Data Available"

- Tide data must be uploaded for the requested date range
- Go to **Settings** → **Ramp Configuration** → **Tide Data** → check that tide data covers the required dates
- Contact your Super Admin to upload the tide table if the data is missing
- The Thai Meteorological Department (TMD) provides tide prediction data for Ko Samui and other Thai coastal areas

### An Invoice Was Created with the Wrong Amount

- If the invoice is in **Draft** status: open the invoice → click **Edit** → correct the amounts → save.
- If the invoice has been **Issued** but not yet paid: open the invoice → **Actions** → **Cancel Invoice** → create a new correct invoice. The cancellation is logged in the audit trail.
- If the invoice has been **Partially Paid**: contact your Super Admin — corrections to partially paid invoices require a credit note or manual adjustment which must be reviewed by Finance management.
- Never delete an issued invoice — always cancel it and create a replacement. Deletion breaks the audit trail.

### A Work Order Will Not Move to "In Progress" Status

- Verify the quotation is in "Accepted" status (not just "Sent")
- Check that any required deposit has been recorded (if deposit is required per Settings)
- Verify the customer approval is on record (check the Work Order → Completion tab)
- If a manager override is needed (e.g., customer approved verbally and deposit waived), a Marina Manager or Boat Yard Manager can override with a note

---

*Document prepared for Ocean Rover Marina & Boat Yard Management System*
*URL: https://marina-mms.vercel.app*
*GitHub: https://github.com/lermrover-hub/marina-mms*
*Version 1.0 — May 2026*
*For technical support, contact your system administrator or open an issue on GitHub.*
