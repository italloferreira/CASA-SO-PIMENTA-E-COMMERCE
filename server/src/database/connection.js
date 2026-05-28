import Database from "better-sqlite3";
import path from "path";

const databasePath = path.resolve('data', 'casa-so-pimenta.db');

export const db = new Database(databasePath);

db.pragma('foreign_keys = ON');