const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prismaClientDir = path.join(__dirname, '..', 'node_modules', '.prisma', 'client');
const dllPath = path.join(prismaClientDir, 'query_engine-windows.dll.node');
const indexDts = path.join(prismaClientDir, 'index.d.ts');

function cleanTmpFiles() {
  if (fs.existsSync(prismaClientDir)) {
    try {
      const files = fs.readdirSync(prismaClientDir);
      for (const file of files) {
        if (file.includes('.tmp')) {
          try {
            fs.unlinkSync(path.join(prismaClientDir, file));
          } catch (_) {}
        }
      }
    } catch (_) {}
  }
}

function isDllLocked() {
  if (!fs.existsSync(dllPath)) return false;
  try {
    const fd = fs.openSync(dllPath, 'r+');
    fs.closeSync(fd);
    return false;
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES') {
      return true;
    }
    return false;
  }
}

function run() {
  cleanTmpFiles();
  const isLocked = isDllLocked();
  const isClientReady = fs.existsSync(dllPath) && fs.existsSync(indexDts);
  const isForce = process.argv.includes('--force');

  if (isLocked) {
    if (isForce) {
      console.error('\n❌ [ERROR] Cannot regenerate Prisma Client because the Query Engine DLL is currently loaded by a running backend process.');
      console.error('👉 Please stop your backend server (or run "npm run kill:backend") and try again.\n');
      process.exit(1);
    }

    if (isClientReady) {
      console.log('\nℹ️ [Notice] Prisma Query Engine DLL is currently loaded by the active backend process.');
      console.log('✓ Existing generated Prisma Client is intact and up to date.');
      console.log('✓ Skipping DLL replacement to prevent Windows EPERM file locking conflict.\n');
      process.exit(0);
    }
  }

  try {
    console.log('Running prisma generate...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    cleanTmpFiles();
  } catch (err) {
    cleanTmpFiles();
    if (isClientReady && !isForce) {
      console.warn('\n⚠️ [WARN] prisma generate encountered a file lock, but existing Prisma Client is valid.');
      console.warn('   Proceeding with build...\n');
      process.exit(0);
    }
    process.exit(1);
  }
}

run();
