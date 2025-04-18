const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

// Promisify exec
const execAsync = promisify(exec);

// Define the audio directory
const audioDir = path.join(__dirname, '../public/audio');

// Make sure audio directory exists
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
  console.log(`Created audio directory at ${audioDir}`);
}

// List of audio files to generate
const audioFiles = [
  { type: 'sine', frequency: 440, filename: 'sine-440hz.mp3', desc: 'Sine Wave 440Hz' },
  { type: 'sine', frequency: 220, filename: 'sine-220hz.mp3', desc: 'Sine Wave 220Hz' },
  { type: 'white', filename: 'white-noise.mp3', desc: 'White Noise' },
  { type: 'pink', filename: 'pink-noise.mp3', desc: 'Pink Noise' },
  { type: 'triangle', frequency: 440, filename: 'triangle-wave.mp3', desc: 'Triangle Wave' }
];

// Generate audio files directly using ffmpeg if it's available
async function generateWithFfmpeg() {
  console.log('Checking for ffmpeg availability...');
  
  try {
    await execAsync('ffmpeg -version');
    console.log('ffmpeg is available, using it to generate audio files');
    
    const results = {
      generated: [],
      skipped: [],
      errors: []
    };
    
    // Process each audio file
    for (const file of audioFiles) {
      const outputPath = path.join(audioDir, file.filename);
      
      // Skip if file already exists
      if (fs.existsSync(outputPath)) {
        console.log(`File already exists: ${file.filename} - skipping`);
        results.skipped.push(file.filename);
        continue;
      }
      
      try {
        console.log(`Generating ${file.desc} (${file.filename})...`);
        
        let command;
        
        switch (file.type) {
          case 'sine':
            // Generate sine wave with perfect looping (30 seconds)
            command = `ffmpeg -f lavfi -i "sine=frequency=${file.frequency}:duration=30:sample_rate=44100" -c:a libmp3lame -q:a 2 "${outputPath}"`;
            break;
          case 'white':
            // Generate white noise (30 seconds)
            command = `ffmpeg -f lavfi -i "anoisesrc=color=white:duration=30:amplitude=0.1" -af "alimiter=level=0.1" -c:a libmp3lame -q:a 2 "${outputPath}"`;
            break;
          case 'pink':
            // Generate pink noise (30 seconds)
            command = `ffmpeg -f lavfi -i "anoisesrc=color=pink:duration=30:amplitude=0.1" -c:a libmp3lame -q:a 2 "${outputPath}"`;
            break;
          case 'triangle':
            // Generate triangle wave (30 seconds)
            command = `ffmpeg -f lavfi -i "aevalsrc=0.1*2/PI*(asin(sin(2*PI*${file.frequency}*t))):duration=30" -c:a libmp3lame -q:a 2 "${outputPath}"`;
            break;
          default:
            throw new Error(`Unknown audio type: ${file.type}`);
        }
        
        console.log(`Executing: ${command}`);
        await execAsync(command);
        
        console.log(`Successfully generated ${file.filename}`);
        results.generated.push(file.filename);
      } catch (error) {
        console.error(`Error generating ${file.filename}:`, error);
        results.errors.push({ file: file.filename, error: error.message });
      }
    }
    
    return results;
  } catch (error) {
    console.log('ffmpeg is not available. Using fallback method...');
    return generateWithFallback();
  }
}

// Fallback method to generate simple WAV files that will work in the browser
function generateWithFallback() {
  console.log('Using fallback method to generate basic audio files');
  
  const results = {
    generated: [],
    skipped: [],
    errors: []
  };
  
  // Create simple WAV files 
  for (const file of audioFiles) {
    // For the fallback method, always use WAV files
    const outputPath = path.join(audioDir, file.filename);
    
    // Skip if file already exists
    if (fs.existsSync(outputPath)) {
      console.log(`File already exists: ${file.filename} - skipping`);
      results.skipped.push(file.filename);
      continue;
    }
    
    try {
      console.log(`Generating ${file.desc} (${file.filename})...`);
      
      // Create very short audio files as placeholders
      // We'll create 1-second files that browsers can loop
      const headerSize = 44;
      const sampleRate = 44100;
      const numChannels = 2;
      const bitsPerSample = 16;
      const duration = 1; // seconds
      const numSamples = sampleRate * duration * numChannels;
      const dataSize = numSamples * (bitsPerSample / 8);
      const fileSize = headerSize + dataSize;
      
      const buffer = Buffer.alloc(fileSize);
      
      // Write WAV header
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(fileSize - 8, 4);
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16); // Subchunk1Size
      buffer.writeUInt16LE(1, 20); // PCM format
      buffer.writeUInt16LE(numChannels, 22);
      buffer.writeUInt32LE(sampleRate, 24);
      buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
      buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
      buffer.writeUInt16LE(bitsPerSample, 34);
      buffer.write('data', 36);
      buffer.writeUInt32LE(dataSize, 40);
      
      // Write sine wave data
      const amplitude = 0.1;
      let pos = headerSize;
      
      for (let i = 0; i < sampleRate * duration; i++) {
        let value = 0;
        
        switch (file.type) {
          case 'sine':
            // Simple sine wave
            value = Math.sin(2 * Math.PI * (file.frequency || 440) * i / sampleRate) * amplitude;
            break;
          case 'triangle':
            // Simple triangle wave approximation
            const period = sampleRate / (file.frequency || 440);
            const position = i % period;
            const normalized = position / period;
            if (normalized < 0.5) {
              value = (normalized * 4 - 1) * amplitude;
            } else {
              value = (3 - normalized * 4) * amplitude;
            }
            break;
          case 'white':
            // White noise
            value = (Math.random() * 2 - 1) * amplitude;
            break;
          case 'pink':
            // Simplified pink noise (just lower amplitude white noise for fallback)
            value = (Math.random() * 2 - 1) * amplitude * 0.7;
            break;
        }
        
        // Write the same value to both channels
        const sample = Math.floor(value < 0 ? value * 0x8000 : value * 0x7FFF);
        buffer.writeInt16LE(sample, pos);
        pos += 2;
        buffer.writeInt16LE(sample, pos);
        pos += 2;
      }
      
      // Write the file
      fs.writeFileSync(outputPath, buffer);
      
      console.log(`Successfully generated ${file.filename} (fallback version)`);
      results.generated.push(file.filename);
    } catch (error) {
      console.error(`Error generating ${file.filename}:`, error);
      results.errors.push({ file: file.filename, error: error.message });
    }
  }
  
  return results;
}

// Main function
async function generateAudioFiles() {
  console.log(`Generating audio files in ${audioDir}...`);
  
  // Try with ffmpeg first, then fall back to manual generation
  const results = await generateWithFfmpeg();
  
  // Print summary
  console.log('\nAudio generation summary:');
  console.log(`Generated: ${results.generated.length} files`);
  console.log(`Skipped: ${results.skipped.length} existing files`);
  console.log(`Errors: ${results.errors.length} files`);
  
  if (results.errors.length > 0) {
    console.error('Error details:', JSON.stringify(results.errors, null, 2));
  }
  
  return results;
}

// Run the generator
generateAudioFiles()
  .then(results => {
    const totalSuccess = results.generated.length + results.skipped.length;
    const totalFiles = audioFiles.length;
    
    if (totalSuccess === totalFiles) {
      console.log(`Successfully processed all ${totalFiles} audio files!`);
      process.exit(0);
    } else {
      console.error(`Failed to process some audio files. Check logs for details.`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Fatal error in audio generation:', error);
    process.exit(1);
  }); 