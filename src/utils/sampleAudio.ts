// Collection of properly licensed royalty-free audio samples 
// All sounds are either CC0 (public domain) or explicitly noted with attribution
export const sampleAudioFiles = [
  {
    id: 'whitenoise',
    title: 'White Noise',
    url: 'https://cdn.freesound.org/previews/133/133099_1197050-lq.mp3',
    description: 'White noise for focus and relaxation - CC0',
    license: 'CC0',
    attribution: 'From Freesound.org by unfa (CC0)'
  },
  {
    id: 'meditation',
    title: 'Meditation Bell',
    url: 'https://cdn.freesound.org/previews/414/414360_594771-lq.mp3',
    description: 'Soft meditation bell tones - CC0',
    license: 'CC0',
    attribution: 'From Freesound.org by thedapperdan (CC0)'
  },
  {
    id: 'piano',
    title: 'Piano Notes',
    url: 'https://cdn.freesound.org/previews/634/634893_11861866-lq.mp3',
    description: 'Gentle piano notes for relaxation - CC0',
    license: 'CC0',
    attribution: 'From Freesound.org by SergeQuadrado (CC0)'
  },
  {
    id: 'waves',
    title: 'Ocean Waves',
    url: 'https://cdn.freesound.org/previews/617/617306_5674468-lq.mp3',
    description: 'Calming ocean waves on the shore - CC0',
    license: 'CC0',
    attribution: 'From Freesound.org by Anthousai (CC0)'
  },
  {
    id: 'sinewave',
    title: 'Pure Tone',
    url: 'https://cdn.freesound.org/previews/131/131565_2398403-lq.mp3',
    description: 'Clean 440Hz tone for focus and alignment - CC0',
    license: 'CC0',
    attribution: 'From Freesound.org by Timbre (CC0)'
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