// Collection of local audio samples in the public directory
export const sampleAudioFiles = [
  {
    id: 'whitenoise',
    title: 'White Noise',
    url: '/audio/white-noise.mp3',
    description: 'White noise for focus and relaxation',
    license: 'CC0',
    attribution: 'Generated with Web Audio API (CC0)'
  },
  {
    id: 'sinewave440',
    title: 'Sine Wave 440Hz',
    url: '/audio/sine-440hz.mp3',
    description: 'Clean 440Hz sine wave tone',
    license: 'CC0',
    attribution: 'Generated with Web Audio API (CC0)'
  },
  {
    id: 'sinewave220',
    title: 'Sine Wave 220Hz',
    url: '/audio/sine-220hz.mp3',
    description: 'Deeper 220Hz sine wave tone',
    license: 'CC0',
    attribution: 'Generated with Web Audio API (CC0)'
  },
  {
    id: 'triangle',
    title: 'Triangle Wave',
    url: '/audio/triangle-wave.mp3',
    description: 'Soft triangle wave for gentle stimulation',
    license: 'CC0',
    attribution: 'Generated with Web Audio API (CC0)'
  },
  {
    id: 'pinknoise',
    title: 'Pink Noise',
    url: '/audio/pink-noise.mp3',
    description: 'Gentle pink noise for relaxation',
    license: 'CC0',
    attribution: 'Generated with Web Audio API (CC0)'
  }
];

// Get a specific audio file by ID
export const getSampleAudioById = (id: string) => {
  return sampleAudioFiles.find(audio => audio.id === id) || sampleAudioFiles[0];
};

// Get a random audio file
export const getRandomSampleAudio = () => {
  const randomIndex = Math.floor(Math.random() * sampleAudioFiles.length);
  return sampleAudioFiles[randomIndex];
}; 