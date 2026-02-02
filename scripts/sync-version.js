const fs = require('fs');
const path = require('path');

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageJson.version;

// Parse version (e.g., "0.1.0" -> versionCode 1000000, versionName "0.1.0")
const [major, minor, patch] = version.split('.').map(Number);
const versionCode = major * 1000000 + minor * 1000 + patch;

// Read build.gradle
const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
let gradleContent = fs.readFileSync(gradlePath, 'utf8');

// Replace versionCode and versionName
gradleContent = gradleContent.replace(/versionCode \d+/, `versionCode ${versionCode}`);
gradleContent = gradleContent.replace(/versionName "[^"]+"/, `versionName "${version}"`);

// Write back
fs.writeFileSync(gradlePath, gradleContent, 'utf8');

console.log(`✓ Synced Android version: ${version} (code: ${versionCode})`);
