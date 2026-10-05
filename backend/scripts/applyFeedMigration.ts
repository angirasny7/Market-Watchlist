import { prisma } from '../src/config/prisma.js';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  const sqlPath = path.join(__dirname, '../prisma/migrations/20261005140000_add_feed_state_and_event_types/migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);

  for (const statement of statements) {
    console.log('Executing:', statement.slice(0, 60), '...');
    await prisma.$executeRawUnsafe(statement);
  }

  console.log('✓ Additive migration executed cleanly.');
}

applyMigration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
