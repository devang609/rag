import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/lib/env";

declare global {
  var __o2cPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalThis.__o2cPool) {
    globalThis.__o2cPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
    });
  }

  return globalThis.__o2cPool;
}

export function getDb() {
  return drizzle(getPool());
}
