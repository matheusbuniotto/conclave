import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://conclave:conclave_password@localhost:5432/conclave_dev";

export const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export * from "./schema";
