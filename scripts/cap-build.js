const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const androidAssetsPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public');

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
