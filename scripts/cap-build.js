const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const androidAssetsPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public');

// Kill dev server processes
function killDevServer() {
  console.log('🔪 Killing dev server processes...');
  try {
    const result = execSync('netstat -ano | findstr :3000', { encoding: 'utf8', stdio: 'pipe' });
    const lines = result.split('\n');
    const pids = new Set();
    lines.forEach(line => {
      const match = line.match(/\s+(\d+)\s*$/);
      if (match) {
        pids.add(match[1]);
      }
    });
    pids.forEach(pid => {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`✓ Killed process ${pid}`);
      } catch {}
    });
  } catch {}
  console.log('✓ Dev server processes cleaned');
}

// Start dev server
function startDevServer() {
  console.log('🚀 Starting dev server...');
  const devProcess = exec('npm run dev', {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Capture output to find the server URL
  devProcess.stdout.on('data', (data) => {
    const output = data.toString();
    // Look for lines with Local: or Network: URLs
    const localMatch = output.match(/Local:\s+(http:\/\/\S+)/);
    const networkMatch = output.match(/Network:\s+(http:\/\/\S+)/);
    if (localMatch || networkMatch) {
      console.log('\n📡 Dev server started:');
      if (localMatch) console.log(`   Local:   ${localMatch[1]}`);
      if (networkMatch) console.log(`   Network: ${networkMatch[1]}`);
      console.log('');
    }
    // Also pass through to console
    process.stdout.write(output);
  });
  
  devProcess.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });
  
  devProcess.unref();
}

// Main build process
async function build() {
  // Step 0: Kill dev server
  try {
    killDevServer();
  } catch (e) {
    console.log('⚠ Failed to kill dev server:', e.message);
  }

  // Step 1: Increment build version
  try {
    console.log('🔢 Incrementing build version...');
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const versionParts = packageJson.version.split('.');
    versionParts[2] = String(parseInt(versionParts[2]) + 1);
    packageJson.version = versionParts.join('.');
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    console.log(`✓ Version updated to ${packageJson.version}`);
  } catch (e) {
    console.error('❌ Failed to update version:', e.message);
    process.exit(1);
  }

  // Step 2: Clean android assets
  try {
    console.log('🧹 Cleaning Android assets...');
    if (fs.existsSync(androidAssetsPath)) {
      fs.rmSync(androidAssetsPath, { recursive: true, force: true });
      console.log('✓ Android assets cleaned');
    } else {
      console.log('✓ No assets to clean');
    }
  } catch (e) {
    console.error('❌ Failed to clean assets:', e.message);
    process.exit(1);
  }

  // Step 3: Build Next.js
  try {
    console.log('🔨 Building Next.js...');
    execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (e) {
    console.error('❌ Build failed:', e.message);
    process.exit(1);
  }

  // Step 4: Sync version
  try {
    console.log('📦 Syncing version...');
    execSync('npm run sync-version', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (e) {
    console.error('❌ Version sync failed:', e.message);
    process.exit(1);
  }

  // Step 5: Capacitor sync
  try {
    console.log('📱 Syncing with Capacitor...');
    execSync('npx cap sync', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (e) {
    console.error('❌ Capacitor sync failed:', e.message);
    process.exit(1);
  }

  // Step 6: Build Android APK
  try {
    console.log('🤖 Building Android APK...');
    const javaHome = 'C:\\Program Files\\Android\\Android Studio\\jbr';
    execSync('gradlew assembleRelease', { 
      stdio: 'inherit', 
      cwd: path.join(__dirname, '..', 'android'),
      env: { ...process.env, JAVA_HOME: javaHome }
    });
  } catch (e) {
    console.error('❌ Android build failed:', e.message);
    process.exit(1);
  }

  console.log('✅ Build complete! APK: android/app/build/outputs/apk/release/app-release.apk');

  // Step 7: Restart dev server
  startDevServer();
}

build();
