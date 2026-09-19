import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@/config/env";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabase() {
  const url = getServerEnv().DATABASE_URL;
  if (!url)
    throw new Error("DATABASE_URL is required for persistent platform storage.");
  if (!database) {
    const client = postgres(url, {
      max: 4,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
    database = drizzle(client, { schema });
  }
  return database;
}

export function hasDatabase() {
  return Boolean(getServerEnv().DATABASE_URL);
}
