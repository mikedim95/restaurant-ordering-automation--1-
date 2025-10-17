import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Running migrations...");

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Create migration client with the correct connection string
  const migrationClient = postgres(connectionString, { max: 1 });

  const db = drizzle(migrationClient);

  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("Migrations completed!");

  await migrationClient.end();
}

main().catch((err) => {
  console.error("Migration failed!");
  console.error(err);
  process.exit(1);
});
