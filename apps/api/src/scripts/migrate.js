import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../config.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(currentDir, "../../../../database/schema.sql");
const schemaSql = await readFile(schemaPath, "utf8");

const connection = await mysql.createConnection({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  multipleStatements: true
});

try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${connection.escapeId(config.db.name)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE ${connection.escapeId(config.db.name)}`);
  await connection.query(schemaSql);
  console.log(`Database schema migrated for ${config.db.name}`);
} finally {
  await connection.end();
}
