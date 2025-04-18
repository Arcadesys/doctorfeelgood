const fs = require('fs');
const path = require('path');

// Make sure audio directory exists
const audioDir = path.join(__dirname, '../public/audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

console.log('========================================================');
console.log('  Audio Generation Helper');
console.log('========================================================');
console.log('');
console.log('FFmpeg is not installed or not found in your PATH.');
console.log('');
console.log('Instead, please use the browser-based audio generator:');
console.log('');
console.log('1. Open this URL in your browser:');
console.log('   http://localhost:3000/generate-audio.html');
console.log('');
console.log('2. Click on "Generate & Download All" to create all audio files');
console.log('');
console.log('3. Move the downloaded files to the public/audio directory:');
console.log(`   ${audioDir}`);
console.log('');
console.log('This browser-based approach uses the Web Audio API');
console.log('to generate high-quality audio files without requiring');
console.log('external dependencies like FFmpeg.');
console.log('');
console.log('========================================================'); 