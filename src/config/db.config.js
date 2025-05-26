import { Pool } from "pg";
import fs from "fs";
import path from "path";
import variable from "./env.config.js";
import logger from "../utils/logger.utils.js";

const pool = new Pool({
    connectionString : variable.database_url,
    ssl: {
        rejectUnauthorized: false
    }
})

export async function runMigrations() {
  const migrationsDir = path.resolve("./src/models"); // change if needed

  try {
    const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith(".sql"));

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      console.log(`Running migration: ${file}`);
      await pool.query(sql);
    }

    logger.info("✅ All migrations ran successfully.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

export default pool;