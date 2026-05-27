import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");
  let body = "";
  try {
    body = readFileSync(envPath, "utf8");
  } catch {
    return;
  }

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

loadLocalEnv();

const ADMIN = {
  email: "bansal.s.karan@gmail.com",
  fullName: "Karaan Bansall",
  phone: "+919811856777",
  username: "Admin_Karaan",
};

function readPassword() {
  const password = process.env.TRADEX_ADMIN_PASSWORD ?? "";
  if (password.length < 8) {
    throw new Error("Set TRADEX_ADMIN_PASSWORD to the admin password before running this script.");
  }
  return password;
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const passwordHash = await bcrypt.hash(readPassword(), 10);
  let user;

  try {
    user = await db.user.upsert({
      where: { email: ADMIN.email },
      create: {
        email: ADMIN.email,
        passwordHash,
        fullName: ADMIN.fullName,
        phone: ADMIN.phone,
        role: "admin",
        address: ADMIN.username,
        onboardingStep: "telegram",
      },
      update: {
        passwordHash,
        fullName: ADMIN.fullName,
        phone: ADMIN.phone,
        role: "admin",
        address: ADMIN.username,
        onboardingStep: "telegram",
      },
    });
  } catch (error) {
    user = await upsertWithNodeSqlite(passwordHash, error);
  }

  console.log(
    JSON.stringify({
      ok: true,
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      username: ADMIN.username,
    }),
  );

  await db.$disconnect();
}

function sqlitePathFromDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.startsWith("file:")) return null;
  const rawPath = databaseUrl.slice("file:".length);
  if (!rawPath || rawPath.startsWith("/")) return rawPath;
  return resolve(process.cwd(), "prisma", rawPath);
}

async function upsertWithNodeSqlite(passwordHash, originalError) {
  const dbPath = sqlitePathFromDatabaseUrl();
  if (!dbPath) throw originalError;

  let sqlite;
  try {
    sqlite = await import("node:sqlite");
  } catch {
    throw originalError;
  }

  const database = new sqlite.DatabaseSync(dbPath);
  const existing = database.prepare("SELECT id FROM User WHERE email = ?").get(ADMIN.email);
  let id = existing?.id;

  if (id) {
    database
      .prepare(
        `
        UPDATE User
           SET passwordHash = ?, fullName = ?, phone = ?, role = 'admin', address = ?, onboardingStep = 'telegram'
         WHERE email = ?
      `,
      )
      .run(passwordHash, ADMIN.fullName, ADMIN.phone, ADMIN.username, ADMIN.email);
  } else {
    const result = database
      .prepare(
        `
        INSERT INTO User(email, passwordHash, fullName, phone, role, address, onboardingStep, createdAt)
        VALUES (?, ?, ?, ?, 'admin', ?, 'telegram', ?)
      `,
      )
      .run(
        ADMIN.email,
        passwordHash,
        ADMIN.fullName,
        ADMIN.phone,
        ADMIN.username,
        new Date().toISOString(),
      );
    id = Number(result.lastInsertRowid);
  }

  database.close();
  return { id, email: ADMIN.email, phone: ADMIN.phone, role: "admin" };
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
