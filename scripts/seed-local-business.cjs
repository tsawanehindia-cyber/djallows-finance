/* eslint-disable @typescript-eslint/no-require-imports */
const {
  DatabaseSync,
} = require("node:sqlite");

const {
  randomUUID,
} = require("node:crypto");

const fs =
  require("node:fs");

const path =
  require("node:path");

const os =
  require("node:os");


const BUSINESS_ID =
  "2ea46220-b539-4921-8750-3f582414aad6";

const EBRIMA_USER_ID =
  "7bcdb529-4bed-47e3-82b8-db38a345b547";


function getDataFolder() {

  if (
    process.env.LOCALAPPDATA
  ) {

    return path.join(
      process.env.LOCALAPPDATA,
      "Djallows Farm",
      "data"
    );
  }


  return path.join(
    os.homedir(),
    ".djallows-farm",
    "data"
  );
}


const dataFolder =
  getDataFolder();

const databasePath =
  path.join(
    dataFolder,
    "djallows-farm.db"
  );


fs.mkdirSync(
  dataFolder,
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
`);


const now =
  new Date().toISOString();


db.exec(
  "BEGIN TRANSACTION"
);


try {

  // ==========================================================
  // DJALLOWS FARM BUSINESS PROFILE
  // ==========================================================

  db
    .prepare(`
      INSERT INTO businesses (
        id,
        name,
        trading_name,
        location,
        phone,
        email,
        logo_url,
        letterhead_url,
        signature_url,
        stamp_url,
        currency,
        ceo_name,
        business_type,
        tagline,
        established_year,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )

      ON CONFLICT(id)
      DO UPDATE SET
        name = excluded.name,
        trading_name = excluded.trading_name,
        location = excluded.location,
        phone = excluded.phone,
        email = excluded.email,
        logo_url = excluded.logo_url,
        currency = excluded.currency,
        ceo_name = excluded.ceo_name,
        business_type = excluded.business_type,
        tagline = excluded.tagline,
        established_year = excluded.established_year,
        updated_at = excluded.updated_at
    `)
    .run(
      BUSINESS_ID,
      "Djallows Farm",
      "Djallows Farm",
      "Tujereng, The Gambia",
      "+220 789 3464",
      "eblasandson2@gmail.com",
      "/djallows-logo.png",
      null,
      null,
      null,
      "GMD",
      "Ebrima Jallow",
      "Sheep Breeding / Farming",
      "Success Through Sheep Farming",
      2017,
      now,
      now
    );


  // ==========================================================
  // EBRIMA PROFILE
  //
  // Password comes later.
  // No password is stored in this script.
  // ==========================================================

  db
    .prepare(`
      INSERT INTO user_profiles (
        id,
        username,
        full_name,
        phone,
        platform_role,
        is_active,
        must_change_password,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

      ON CONFLICT(id)
      DO UPDATE SET
        username = excluded.username,
        full_name = excluded.full_name,
        phone = excluded.phone,
        platform_role = excluded.platform_role,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
    `)
    .run(
      EBRIMA_USER_ID,
      "ebrima",
      "Ebrima Jallow",
      "+220 789 3464",
      "user",
      1,
      0,
      now,
      now
    );


  // ==========================================================
  // BUSINESS MEMBERSHIP
  // ==========================================================

  db
    .prepare(`
      INSERT OR IGNORE INTO business_members (
        id,
        business_id,
        user_id,
        role,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      randomUUID(),
      BUSINESS_ID,
      EBRIMA_USER_ID,
      "admin",
      now
    );


  // ==========================================================
  // FULL EBRIMA ACCESS
  // ==========================================================

  db
    .prepare(`
      INSERT INTO business_user_access (
        business_id,
        user_id,
        access_role,
        active,
        can_record_income,
        can_record_expenses,
        can_manage_contacts,
        can_create_invoices,
        can_view_reports,
        can_manage_payroll,
        created_by,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )

      ON CONFLICT(
        business_id,
        user_id
      )
      DO UPDATE SET
        access_role =
          excluded.access_role,

        active =
          excluded.active,

        can_record_income =
          excluded.can_record_income,

        can_record_expenses =
          excluded.can_record_expenses,

        can_manage_contacts =
          excluded.can_manage_contacts,

        can_create_invoices =
          excluded.can_create_invoices,

        can_view_reports =
          excluded.can_view_reports,

        can_manage_payroll =
          excluded.can_manage_payroll,

        updated_at =
          excluded.updated_at
    `)
    .run(
      BUSINESS_ID,
      EBRIMA_USER_ID,
      "admin",
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      EBRIMA_USER_ID,
      now,
      now
    );


  db
    .prepare(`
      INSERT INTO business_user_limits (
        business_id,
        max_additional_users,
        updated_at
      )
      VALUES (?, ?, ?)

      ON CONFLICT(business_id)
      DO UPDATE SET
        max_additional_users =
          excluded.max_additional_users,

        updated_at =
          excluded.updated_at
    `)
    .run(
      BUSINESS_ID,
      5,
      now
    );


  // ==========================================================
  // STANDARD CATEGORIES
  // ==========================================================

  const categories = [

    // Income
    ["Consultancy", "income"],
    ["Product Sales", "income"],
    ["Other Income", "income"],
    ["Breeding Services", "income"],
    ["Manure Sales", "income"],
    ["Farm Visits / Training", "income"],
    ["Sheep Sales", "income"],
    ["Nappier Grass", "income"],
    ["Consultation", "income"],

    // Expenses
    ["Veterinary", "expense"],
    ["Farm Labour", "expense"],
    ["Payroll", "expense"],
    ["Transportation", "expense"],
    ["Sheep Purchase", "expense"],
    ["Equipment", "expense"],
    ["Maintenance", "expense"],
    ["Phone & Data", "expense"],
    ["Photography", "expense"],
    ["Other Expenses", "expense"],
    ["Water", "expense"],
    ["Farm Supplies", "expense"],
    ["Pen / Building Works", "expense"],
    ["Marketing & Promotion", "expense"],
    ["Registration & Licences", "expense"],
    ["Feed", "expense"],
    ["Medication", "expense"],
    ["Fuel", "expense"],
    ["Electricity", "expense"],
    ["Labour", "expense"],
  ];


  const findCategory =
    db.prepare(`
      SELECT id
      FROM categories
      WHERE business_id = ?
        AND name = ?
        AND category_type = ?
      LIMIT 1
    `);


  const insertCategory =
    db.prepare(`
      INSERT INTO categories (
        id,
        business_id,
        name,
        category_type,
        parent_id,
        active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, NULL, 1, ?, ?)
    `);


  for (
    const [
      name,
      categoryType,
    ] of categories
  ) {

    const existing =
      findCategory.get(
        BUSINESS_ID,
        name,
        categoryType
      );


    if (!existing) {

      insertCategory.run(
        randomUUID(),
        BUSINESS_ID,
        name,
        categoryType,
        now,
        now
      );
    }
  }


  // ==========================================================
  // FINANCIAL ACCOUNTS
  // ==========================================================

  const accounts = [
    [
      "Cash on Hand",
      "cash",
    ],
    [
      "Wave",
      "wave",
    ],
    [
      "Bank Account",
      "bank",
    ],
  ];


  const findAccount =
    db.prepare(`
      SELECT id
      FROM financial_accounts
      WHERE business_id = ?
        AND name = ?
      LIMIT 1
    `);


  const insertAccount =
    db.prepare(`
      INSERT INTO financial_accounts (
        id,
        business_id,
        name,
        account_type,
        opening_balance,
        active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 0, 1, ?, ?)
    `);


  for (
    const [
      name,
      accountType,
    ] of accounts
  ) {

    const existing =
      findAccount.get(
        BUSINESS_ID,
        name
      );


    if (!existing) {

      insertAccount.run(
        randomUUID(),
        BUSINESS_ID,
        name,
        accountType,
        now,
        now
      );
    }
  }


  // ==========================================================
  // UPDATE LOCAL DATABASE VERSION
  // ==========================================================

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
      "seed_version",
      "1",
      now
    );


  db.exec(
    "COMMIT"
  );


} catch (
  error
) {

  db.exec(
    "ROLLBACK"
  );


  throw error;
}


// ============================================================
// VERIFY
// ============================================================

const business =
  db
    .prepare(`
      SELECT
        name,
        location,
        currency,
        ceo_name,
        tagline
      FROM businesses
      WHERE id = ?
    `)
    .get(
      BUSINESS_ID
    );


const profile =
  db
    .prepare(`
      SELECT
        username,
        full_name
      FROM user_profiles
      WHERE id = ?
    `)
    .get(
      EBRIMA_USER_ID
    );


const categoryCount =
  db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM categories
      WHERE business_id = ?
    `)
    .get(
      BUSINESS_ID
    );


const accountCount =
  db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM financial_accounts
      WHERE business_id = ?
    `)
    .get(
      BUSINESS_ID
    );


const operationalCounts =
  {
    contacts:
      db.prepare(
        "SELECT COUNT(*) AS total FROM contacts"
      ).get().total,

    employees:
      db.prepare(
        "SELECT COUNT(*) AS total FROM employees"
      ).get().total,

    expenses:
      db.prepare(
        "SELECT COUNT(*) AS total FROM expenses"
      ).get().total,

    invoices:
      db.prepare(
        "SELECT COUNT(*) AS total FROM invoices"
      ).get().total,

    payments:
      db.prepare(
        "SELECT COUNT(*) AS total FROM payments"
      ).get().total,

    transactions:
      db.prepare(
        "SELECT COUNT(*) AS total FROM transactions"
      ).get().total,

    consultations:
      db.prepare(
        "SELECT COUNT(*) AS total FROM contracts"
      ).get().total,
  };


console.log("");
console.log(
  "DJALLOWS FARM LOCAL SETUP READY"
);

console.log("");
console.log(
  "Business:"
);

console.table(
  [business]
);


console.log(
  "Local profile:"
);

console.table(
  [profile]
);


console.log(
  "Categories:",
  categoryCount.total
);


console.log(
  "Financial accounts:",
  accountCount.total
);


console.log("");
console.log(
  "Operational records must still be zero:"
);

console.table(
  operationalCounts
);


db.close();