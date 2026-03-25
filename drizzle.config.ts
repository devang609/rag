import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

for (const filename of [".env.local", ".env"]) {
  const fullPath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false });
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("DATABASE_URL is not set. Drizzle commands that require a database will fail.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl ?? "postgres://postgres:postgres@localhost:5432/postgres",
  },
  strict: true,
  verbose: true,
});
