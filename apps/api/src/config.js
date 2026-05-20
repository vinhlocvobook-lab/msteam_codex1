import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(currentDir, "../.env") });

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requiredNumberEnv(name) {
  const value = requiredEnv(name);
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsed;
}

function listEnv(name) {
  return requiredEnv(name)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export const config = {
  nodeEnv: requiredEnv("NODE_ENV"),
  host: requiredEnv("HOST"),
  port: requiredNumberEnv("PORT"),
  webOrigins: listEnv("WEB_ORIGINS"),
  db: {
    host: requiredEnv("DB_HOST"),
    port: requiredNumberEnv("DB_PORT"),
    user: requiredEnv("DB_USER"),
    password: requiredEnv("DB_PASSWORD"),
    name: requiredEnv("DB_NAME")
  },
  microsoft: {
    tenantId: process.env.MICROSOFT_TENANT_ID || "",
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    graphBaseUrl: requiredEnv("MICROSOFT_GRAPH_BASE_URL")
  },
  teamsSync: {
    enabled: process.env.TEAMS_SYNC_ENABLED === "true",
    lookbackDays: requiredNumberEnv("TEAMS_SYNC_LOOKBACK_DAYS"),
    webhookPublicUrl: process.env.TEAMS_WEBHOOK_PUBLIC_URL || ""
  }
};
