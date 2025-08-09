import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "src/db/schema.ts",
  out: "src/output",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgres://postgres:default@localhost:5432/chirpy?sslmode=disable",
  },
});