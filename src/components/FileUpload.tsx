import React, { useCallback, useRef } from 'react';
import { isValidAudioFile, revokeFileUrl } from '../lib/audioUtils';

type Props = {
  onFileSelect: (fileUrl: string, fileName: string) => void;
  currentFileName?: string;
  currentFileUrl?: string;
  accept?: string;
};

export default function FileUpload({ onFileSelect, currentFileName, currentFileUrl, accept = "audio/*" }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isValidAudioFile(file)) {
      alert('Please select a valid audio file.');
      return;
    }

    // Revoke previous blob URL to prevent memory leaks
    if (currentFileUrl) {
      revokeFileUrl(currentFileUrl);
    }

    // Create a blob URL for the file
    const fileUrl = URL.createObjectURL(file);
    onFileSelect(fileUrl, file.name);
  }, [onFileSelect, currentFileUrl]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    // Revoke blob URL when clearing
    if (currentFileUrl) {
      revokeFileUrl(currentFileUrl);
    }
    onFileSelect('', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect, currentFileUrl]);

  return (
    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
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
        style={{ fontSize: '12px', padding: '4px 8px' }}
      >
        {currentFileName ? 'Change' : 'Upload'} Audio
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
    </div>
  );
}