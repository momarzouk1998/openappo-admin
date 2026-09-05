import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('file:')) {
  process.env.DATABASE_URL = 'file:/app/data/prod.db';
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function ensureDbTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS System (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE,
        displayName TEXT,
        monthlyFee REAL DEFAULT 0,
        subscriptionEndDate DATETIME,
        gracePeriodDays INTEGER DEFAULT 0,
        warningDays INTEGER DEFAULT 3,
        isActive BOOLEAN DEFAULT true,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Admin (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT NOT NULL DEFAULT 'owner',
        allowedPages TEXT NOT NULL DEFAULT '["/","/systems","/payments","/expenses","/settings"]',
        canSeePricing BOOLEAN NOT NULL DEFAULT true,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Payment (
        id TEXT PRIMARY KEY,
        systemId TEXT NOT NULL,
        systemName TEXT NOT NULL DEFAULT '',
        amount REAL NOT NULL DEFAULT 0,
        paidAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        note TEXT NOT NULL DEFAULT '',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (systemId) REFERENCES System(id) ON DELETE CASCADE
      );
    `);

    // Ensure all required columns exist in case the table was created previously without them
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE System ADD COLUMN warningDays INTEGER DEFAULT 3;`);
    } catch (_) {}

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE System ADD COLUMN gracePeriodDays INTEGER DEFAULT 0;`);
    } catch (_) {}

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE System ADD COLUMN customerPhone TEXT NOT NULL DEFAULT '';`);
    } catch (_) {}

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE System ADD COLUMN accountantPhone TEXT NOT NULL DEFAULT '';`);
    } catch (_) {}

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE Admin ADD COLUMN role TEXT NOT NULL DEFAULT 'owner';`);
    } catch (_) {}

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE Admin ADD COLUMN allowedPages TEXT NOT NULL DEFAULT '["/","/systems","/payments","/expenses","/settings"]';`);
    } catch (_) {}

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE Admin ADD COLUMN canSeePricing BOOLEAN NOT NULL DEFAULT true;`);
    } catch (_) {}

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE Payment ADD COLUMN note TEXT NOT NULL DEFAULT '';`);
    } catch (_) {}

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE Payment ADD COLUMN systemName TEXT NOT NULL DEFAULT '';`);
    } catch (_) {}

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Expense (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL DEFAULT 'other',
        label TEXT NOT NULL DEFAULT '',
        amount REAL NOT NULL DEFAULT 0,
        paidAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        note TEXT NOT NULL DEFAULT '',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS PushSubscription (
        id TEXT PRIMARY KEY,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (error) {
    console.error("Error ensuring DB tables exist:", error);
  }
}
