import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const logoPath = join(projectRoot, 'public', 'logo.png');
const addinDir = join(projectRoot, 'public', 'addin');

// Ensure addin directory exists
if (!fs.existsSync(addinDir)) {
  fs.mkdirSync(addinDir, { recursive: true });
}

// Check if logo.png exists
if (!fs.existsSync(logoPath)) {
  console.error('❌ Error: logo.png not found at public/logo.png');
  console.error('Please ensure the BlocIQ logo is placed at public/logo.png');
  process.exit(1);
}

const iconSizes = [
  { size: 16, filename: 'icon-16.png' },
  { size: 32, filename: 'icon-32.png' },
  { size: 80, filename: 'icon-80.png' }
];

async function generateIcons() {
  try {
    console.log('🎨 Generating BlocIQ addin icons...');
    
    for (const icon of iconSizes) {
      const outputPath = join(addinDir, icon.filename);
      
      await sharp(logoPath)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${icon.filename} (${icon.size}x${icon.size})`);
    }
    
    console.log('🎉 All icons generated successfully!');
    console.log('📁 Icons saved to public/addin/');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
