const { execSync } = require('child_process');
const path = require('path');

const cwd = path.join(__dirname, '..');

console.log('📦 [Build] Step 1: Generating Prisma Client...');
try {
  execSync('node scripts/generatePrisma.cjs', { stdio: 'inherit', cwd });
} catch (err) {
  console.error('❌ [Build] Failed to generate Prisma Client:', err);
  process.exit(1);
}

console.log('🔄 [Build] Step 2: Running Prisma database migration deploy...');
try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd });
  console.log('✓ Database migrations applied successfully.');
} catch (err) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ [Build] Prisma migration deploy failed in production.');
    process.exit(1);
  } else {
    console.warn('⚠️ [Build] Notice: Database server not reachable locally. Skipping prisma migrate deploy during local build.');
    console.warn('   Ensure DATABASE_URL is accessible or run "npx prisma migrate deploy" in your staging/production deployment.');
  }
}

console.log('🔨 [Build] Step 3: Compiling TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit', cwd });
  console.log('✓ TypeScript build succeeded.');
} catch (err) {
  console.error('❌ [Build] TypeScript compilation failed.');
  process.exit(1);
}
