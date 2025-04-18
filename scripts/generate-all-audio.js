const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Make sure audio directory exists
const audioDir = path.join(__dirname, '../public/audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
  console.log(`Created audio directory at ${audioDir}`);
}

// List all files in the audio directory
console.log('Current audio files:');
const currentFiles = fs.readdirSync(audioDir);
console.log(currentFiles.length ? currentFiles.join('\n') : 'None');

console.log('\n================================================');
console.log('         Audio Generation Helper');
console.log('================================================\n');

console.log('This script will generate all required audio files using the server-side generator.');
console.log('The audio files will be created in: ' + audioDir);
console.log('');
console.log('For continuous tones for EMDR therapy, this generator creates:');
console.log('- 30-second loopable audio files');
console.log('- Perfectly seamless loops (no clicks when repeating)');
console.log('- All five basic sound types (sine waves, noise, etc.)');
console.log('');

const REQUIRED_FILES = [
  'sine-440hz.mp3',
  'sine-220hz.mp3',
  'white-noise.mp3',
  'pink-noise.mp3',
  'triangle-wave.mp3'
];

// Check which files already exist
const missingFiles = REQUIRED_FILES.filter(file => !fs.existsSync(path.join(audioDir, file)));

if (missingFiles.length === 0) {
  console.log('✅ All required audio files already exist!');
  process.exit(0);
} else {
  console.log('Missing files:');
  missingFiles.forEach(file => console.log(`- ${file}`));
  console.log('\nGenerating missing files via the audio generator script...');
  
  // Run the server-side audio generator
  const scriptPath = path.join(__dirname, 'server-audio-generator.js');
  if (fs.existsSync(scriptPath)) {
    require('./server-audio-generator');
  } else {
    console.error(`❌ Audio generator script not found at ${scriptPath}`);
    console.error('Please run this script from the NextJS server development environment.');
  }
} 