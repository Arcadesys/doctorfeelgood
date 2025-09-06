import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FileUpload from './FileUpload';

// Mock the audioUtils
vi.mock('../lib/audioUtils', () => ({
  isValidAudioFile: vi.fn(),
  revokeFileUrl: vi.fn(),
}));

import { isValidAudioFile, revokeFileUrl } from '../lib/audioUtils';

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'blob:mock-url'),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FileUpload', () => {
  const defaultProps = {
    onFileSelect: vi.fn(),
  };

  it('renders upload button when no file selected', () => {
    render(<FileUpload {...defaultProps} />);
    expect(screen.getByText('Upload Audio')).toBeDefined();
  });

  it('renders change button when file is selected', () => {
    render(
      <FileUpload 
        {...defaultProps} 
        currentFileName="test.mp3" 
        currentFileUrl="blob:test-url" 
      />
    );
    expect(screen.getByText('Change Audio')).toBeDefined();
  });

  it('displays current filename when file is selected', () => {
    render(
      <FileUpload 
        {...defaultProps} 
        currentFileName="my-audio-file.mp3" 
        currentFileUrl="blob:test-url" 
      />
    );
    expect(screen.getByText('my-audio-file.mp3')).toBeDefined();
  });

  it('shows clear button when file is selected', () => {
    render(
      <FileUpload 
        {...defaultProps} 
        currentFileName="test.mp3" 
        currentFileUrl="blob:test-url" 
      />
    );
    expect(screen.getByText('Clear')).toBeDefined();
  });

  it('hides clear button when no file is selected', () => {
    render(<FileUpload {...defaultProps} />);
    expect(screen.queryByText('Clear')).toBeNull();
  });

  it('opens file picker when upload button is clicked', () => {
    render(<FileUpload {...defaultProps} />);
    const uploadButton = screen.getByText('Upload Audio');
    
    // Create a spy on the hidden input's click method
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(hiddenInput, 'click').mockImplementation(() => {});
    
    fireEvent.click(uploadButton);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('calls onFileSelect with valid audio file', () => {
    const onFileSelect = vi.fn();
    (isValidAudioFile as any).mockReturnValue(true);
    
    render(<FileUpload {...defaultProps} onFileSelect={onFileSelect} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(isValidAudioFile).toHaveBeenCalledWith(file);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(onFileSelect).toHaveBeenCalledWith('blob:mock-url', 'test.mp3');
  });

  it('shows alert for invalid audio file', () => {
    (isValidAudioFile as any).mockReturnValue(false);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['not audio'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(isValidAudioFile).toHaveBeenCalledWith(file);
    expect(alertSpy).toHaveBeenCalledWith('Please select a valid audio file.');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    
    alertSpy.mockRestore();
  });

  it('revokes previous blob URL when new file is selected', () => {
    const onFileSelect = vi.fn();
    (isValidAudioFile as any).mockReturnValue(true);
    
    render(
      <FileUpload 
        {...defaultProps} 
        onFileSelect={onFileSelect}
        currentFileUrl="blob:previous-url" 
      />
    );
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(revokeFileUrl).toHaveBeenCalledWith('blob:previous-url');
  });

  it('calls onFileSelect with empty values when clear is clicked', () => {
    const onFileSelect = vi.fn();
    
    render(
      <FileUpload 
        {...defaultProps} 
        onFileSelect={onFileSelect}
        currentFileName="test.mp3"
        currentFileUrl="blob:test-url" 
      />
    );
    
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    expect(revokeFileUrl).toHaveBeenCalledWith('blob:test-url');
    expect(onFileSelect).toHaveBeenCalledWith('', '');
  });

  it('clears file input value when clear is clicked', () => {
    render(
      <FileUpload 
        {...defaultProps} 
        currentFileName="test.mp3"
        currentFileUrl="blob:test-url" 
      />
    );
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    // File input value should be empty (can't set programmatically to non-empty)
    expect(fileInput.value).toBe('');
  });

  it('handles file selection without files array', () => {
    const onFileSelect = vi.fn();
    
    render(<FileUpload {...defaultProps} onFileSelect={onFileSelect} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: null } });
    
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('handles file selection with empty files array', () => {
    const onFileSelect = vi.fn();
    
    render(<FileUpload {...defaultProps} onFileSelect={onFileSelect} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });
    
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('uses custom accept attribute when provided', () => {
    render(<FileUpload {...defaultProps} accept="audio/mp3" />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput.accept).toBe('audio/mp3');
  });

  it('defaults to audio/* accept attribute', () => {
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput.accept).toBe('audio/*');
  });

  it('truncates long filenames for display', () => {
    const longFilename = 'this-is-a-very-long-filename-that-should-be-truncated-for-display.mp3';
    
    render(
      <FileUpload 
        {...defaultProps} 
        currentFileName={longFilename}
        currentFileUrl="blob:test-url" 
      />
    );
    
    const filenameSpan = screen.getByText(longFilename);
    expect(filenameSpan).toBeDefined();
    
    // Check that the span has styling for text overflow
    const computedStyle = getComputedStyle(filenameSpan);
    expect(filenameSpan.style.maxWidth || computedStyle.maxWidth).toBe('150px');
  });

  it('has proper accessibility attributes', () => {
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput.getAttribute('aria-label')).toBe('Upload audio file');
  });
});