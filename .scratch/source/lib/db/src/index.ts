import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// The hosted database plan allows a very small number of simultaneous connections.
// Queue queries through one pooled connection so dashboard requests and bot updates remain reliable.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
export const db = drizzle(pool, { schema });

export * from "./schema";
