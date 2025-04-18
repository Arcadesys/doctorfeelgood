'use client';

import React, { useState } from 'react';
import { sampleAudioFiles } from '@/utils/sampleAudio';

export default function AudioTest() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [showSamples, setShowSamples] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setAudioFile(file);
    
    // Create a blob URL for the audio file
    const fileUrl = URL.createObjectURL(file);
    setAudioUrl(fileUrl);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Audio Test Utility</h1>
      
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">
          This utility helps test different audio files for use with the EMDR processor. 
          Upload a file below to see if it works with the Web Audio API.
        </p>
        
        <div className="border rounded p-4 bg-gray-50 mb-4">
          <h2 className="text-lg font-semibold mb-2">Upload Audio File</h2>
          
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="w-full p-2 border rounded mb-4"
          />
          
          {error && (
            <div className="mt-2 p-3 bg-red-100 text-red-800 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {audioFile && audioUrl && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Test Your Audio</h3>
              <p className="text-sm mb-2">
                File: <strong>{audioFile.name}</strong> ({Math.round(audioFile.size / 1024)} KB)
              </p>
              <audio 
                src={audioUrl} 
                controls 
                className="w-full"
                onError={(e) => setError('Audio file could not be played. It may be in an unsupported format.')}
              />
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <button
          onClick={() => setShowSamples(!showSamples)}
          className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {showSamples ? 'Hide Sample Audio' : 'Show Sample Audio'}
        </button>
        
        {showSamples && (
          <div className="border rounded p-4 bg-gray-50">
            <h2 className="text-xl font-semibold mb-4">Sample Audio Files</h2>
            <p className="mb-4 text-sm text-gray-600">
              These royalty-free audio samples are available in the app by default.
            </p>
            
            <div className="grid gap-4">
              {sampleAudioFiles.map((sample) => (
                <div key={sample.id} className="border rounded p-3">
                  <h3 className="font-medium mb-1">{sample.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{sample.description}</p>
                  <audio 
                    src={sample.url} 
                    controls 
                    className="w-full"
                    onError={(e) => console.error(`Error playing ${sample.title}:`, e)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-bold">Supported Audio Formats:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>MP3 (.mp3) - Most widely supported</li>
          <li>WAV (.wav) - High quality, larger file size</li>
          <li>OGG (.ogg) - Good compression, not supported in all browsers</li>
          <li>M4A (.m4a) - Good quality and compression</li>
          <li>FLAC (.flac) - Lossless quality, large file size, limited browser support</li>
        </ul>
      </div>
    </div>
  );
} 