import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// List of required audio files
const REQUIRED_AUDIO_FILES = [
  { id: 'sinewave440', filename: 'sine-440hz.mp3', displayName: 'Sine Wave 440Hz' },
  { id: 'sinewave220', filename: 'sine-220hz.mp3', displayName: 'Sine Wave 220Hz' },
  { id: 'whitenoise', filename: 'white-noise.mp3', displayName: 'White Noise' },
  { id: 'pinknoise', filename: 'pink-noise.mp3', displayName: 'Pink Noise' },
  { id: 'triangle', filename: 'triangle-wave.mp3', displayName: 'Triangle Wave' },
];

// Function to check if audio files exist
function checkAudioFiles() {
  const audioDir = path.join(process.cwd(), 'public', 'audio');
  
  // Make sure the audio directory exists
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
    console.log(`Created audio directory at ${audioDir}`);
  }
  
  // Check which files exist and which need to be generated
  const status = REQUIRED_AUDIO_FILES.map(file => {
    const filePath = path.join(audioDir, file.filename);
    const exists = fs.existsSync(filePath);
    return {
      ...file,
      exists,
      path: filePath,
    };
  });
  
  return {
    audioDir,
    status,
    allExist: status.every(file => file.exists),
    missingFiles: status.filter(file => !file.exists),
  };
}

// Main API route handler for GET requests
export async function GET() {
  const audioCheck = checkAudioFiles();
  
  if (audioCheck.allExist) {
    return NextResponse.json({
      success: true,
      message: 'All audio files exist',
      files: audioCheck.status,
    });
  }
  
  return NextResponse.json({
    success: false,
    message: 'Some audio files are missing',
    missingFiles: audioCheck.missingFiles,
    instructions: 'Use POST request to generate missing files',
    generated: false,
  });
}

// POST handler to generate audio files
export async function POST() {
  const audioCheck = checkAudioFiles();
  
  if (audioCheck.allExist) {
    return NextResponse.json({
      success: true,
      message: 'All audio files already exist',
      files: audioCheck.status,
      generated: false,
    });
  }
  
  try {
    // Get the absolute path to our script
    const scriptPath = path.join(process.cwd(), 'scripts', 'server-audio-generator.js');
    
    // Execute the audio generation script
    console.log(`Running audio generator script at ${scriptPath}`);
    
    // Check if the script exists 
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({
        success: false,
        message: 'Audio generation script not found',
        scriptPath,
        error: 'Server is missing the audio generation script',
      }, { status: 500 });
    }
    
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`);
    
    // Check if files were generated
    const newAudioCheck = checkAudioFiles();
    
    return NextResponse.json({
      success: newAudioCheck.allExist,
      message: newAudioCheck.allExist 
        ? 'Successfully generated all audio files' 
        : 'Some audio files could not be generated',
      files: newAudioCheck.status,
      generated: true,
      stdout,
      stderr: stderr || undefined,
    });
  } catch (error) {
    console.error('Error generating audio files:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error generating audio files',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
} 