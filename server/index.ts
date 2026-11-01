import Database from "better-sqlite3";
import express from "express";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Candy } from "../shared/types.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const databasePath =
  process.env.CANDY_DB_PATH ?? path.join(process.cwd(), "data", "candy-tracker.sqlite");

mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS candies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    count INTEGER NOT NULL CHECK (count >= 0),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

app.use(express.json({ limit: "10kb" }));

app.get("/api/candies", (_request, response) => {
  const candies = database
    .prepare("SELECT id, name, count, createdAt, updatedAt FROM candies ORDER BY createdAt, id")
    .all() as Candy[];

  response.json(candies);
});

app.post("/api/candies", (request, response) => {
  const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
  const count = request.body?.count;

  if (!name || name.length > 60) {
    response.status(400).json({ error: "Candy name must be between 1 and 60 characters." });
    return;
  }

  if (!Number.isSafeInteger(count) || count < 1) {
    response.status(400).json({ error: "Count must be a positive whole number." });
    return;
  }

  const candy = database
    .prepare(`
      INSERT INTO candies (name, count)
      VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET
        count = candies.count + excluded.count,
        updatedAt = datetime('now')
      RETURNING id, name, count, createdAt, updatedAt
    `)
    .get(name, count) as Candy;

  response.status(201).json(candy);
});

app.patch("/api/candies/:id", (request, response) => {
  const id = Number(request.params.id);
  const count = request.body?.count;

  if (!Number.isSafeInteger(id) || id < 1) {
    response.status(400).json({ error: "Candy ID must be a positive whole number." });
    return;
  }

  if (!Number.isSafeInteger(count) || count < 0) {
    response.status(400).json({ error: "Count must be a non-negative whole number." });
    return;
  }

  if (count === 0) {
    const deletedCandy = database
      .prepare("DELETE FROM candies WHERE id = ? RETURNING id, name")
      .get(id) as Pick<Candy, "id" | "name"> | undefined;

    if (!deletedCandy) {
      response.status(404).json({ error: "Candy not found." });
      return;
    }

    response.json({ ...deletedCandy, deleted: true });
    return;
  }

  const candy = database
    .prepare(`
      UPDATE candies
      SET count = ?, updatedAt = datetime('now')
      WHERE id = ?
      RETURNING id, name, count, createdAt, updatedAt
    `)
    .get(count, id) as Candy | undefined;

  if (!candy) {
    response.status(404).json({ error: "Candy not found." });
    return;
  }

  response.json(candy);
});

if (process.env.NODE_ENV === "production") {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const frontendDirectory = path.resolve(currentDirectory, "../dist");

  app.use(express.static(frontendDirectory));
  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(frontendDirectory, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Candy Tracker API listening on http://localhost:${port}`);
});
