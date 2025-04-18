'use client';

import React, { useState } from 'react';

export default function YouTubeTest() {
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');

  const testYouTubeAPI = async () => {
    if (!url) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch(`/api/youtube?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to fetch YouTube audio');
      }

      setResults(data);
      
      // If formats are available, set the first one as audio URL
      if (data.formats && data.formats.length > 0) {
        setAudioUrl(data.formats[0].url);
      }
    } catch (error) {
      console.error('Error testing YouTube API:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">YouTube Audio Test Utility</h1>
      
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">
          This utility helps test YouTube audio extraction. Enter a YouTube URL below to test if our API can extract audio information.
        </p>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={testYouTubeAPI}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test URL'}
          </button>
        </div>
        
        {error && (
          <div className="mt-2 p-3 bg-red-100 text-red-800 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
      
      {results && (
        <div className="border rounded p-4 bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Results:</h2>
          
          <div className="mb-4">
            <p><strong>Title:</strong> {results.title}</p>
            <p><strong>Video ID:</strong> {results.videoId}</p>
            <p><strong>Formats found:</strong> {results.formats?.length || 0}</p>
          </div>
          
          {results.formats && results.formats.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2">Audio Formats:</h3>
              <div className="max-h-40 overflow-y-auto bg-gray-100 p-2 rounded">
                <pre className="text-xs">{JSON.stringify(results.formats, null, 2)}</pre>
              </div>
              
              {audioUrl && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Test Audio:</h3>
                  <audio 
                    src={audioUrl} 
                    controls 
                    className="w-full"
                    onError={() => setError('Audio stream could not be played. Check console for details.')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Some YouTube formats may not be directly playable due to content restrictions.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-bold">Troubleshooting:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>YouTube restricts certain videos from being accessed via third-party tools</li>
          <li>If you see a 500 error, check server logs for details</li>
          <li>Some videos may work while others don't due to content restrictions</li>
          <li>Try using non-copyrighted content like Creative Commons videos</li>
        </ul>
      </div>
    </div>
  );
} 