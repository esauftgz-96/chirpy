import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";

process.loadEnvFile();

export function envOrThrow (key: string) {
  let urlString = process.env[key];
  if (typeof urlString === "string") {
    return urlString as string;
  } else {
    throw new Error("env lacks correct db url");
  }
}

export type DBConfig = {
  url: string;
  migrationConfig: {migrationsFolder:string};
}

export type APIConfig = {
  fileserverHits: number;
  db: DBConfig;
  platform: string;
  secret: string;
  polkaKey: string;
};

export const config : APIConfig = {
    fileserverHits: 0,
    db: {
      url: envOrThrow("DB_URL"),
      //drizzle works from root
      migrationConfig: {migrationsFolder: "./src/output"},
    },
    platform: envOrThrow("PLATFORM"),
    secret: envOrThrow("SECRET"),
    polkaKey: envOrThrow("POLKA_KEY"),
};

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);