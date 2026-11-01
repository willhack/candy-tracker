import Database from "better-sqlite3";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Candy } from "../shared/types.js";

const databasePath =
  process.env.CANDY_DB_PATH ?? path.join(process.cwd(), "data", "candy-tracker.sqlite");
const outputPath = path.join(process.cwd(), "public", "candies.json");

if (!existsSync(databasePath)) {
  throw new Error(`Candy database not found at ${databasePath}. Set CANDY_DB_PATH to its location.`);
}

const database = new Database(databasePath, { readonly: true });

try {
  const candies = database
    .prepare("SELECT id, name, count, createdAt, updatedAt FROM candies ORDER BY createdAt, id")
    .all() as Candy[];

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(candies, null, 2)}\n`);
  console.log(`Exported ${candies.length} candy types to ${outputPath}`);
} finally {
  database.close();
}
