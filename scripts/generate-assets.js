const fs = require('fs');
const path = require('path');

/**
 * Asset Generation Script for Program 21
 * 
 * This script generates PNG icons and favicons from the SVG source.
 * Run before publishing: node scripts/generate-assets.js
 * 
 * Requires: sharp (npm install sharp)
 */

async function generateAssets() {
  try {
    const sharp = require('sharp');
    
    const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/icon.svg'));
    
    // Generate PWA icons
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    
    console.log('Generating PWA icons...');
    for (const size of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, `../public/icon-${size}x${size}.png`));
      console.log(`  ✓ icon-${size}x${size}.png`);
    }
    
    // Generate favicons
    console.log('Generating favicons...');
    
    // favicon.ico (multi-size)
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon-32x32.png'));
    console.log('  ✓ favicon-32x32.png');
    
    await sharp(svgBuffer)
      .resize(16, 16)
      .png()
      .toFile(path.join(__dirname, '../public/favicon-16x16.png'));
    console.log('  ✓ favicon-16x16.png');
    
    // Apple touch icon
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
    console.log('  ✓ apple-touch-icon.png');
    
    // OG image (social sharing)
    console.log('Generating OG image...');
    
    // Create a larger OG image with text
    const ogSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f1115"/>
            <stop offset="50%" style="stop-color:#1a1d24"/>
            <stop offset="100%" style="stop-color:#0f1115"/>
          </linearGradient>
          <linearGradient id="text" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff"/>
            <stop offset="50%" style="stop-color:#a5b4fc"/>
            <stop offset="100%" style="stop-color:#6366f1"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        <text x="50%" y="45%" 
              dominant-baseline="central" 
              text-anchor="middle"
              font-family="Arial, sans-serif"
              font-size="200"
              font-weight="bold"
              fill="url(#text)">
          21
        </text>
        <text x="50%" y="70%" 
              dominant-baseline="central" 
              text-anchor="middle"
              font-family="Arial, sans-serif"
              font-size="48"
              fill="#fff"
              letter-spacing="8">
          PROGRAM 21
        </text>
      </svg>
    `;
    
    await sharp(Buffer.from(ogSvg))
      .png()
      .toFile(path.join(__dirname, '../public/og-image.png'));
    console.log('  ✓ og-image.png');
    
    console.log('\n✅ All assets generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Update manifest.json with new icon paths');
    console.log('2. Update layout.tsx with favicon links');
    console.log('3. Test the splash screen component');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ sharp is not installed.');
      console.log('\nPlease install it first:');
      console.log('  npm install sharp --save-dev');
      process.exit(1);
    }
    console.error('❌ Error generating assets:', error);
    process.exit(1);
  }
}

generateAssets();
