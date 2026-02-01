const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Android adaptive icon sizes (in px)
const sizes = {
  'mdpi': 108,
  'hdpi': 162,
  'xhdpi': 216,
  'xxhdpi': 324,
  'xxxhdpi': 432
};

// Input icon
const inputIcon = path.join(__dirname, '..', 'public', 'icon-512x512.png');
const fallbackIcon = path.join(__dirname, '..', 'public', 'icon-192x192.png');

// Output base path
const androidRes = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

async function generateIcons() {
  const sourceIcon = fs.existsSync(inputIcon) ? inputIcon : fallbackIcon;
  
  if (!fs.existsSync(sourceIcon)) {
    console.error('Source icon not found:', sourceIcon);
    process.exit(1);
  }

  console.log('Using source icon:', sourceIcon);

  // Read and process source image
  const image = sharp(sourceIcon);
  const metadata = await image.metadata();
  
  // Generate foreground icons (slightly smaller than background for safe zone)
  for (const [density, size] of Object.entries(sizes)) {
    const dir = path.join(androidRes, `mipmap-${density}`);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Foreground: icon content (66% of safe zone = 72% of total for xxxhdpi)
    const fgSize = Math.round(size * 0.66);
    const fgPath = path.join(dir, 'ic_launcher_foreground.png');
    
    await sharp(sourceIcon)
      .resize(fgSize, fgSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: Math.round((size - fgSize) / 2),
        bottom: Math.round((size - fgSize) / 2),
        left: Math.round((size - fgSize) / 2),
        right: Math.round((size - fgSize) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(fgPath);
    
    console.log(`Generated: ${fgPath}`);

    // Legacy launcher icon (full size with padding)
    const legacySize = Math.round(size * 0.8);
    const legacyPath = path.join(dir, 'ic_launcher.png');
    
    await sharp(sourceIcon)
      .resize(legacySize, legacySize, { fit: 'contain', background: { r: 15, g: 17, b: 21, alpha: 1 } })
      .extend({
        top: Math.round((size - legacySize) / 2),
        bottom: Math.round((size - legacySize) / 2),
        left: Math.round((size - legacySize) / 2),
        right: Math.round((size - legacySize) / 2),
        background: { r: 15, g: 17, b: 21, alpha: 1 }  // #0F1115
      })
      .png()
      .toFile(legacyPath);
    
    console.log(`Generated: ${legacyPath}`);

    // Round icon (same as legacy for now)
    const roundPath = path.join(dir, 'ic_launcher_round.png');
    await sharp(legacyPath).png().toFile(roundPath);
    console.log(`Generated: ${roundPath}`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
