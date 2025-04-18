'use client';

import React from 'react';
import Link from 'next/link';

export function EMDRProcessor() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
      <h1 className="text-3xl font-bold mb-6 text-white">EMDR Audio Processing</h1>
      <p className="text-white mb-8 text-center">
        Please use our Simple Audio Panner for reliable stereo panning
      </p>
      <Link href="/panner" passHref>
        <button className="bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold py-3 px-6 rounded">
          Open Simple Panner
        </button>
      </Link>
    </div>
  );
} 