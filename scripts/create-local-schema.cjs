/* eslint-disable @typescript-eslint/no-require-imports */
const {
  DatabaseSync,
} = require("node:sqlite");

const fs =
  require("node:fs");

const path =
  require("node:path");

const os =
  require("node:os");


function dataFolder() {
  return process.env.LOCALAPPDATA
    ? path.join(
        process.env.LOCALAPPDATA,
        "Djallows Farm",
        "data"
      )
    : path.join(
        os.homedir(),
        ".djallows-farm",
        "data"
      );
}


const folder =
  dataFolder();

const databasePath =
  path.join(
    folder,
    "djallows-farm.db"
  );


fs.mkdirSync(
  folder,
  {
    recursive: true,
  }
);


const db =
  new DatabaseSync(
    databasePath
  );


db.exec(`
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;


/* ==========================================================
   SYSTEM
========================================================== */

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS local_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  platform_role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS local_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id)
    REFERENCES local_users(id)
    ON DELETE CASCADE
);


/* ==========================================================
   BUSINESS
========================================================== */

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trading_name TEXT,
  location TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  letterhead_url TEXT,
  signature_url TEXT,
  stamp_url TEXT,
  currency TEXT NOT NULL DEFAULT 'GMD',
  ceo_name TEXT,
  business_type TEXT,
  tagline TEXT,
  established_year INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  phone TEXT,
  platform_role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS business_members (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TEXT NOT NULL,
  UNIQUE (
    business_id,
    user_id
  ),
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS business_user_access (
  business_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access_role TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  can_record_income INTEGER NOT NULL DEFAULT 1,
  can_record_expenses INTEGER NOT NULL DEFAULT 1,
  can_manage_contacts INTEGER NOT NULL DEFAULT 1,
  can_create_invoices INTEGER NOT NULL DEFAULT 1,
  can_view_reports INTEGER NOT NULL DEFAULT 1,
  can_manage_payroll INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (
    business_id,
    user_id
  ),
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS business_user_limits (
  business_id TEXT PRIMARY KEY,
  max_additional_users INTEGER NOT NULL DEFAULT 5,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


/* ==========================================================
   CATEGORIES / ACCOUNTS
========================================================== */

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL,
  parent_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS financial_accounts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  opening_balance REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


/* ==========================================================
   CONTACTS
========================================================== */

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  contact_type TEXT NOT NULL DEFAULT 'customer',
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  location TEXT,
  supplies TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


/* ==========================================================
   STAFF / PAYROLL
========================================================== */

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  employee_number TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  start_date TEXT,
  salary_type TEXT NOT NULL DEFAULT 'monthly',
  basic_salary REAL NOT NULL DEFAULT 0,
  payment_method TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  date_joined TEXT,
  date_left TEXT,
  pay_type TEXT,
  pay_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS payroll_runs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  payroll_month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_gross REAL NOT NULL DEFAULT 0,
  total_deductions REAL NOT NULL DEFAULT 0,
  total_net REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS payroll_entries (
  id TEXT PRIMARY KEY,
  payroll_run_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  basic_salary REAL NOT NULL DEFAULT 0,
  allowances REAL NOT NULL DEFAULT 0,
  overtime REAL NOT NULL DEFAULT 0,
  bonus REAL NOT NULL DEFAULT 0,
  salary_advance REAL NOT NULL DEFAULT 0,
  loan_deduction REAL NOT NULL DEFAULT 0,
  other_deductions REAL NOT NULL DEFAULT 0,
  gross_pay REAL NOT NULL DEFAULT 0,
  total_deductions REAL NOT NULL DEFAULT 0,
  net_pay REAL NOT NULL DEFAULT 0,
  account_id TEXT,
  payment_date TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (payroll_run_id)
    REFERENCES payroll_runs(id)
    ON DELETE CASCADE,
  FOREIGN KEY (employee_id)
    REFERENCES employees(id)
);


/* ==========================================================
   TRANSACTIONS / EXPENSES
========================================================== */

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  transaction_number TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  category_id TEXT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  account_id TEXT,
  destination_account_id TEXT,
  contact_id TEXT,
  reference_type TEXT,
  reference_id TEXT,
  payment_method TEXT,
  notes TEXT,
  created_by TEXT,
  tobaski_season_id TEXT,
  tobaski_quantity INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  expense_number TEXT NOT NULL,
  expense_date TEXT NOT NULL,
  category_id TEXT,
  supplier_id TEXT,
  description TEXT NOT NULL,
  quantity REAL,
  unit_price REAL,
  amount REAL NOT NULL,
  account_id TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


/* ==========================================================
   ITEMS
========================================================== */

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  default_price REAL,
  cost_price REAL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


/* ==========================================================
   INVOICES / RECEIPTS
========================================================== */

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_id TEXT,
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  balance_due REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_by TEXT,
  invoice_type TEXT DEFAULT 'sheep_sale',
  tobaski_season_id TEXT,
  document_kind TEXT NOT NULL DEFAULT 'invoice',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  item_id TEXT,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0,
  unit TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (invoice_id)
    REFERENCES invoices(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  receipt_number TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  customer_id TEXT,
  sale_id TEXT,
  invoice_id TEXT,
  account_id TEXT,
  amount REAL NOT NULL,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_by TEXT,
  transaction_id TEXT,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


/* ==========================================================
   SALES
========================================================== */

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  sale_number TEXT NOT NULL,
  customer_id TEXT,
  sale_date TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  balance_due REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  item_id TEXT,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (sale_id)
    REFERENCES sales(id)
    ON DELETE CASCADE
);


/* ==========================================================
   QUOTATIONS
========================================================== */

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  quotation_number TEXT NOT NULL,
  customer_id TEXT,
  quotation_date TEXT NOT NULL,
  expiry_date TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  item_id TEXT,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (quotation_id)
    REFERENCES quotations(id)
    ON DELETE CASCADE
);


/* ==========================================================
   CONSULTATION / ADVISORY
========================================================== */

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  contract_number TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'agreement',
  title TEXT NOT NULL,
  contact_id TEXT,
  party_name TEXT NOT NULL,
  party_phone TEXT,
  party_address TEXT,
  contract_date TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  contract_value REAL,
  purpose TEXT,
  terms TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


/* ==========================================================
   NUMBER SEQUENCES
========================================================== */

CREATE TABLE IF NOT EXISTS invoice_number_sequences (
  business_id TEXT NOT NULL,
  invoice_year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (
    business_id,
    invoice_year
  )
);


CREATE TABLE IF NOT EXISTS invoice_number_counters (
  business_id TEXT NOT NULL,
  invoice_year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (
    business_id,
    invoice_year
  )
);


CREATE TABLE IF NOT EXISTS advisory_number_sequences (
  business_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (
    business_id,
    year
  )
);


CREATE TABLE IF NOT EXISTS contract_number_sequences (
  business_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (
    business_id,
    year
  )
);


/* ==========================================================
   TOBASKI
========================================================== */

CREATE TABLE IF NOT EXISTS tobaski_seasons (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  season_name TEXT NOT NULL,
  season_year INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS tobaski_sheep_stock (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  tobaski_season_id TEXT NOT NULL,
  purchase_transaction_id TEXT,
  purchase_line_number INTEGER NOT NULL,
  stock_number TEXT NOT NULL,
  sheep_name TEXT,
  sheep_tag TEXT,
  breed_type TEXT,
  sex TEXT,
  purchase_date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE,
  FOREIGN KEY (tobaski_season_id)
    REFERENCES tobaski_seasons(id)
    ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS sheep_sale_details (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  customer_id TEXT,
  sale_id TEXT,
  invoice_id TEXT,
  sheep_name TEXT,
  sheep_tag TEXT,
  sex TEXT,
  date_of_birth TEXT,
  age_months_at_sale INTEGER,
  sale_date TEXT NOT NULL,
  sale_price REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  breed_type TEXT,
  sale_category TEXT,
  tobaski_season_id TEXT,
  tobaski_stock_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id)
    REFERENCES businesses(id)
    ON DELETE CASCADE
);


/* ==========================================================
   AUDIT
========================================================== */

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  user_id TEXT,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL,
  old_data TEXT,
  new_data TEXT,
  created_at TEXT NOT NULL
);


/* ==========================================================
   INDEXES
========================================================== */

CREATE INDEX IF NOT EXISTS idx_transactions_business_date
ON transactions (
  business_id,
  transaction_date
);


CREATE INDEX IF NOT EXISTS idx_expenses_business_date
ON expenses (
  business_id,
  expense_date
);


CREATE INDEX IF NOT EXISTS idx_invoices_business_date
ON invoices (
  business_id,
  invoice_date
);


CREATE INDEX IF NOT EXISTS idx_invoices_customer
ON invoices (
  customer_id
);


CREATE INDEX IF NOT EXISTS idx_payments_business_date
ON payments (
  business_id,
  payment_date
);


CREATE INDEX IF NOT EXISTS idx_contacts_business_name
ON contacts (
  business_id,
  name
);


CREATE INDEX IF NOT EXISTS idx_employees_business_name
ON employees (
  business_id,
  full_name
);


CREATE INDEX IF NOT EXISTS idx_contracts_business_date
ON contracts (
  business_id,
  contract_date
);
`);


/* ==========================================================
   UPDATE SCHEMA VERSION
========================================================== */

const now =
  new Date().toISOString();


db
  .prepare(`
    INSERT INTO app_meta (
      key,
      value,
      updated_at
    )
    VALUES (?, ?, ?)

    ON CONFLICT(key)
    DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `)
  .run(
    "schema_version",
    "2",
    now
  );


const tables =
  db
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)
    .all();


console.log("");
console.log(
  "DJALLOWS FARM LOCAL SCHEMA READY"
);

console.log("");
console.log(
  "Database:"
);

console.log(
  databasePath
);

console.log("");
console.log(
  "Tables created:"
);

console.log(
  tables.length
);

console.table(
  tables
);


db.close();
