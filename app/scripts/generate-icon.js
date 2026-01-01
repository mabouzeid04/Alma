const sharp = require('sharp');
const path = require('path');

// App colors
const COLORS = {
  background: '#F5F1E8',     // Beige
  primary: '#E88D67',        // Warm Orange
  primaryLight: '#F4B59F',   // Soft Peach
  primaryDark: '#D67A54',    // Darker orange
};

async function generateIcon() {
  const size = 1024;
  const center = size / 2;

  // Create an abstract icon with overlapping circles (representing thoughts/memories)
  // Using SVG for precise control
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${size}" height="${size}" fill="${COLORS.background}"/>

      <!-- Abstract overlapping circles representing connected thoughts -->
      <!-- Large center circle -->
      <circle cx="${center}" cy="${center}" r="280" fill="${COLORS.primary}" opacity="0.9"/>

      <!-- Soft glow behind -->
      <circle cx="${center}" cy="${center}" r="340" fill="${COLORS.primaryLight}" opacity="0.3"/>

      <!-- Smaller overlapping circles for abstract feel -->
      <circle cx="${center - 120}" cy="${center - 80}" r="140" fill="${COLORS.primaryLight}" opacity="0.6"/>
      <circle cx="${center + 100}" cy="${center + 100}" r="120" fill="${COLORS.primaryDark}" opacity="0.5"/>
      <circle cx="${center + 80}" cy="${center - 120}" r="100" fill="${COLORS.primaryLight}" opacity="0.4"/>

      <!-- Central highlight for depth -->
      <circle cx="${center - 60}" cy="${center - 60}" r="160" fill="white" opacity="0.15"/>

      <!-- Small accent circles -->
      <circle cx="${center - 180}" cy="${center + 140}" r="60" fill="${COLORS.primaryLight}" opacity="0.5"/>
      <circle cx="${center + 160}" cy="${center - 60}" r="50" fill="${COLORS.primary}" opacity="0.4"/>
    </svg>
  `;

  // Generate main icon (1024x1024)
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(__dirname, '../assets/icon.png'));

  console.log('Generated icon.png (1024x1024)');

  // Generate adaptive icon for Android (1024x1024)
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(__dirname, '../assets/adaptive-icon.png'));

  console.log('Generated adaptive-icon.png (1024x1024)');

  // Generate splash icon (same as main icon)
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(__dirname, '../assets/splash-icon.png'));

  console.log('Generated splash-icon.png (1024x1024)');

  // Generate favicon (48x48)
  await sharp(Buffer.from(svg))
    .resize(48, 48)
    .png()
    .toFile(path.join(__dirname, '../assets/favicon.png'));

  console.log('Generated favicon.png (48x48)');

  console.log('\nAll icons generated successfully!');
}

generateIcon().catch(console.error);
