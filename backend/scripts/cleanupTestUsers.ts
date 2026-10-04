import fs from 'fs';
import { prisma } from '../src/config/prisma.js';

/**
 * Cleanup Test Users Script (Dry-run by default)
 *
 * Requirements to execute destructive cleanup:
 * 1. `--confirm` flag must be explicitly passed.
 * 2. `--backup <path/to/backup.sql>` must point to an existing, non-empty database backup file.
 * 3. Runs inside a single atomic database transaction.
 *
 * By default without `--confirm`, performs a detailed audit dry-run and prints exact counts of rows that would be affected.
 */
async function cleanupTestUsers() {
  console.log('========================================================================');
  console.log('  CLEANUP TEST USERS (DRY-RUN AUDIT & TRANSACTIONAL CLEANUP)');
  console.log('========================================================================\n');

  const args = process.argv.slice(2);
  const isConfirmed = args.includes('--confirm');
  const backupIndex = args.indexOf('--backup');
  const backupPath = backupIndex !== -1 && args[backupIndex + 1] ? args[backupIndex + 1] : null;

  // 1. Identify test users flagged with isTestUser = true
  const testUsers = await prisma.user.findMany({
    where: { isTestUser: true },
    select: { id: true, email: true, name: true },
  });

  const testUserIds = testUsers.map((u) => u.id);

  if (testUserIds.length === 0) {
    console.log('ℹ️ No flagged test users (isTestUser: true) found in database.');
    return;
  }

  // 2. Compute associated records to be removed
  const [
    watchlistCount,
    watchlistStockCount,
    alertCount,
    notificationCount,
    userEventReadCount,
    userSavedEventCount,
    userDigestReadCount,
    userStateCount,
    userCustomEventCount,
    userCustomDigestCount,
  ] = await Promise.all([
    prisma.watchlist.count({ where: { userId: { in: testUserIds } } }),
    prisma.watchlistStock.count({ where: { watchlist: { userId: { in: testUserIds } } } }),
    prisma.alert.count({ where: { userId: { in: testUserIds } } }),
    prisma.notification.count({ where: { userId: { in: testUserIds } } }),
    prisma.userEventRead.count({ where: { userId: { in: testUserIds } } }),
    prisma.userSavedEvent.count({ where: { userId: { in: testUserIds } } }),
    prisma.userDigestRead.count({ where: { userId: { in: testUserIds } } }),
    prisma.userState.count({ where: { userId: { in: testUserIds } } }),
    prisma.event.count({ where: { userId: { in: testUserIds } } }),
    prisma.digest.count({ where: { userId: { in: testUserIds } } }),
  ]);

  console.log(`📊 Dry-Run Inventory of Rows Targeted for Removal:`);
  console.log(`  • Users (isTestUser = true):           ${testUserIds.length}`);
  console.log(`  • Watchlists:                          ${watchlistCount}`);
  console.log(`  • Watchlist Stocks:                    ${watchlistStockCount}`);
  console.log(`  • Alerts:                              ${alertCount}`);
  console.log(`  • Notifications:                       ${notificationCount}`);
  console.log(`  • User Event Reads:                    ${userEventReadCount}`);
  console.log(`  • User Saved Events:                   ${userSavedEventCount}`);
  console.log(`  • User Digest Reads:                   ${userDigestReadCount}`);
  console.log(`  • User States:                         ${userStateCount}`);
  console.log(`  • User-Specific Events:                ${userCustomEventCount}`);
  console.log(`  • User-Specific Digests:               ${userCustomDigestCount}\n`);

  if (!isConfirmed) {
    console.log('🔒 DRY-RUN ONLY: No changes made to the database.');
    console.log('To execute this cleanup, you must pass:');
    console.log('  npx tsx backend/scripts/cleanupTestUsers.ts --confirm --backup <path-to-recent-backup.sql>\n');
    console.log('========================================================================\n');
    return;
  }

  // 3. Strict Safety Validation
  if (!backupPath || !fs.existsSync(backupPath)) {
    console.error('❌ SAFETY ABORT: A valid, existing backup file path must be provided via --backup <path>.');
    process.exit(1);
  }

  const stat = fs.statSync(backupPath);
  if (stat.size < 1000) {
    console.error(`❌ SAFETY ABORT: Backup file "${backupPath}" is suspiciously small (${stat.size} bytes).`);
    process.exit(1);
  }

  console.log(`✓ Backup file verified: "${backupPath}" (${(stat.size / 1024).toFixed(1)} KB)`);
  console.log(`⚠️ EXECUTING TRANSACTIONAL CLEANUP OF ${testUserIds.length} TEST USERS...`);

  await prisma.$transaction(async (tx) => {
    // Delete user-specific events and digests first
    await tx.event.deleteMany({ where: { userId: { in: testUserIds } } });
    await tx.digest.deleteMany({ where: { userId: { in: testUserIds } } });

    // Cascade delete users (which cascades watchlists, stocks, alerts, notifications, reads, states)
    await tx.user.deleteMany({ where: { id: { in: testUserIds } } });
  });

  console.log('✅ Transaction committed successfully. All flagged test data removed.');
  console.log('========================================================================\n');
}

cleanupTestUsers()
  .catch((err) => {
    console.error('Cleanup error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
