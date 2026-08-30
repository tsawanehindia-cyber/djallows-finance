/* eslint-disable @typescript-eslint/no-require-imports */
const {
  DatabaseSync,
} = require("node:sqlite");

const {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} = require("node:crypto");

const path =
  require("node:path");

const os =
  require("node:os");


const USER_ID =
  "7bcdb529-4bed-47e3-82b8-db38a345b547";

const password =
  process.env.DJALLOWS_INITIAL_PASSWORD ?? "";


if (password.length < 8) {
  throw new Error(
    "Password must contain at least 8 characters."
  );
}


const folder =
  process.env.LOCALAPPDATA
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


const databasePath =
  path.join(
    folder,
    "djallows-farm.db"
  );


const db =
  new DatabaseSync(
    databasePath
  );


const salt =
  randomBytes(16);


const derivedKey =
  scryptSync(
    password,
    salt,
    64
  );


const passwordHash =
  [
    "scrypt",
    salt.toString("base64"),
    derivedKey.toString("base64"),
  ].join("$");


const now =
  new Date().toISOString();


db
  .prepare(`
    INSERT INTO local_users (
      id,
      username,
      email,
      password_hash,
      full_name,
      phone,
      platform_role,
      is_active,
      must_change_password,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)

    ON CONFLICT(id)
    DO UPDATE SET
      username = excluded.username,
      password_hash = excluded.password_hash,
      full_name = excluded.full_name,
      phone = excluded.phone,
      platform_role = excluded.platform_role,
      is_active = 1,
      updated_at = excluded.updated_at
  `)
  .run(
    USER_ID,
    "ebrima",
    null,
    passwordHash,
    "Ebrima Jallow",
    "+220 789 3464",
    "super_admin",
    now,
    now
  );


db
  .prepare(`
    UPDATE user_profiles
    SET
      platform_role = 'super_admin',
      is_active = 1,
      updated_at = ?
    WHERE id = ?
  `)
  .run(
    now,
    USER_ID
  );


/* Verify the stored hash without printing the password */

const saved =
  db
    .prepare(`
      SELECT
        username,
        password_hash,
        platform_role,
        is_active
      FROM local_users
      WHERE id = ?
    `)
    .get(
      USER_ID
    );


const parts =
  saved.password_hash.split("$");

const savedSalt =
  Buffer.from(
    parts[1],
    "base64"
  );

const savedHash =
  Buffer.from(
    parts[2],
    "base64"
  );

const checkHash =
  scryptSync(
    password,
    savedSalt,
    savedHash.length
  );


const valid =
  timingSafeEqual(
    savedHash,
    checkHash
  );


console.log("");

if (!valid) {
  throw new Error(
    "Local password verification failed."
  );
}


console.log(
  "EBRIMA LOCAL LOGIN READY"
);

console.log("");
console.log(
  "Username:",
  saved.username
);

console.log(
  "Role:",
  saved.platform_role
);

console.log(
  "Password verification: OK"
);

console.log("");
console.log(
  "The password itself was not displayed or stored as plain text."
);


db.close();
