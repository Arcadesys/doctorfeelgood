import React, { useCallback, useRef } from 'react';

type Props = {
  onIconSelect: (dataUrl: string, fileName: string) => void;
  currentFileName?: string;
  currentIconUrl?: string;
};

const MAX_FILE_SIZE = 512 * 1024; // 512KB max
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'];

function isValidImageFile(file: File): boolean {
  return ALLOWED_TYPES.includes(file.type);
}

export default function IconUpload({ onIconSelect, currentFileName, currentIconUrl }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isValidImageFile(file)) {
      alert('Please select a valid image file (PNG, JPEG, GIF, SVG, or WebP).');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert('Image file is too large. Please select an image under 512KB.');
      return;
    }

    // Read file as data URL for localStorage persistence
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onIconSelect(dataUrl, file.name);
    };
    reader.onerror = () => {
      alert('Failed to read the image file.');
    };
    reader.readAsDataURL(file);
  }, [onIconSelect]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    onIconSelect('', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onIconSelect]);

  return (
    <div className="icon-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label="Upload custom icon"
      />
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        {currentIconUrl && (
          <img 
            src={currentIconUrl} 
            alt="Custom icon preview" 
            className="icon-preview"
          />
        )}
        <button
          type="button"
          className="btn"
          onClick={handleClick}
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          {currentFileName ? 'Change' : 'Upload'} Icon
        </button>
        {currentFileName && (
          <>
            <span 
              className="label" 
              style={{ 
                fontSize: '11px', 
                maxWidth: '100px', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap' 
              }}
              title={currentFileName}
            >
              {currentFileName}
            </span>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleClear}
              style={{ fontSize: '12px', padding: '4px 8px' }}
              aria-label="Remove custom icon"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
