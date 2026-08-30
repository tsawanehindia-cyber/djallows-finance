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


function getDataFolder() {

  const localAppData =
    process.env.LOCALAPPDATA;

  if (localAppData) {

    return path.join(
      localAppData,
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
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);


const now =
  new Date().toISOString();


const existingInstallation =
  db
    .prepare(`
      SELECT value
      FROM app_meta
      WHERE key = ?
    `)
    .get(
      "installation_id"
    );


if (!existingInstallation) {

  db
    .prepare(`
      INSERT INTO app_meta (
        key,
        value,
        updated_at
      )
      VALUES (?, ?, ?)
    `)
    .run(
      "installation_id",
      randomUUID(),
      now
    );
}


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
    "1",
    now
  );


const test =
  db
    .prepare(`
      SELECT
        key,
        value
      FROM app_meta
      ORDER BY key
    `)
    .all();


console.log("");
console.log(
  "DJALLOWS FARM LOCAL DATABASE READY"
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
  "Database records:"
);

console.table(
  test
);


db.close();
