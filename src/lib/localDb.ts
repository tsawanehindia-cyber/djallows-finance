import "server-only";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

let database: DatabaseSync | null = null;


export function getLocalDataFolder() {

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


export function getLocalDatabasePath() {

  return path.join(
    getLocalDataFolder(),
    "djallows-farm.db"
  );
}


export function getLocalDb() {

  if (database) {
    return database;
  }

  const dataFolder =
    getLocalDataFolder();

  fs.mkdirSync(
    dataFolder,
    {
      recursive: true,
    }
  );

  database =
    new DatabaseSync(
      getLocalDatabasePath()
    );

  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
  `);

  return database;
}