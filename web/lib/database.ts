import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

let pool: Pool | undefined;

export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return (pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }));
}
