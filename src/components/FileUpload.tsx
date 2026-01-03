import React, { useCallback, useRef, useState } from 'react';
import { isValidAudioFile, revokeFileUrl } from '../lib/audioUtils';
import { saveCustomAudio, clearCustomAudio } from '../lib/storage';

type Props = {
  onFileSelect: (fileUrl: string, fileName: string) => void;
  currentFileName?: string;
  currentFileUrl?: string;
  accept?: string;
};

export default function FileUpload({ onFileSelect, currentFileName, currentFileUrl, accept = "audio/*" }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isValidAudioFile(file)) {
      setError('Please select a valid audio file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Revoke previous blob URL to prevent memory leaks
    if (currentFileUrl && currentFileUrl.startsWith('blob:')) {
      revokeFileUrl(currentFileUrl);
    }

    // Save to localStorage and get data URL
    const result = await saveCustomAudio(file);
    
    setIsLoading(false);
    
    if (result.success && result.dataUrl) {
      onFileSelect(result.dataUrl, file.name);
    } else {
      setError(result.error || 'Failed to save audio file');
    }
  }, [onFileSelect, currentFileUrl]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    // Revoke blob URL if it's a blob
    if (currentFileUrl && currentFileUrl.startsWith('blob:')) {
      revokeFileUrl(currentFileUrl);
    }
    // Clear from localStorage
    clearCustomAudio();
    onFileSelect('', '');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect, currentFileUrl]);

  return (
    <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label="Upload audio file"
      />
      <button
        type="button"
        className="btn"
        onClick={handleClick}
        disabled={isLoading}
        style={{ fontSize: '12px', padding: '4px 8px' }}
      >
        {isLoading ? 'Saving...' : currentFileName ? 'Change' : 'Upload'} Audio
      </button>
      {currentFileName && (
        <>
          <span className="label" style={{ fontSize: '12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentFileName}
          </span>
          <button
            type="button"
            className="btn"
            onClick={handleClear}
            style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#ff4444', color: 'white' }}
          >
            Clear
          </button>
        </>
      )}
      {error && (
        <span style={{ fontSize: '11px', color: '#ff6b6b', width: '100%' }}>
          {error}
        </span>
      )}
    </div>
  );
}