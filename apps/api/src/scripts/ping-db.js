import { pool, pingDatabase } from "../db.js";

try {
  const ok = await pingDatabase();
  console.log(ok ? "Database connection OK" : "Database connection failed");
} finally {
  await pool.end();
}
