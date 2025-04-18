'use client';

import { useEffect, useState } from 'react';
import { sampleAudioFiles } from '@/utils/sampleAudio';

/**
 * This component checks if the required audio files exist, and triggers generation if needed.
 * It can be placed in layout.tsx to run when the app starts.
 */
export default function AudioFilesChecker() {
  const [checkStatus, setCheckStatus] = useState<'checking' | 'complete' | 'error'>('checking');
  const [missingFiles, setMissingFiles] = useState<string[]>([]);

  useEffect(() => {
    async function checkAndGenerateAudioFiles() {
      try {
        console.log('Checking audio files...');
        
        // First, check which files exist via the API
        const checkResponse = await fetch('/api/generate-audio');
        
        if (!checkResponse.ok) {
          console.error('Error checking audio files:', await checkResponse.text());
          setCheckStatus('error');
          return;
        }
        
        const checkData = await checkResponse.json();
        
        // If all files exist, we're done
        if (checkData.success) {
          console.log('All audio files exist.');
          setCheckStatus('complete');
          return;
        }
        
        // Otherwise, some files are missing - trigger generation
        console.log('Missing audio files, triggering generation...');
        setMissingFiles(checkData.missingFiles.map((f: any) => f.filename));
        
        // Trigger generation via POST request
        const generateResponse = await fetch('/api/generate-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!generateResponse.ok) {
          console.error('Error generating audio files:', await generateResponse.text());
          setCheckStatus('error');
          return;
        }
        
        const generateData = await generateResponse.json();
        
        if (generateData.success) {
          console.log('Successfully generated audio files:', generateData.generated);
          setCheckStatus('complete');
        } else {
          console.error('Failed to generate some audio files:', generateData.errors);
          setCheckStatus('error');
        }
      } catch (error) {
        console.error('Error checking/generating audio files:', error);
        setCheckStatus('error');
      }
    }
    
    // Run the check only once when the component mounts
    checkAndGenerateAudioFiles();
  }, []);
  
  // This component doesn't render anything visible
  // But we could show a toast or notification if files are being generated
  return (
    <div className="sr-only" aria-live="polite">
      {checkStatus === 'checking' && 'Checking required audio files...'}
      {checkStatus === 'complete' && 'Audio files check complete.'}
      {checkStatus === 'error' && 'Error checking audio files.'}
      
      {missingFiles.length > 0 && (
        <span>
          Generating missing audio files: {missingFiles.join(', ')}
        </span>
      )}
    </div>
  );
} 