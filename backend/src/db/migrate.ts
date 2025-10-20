import { db } from "./index.js";

async function migrate() {
  console.log("Running migrations...");

  // Add any custom migration logic here if needed
  // For now, Prisma handles schema migrations automatically

  console.log("Migrations completed!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
