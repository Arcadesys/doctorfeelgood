import { generateClickSound } from '../src/lib/audioGenerator';
import fs from 'fs/promises';
import path from 'path';

async function generateAndSaveClickSounds() {
  try {
    // Ensure the sounds directory exists
    const soundsDir = path.join(process.cwd(), 'public', 'sounds');
    await fs.mkdir(soundsDir, { recursive: true });
    
    // Generate left click
    console.log('Generating left click sound...');
    const leftClick = generateClickSound(false);
    await fs.writeFile(
      path.join(soundsDir, 'click-left.wav'),
      leftClick
    );
    
    // Generate right click
    console.log('Generating right click sound...');
    const rightClick = generateClickSound(true);
    await fs.writeFile(
      path.join(soundsDir, 'click-right.wav'),
      rightClick
    );
    
    console.log('Click sounds generated successfully!');
  } catch (error) {
    console.error('Error generating click sounds:', error);
    process.exit(1);
  }
}

generateAndSaveClickSounds(); 