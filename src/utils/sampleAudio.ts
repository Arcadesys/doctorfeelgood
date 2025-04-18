// Collection of royalty-free audio samples that can be used when YouTube isn't available
export const sampleAudioFiles = [
  {
    id: 'rainforest',
    title: 'Rainforest Ambience',
    url: 'https://cdn.freesound.org/previews/454/454629_5121236-lq.mp3', // Rainforest ambience
    description: 'Peaceful rainforest sounds with birds and water'
  },
  {
    id: 'ocean',
    title: 'Ocean Waves',
    url: 'https://cdn.freesound.org/previews/416/416710_2159689-lq.mp3', // Ocean waves
    description: 'Calming ocean waves on the shore'
  },
  {
    id: 'whiteNoise',
    title: 'White Noise',
    url: 'https://cdn.freesound.org/previews/133/133099_1197050-lq.mp3', // White noise
    description: 'Gentle white noise for focus and relaxation'
  },
  {
    id: 'meditation',
    title: 'Meditation Bell',
    url: 'https://cdn.freesound.org/previews/414/414360_594771-lq.mp3', // Meditation bell
    description: 'Soft meditation bell tones'
  },
  {
    id: 'piano',
    title: 'Relaxing Piano',
    url: 'https://cdn.freesound.org/previews/442/442595_7727081-lq.mp3', // Piano
    description: 'Gentle piano melody for relaxation'
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