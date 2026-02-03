const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const androidAssetsPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public');

// Step 0: Increment build version
console.log('🔢 Incrementing build version...');
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const versionParts = packageJson.version.split('.');
versionParts[2] = String(parseInt(versionParts[2]) + 1);
packageJson.version = versionParts.join('.');
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
console.log(`✓ Version updated to ${packageJson.version}`);

// Step 1: Clean android assets
console.log('🧹 Cleaning Android assets...');
if (fs.existsSync(androidAssetsPath)) {
  fs.rmSync(androidAssetsPath, { recursive: true, force: true });
  console.log('✓ Android assets cleaned');
} else {
  console.log('✓ No assets to clean');
}

// Step 2: Build Next.js
console.log('🔨 Building Next.js...');
execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

// Step 3: Sync version
console.log('📦 Syncing version...');
execSync('npm run sync-version', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

// Step 4: Capacitor sync
console.log('📱 Syncing with Capacitor...');
execSync('npx cap sync', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

// Step 5: Build Android APK
console.log('🤖 Building Android APK...');
const javaHome = 'C:\\Program Files\\Android\\Android Studio\\jbr';
execSync('gradlew assembleRelease', { 
  stdio: 'inherit', 
  cwd: path.join(__dirname, '..', 'android'),
  env: { ...process.env, JAVA_HOME: javaHome }
});

console.log('✅ Build complete! APK: android/app/build/outputs/apk/release/app-release.apk');
