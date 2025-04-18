'use client';

import React from 'react';
import Link from 'next/link';

export function EMDRProcessor() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
      <h1 className="text-3xl font-bold mb-6 text-white">EMDR Audio Processing</h1>
      <p className="text-white mb-4 text-center">
        Choose your preferred audio panning method
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-8">
        <Link href="/panner" passHref className="flex-1">
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold py-3 px-6 rounded">
            Simple Panner
          </button>
        </Link>
        
        <Link href="/beat-sync" passHref className="flex-1">
          <button className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xl font-bold py-3 px-6 rounded relative group">
            Beat-Sync Panner
            <span className="absolute top-0 right-0 -mt-2 -mr-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold transform group-hover:scale-110 transition-transform">NEW</span>
          </button>
        </Link>
      </div>
      
      <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded text-white">
          <h2 className="font-bold mb-2">Simple Panner</h2>
          <ul className="text-sm space-y-1 list-disc pl-4">
            <li>Manual control of panning speed</li>
            <li>Classic sine wave oscillation</li>
            <li>Consistent, predictable pattern</li>
            <li>Good for relaxation & meditation</li>
          </ul>
        </div>
        
        <div className="bg-purple-900 p-4 rounded text-white">
          <h2 className="font-bold mb-2">Beat-Sync Panner</h2>
          <ul className="text-sm space-y-1 list-disc pl-4">
            <li>Syncs panning with music beats</li>
            <li>Upload your favorite songs</li>
            <li>Automatic BPM detection</li>
            <li>Perfect for rhythmic processing</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 