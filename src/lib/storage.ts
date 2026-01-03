const KEY = 'emdr-config-v1';
const AUDIO_KEY = 'emdr-custom-audio-v1';

export function saveJSON<T>(value: T) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function loadJSON<T>(): T | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Convert a File/Blob to a base64 data URL for localStorage storage
 */
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Save custom audio file to localStorage as base64
 * Returns true if successful, false if storage quota exceeded
 */
export async function saveCustomAudio(file: File): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  try {
    const dataUrl = await fileToDataUrl(file);
    
    // Check size - localStorage typically has 5-10MB limit
    // Base64 encoding increases size by ~33%, so be conservative
    const sizeBytes = dataUrl.length;
    const sizeMB = sizeBytes / (1024 * 1024);
    
    if (sizeMB > 4) {
      return { success: false, error: `File too large (${sizeMB.toFixed(1)}MB). Max ~4MB for localStorage.` };
    }
    
    const audioData = {
      dataUrl,
      fileName: file.name,
      mimeType: file.type,
      savedAt: Date.now()
    };
    
    localStorage.setItem(AUDIO_KEY, JSON.stringify(audioData));
    return { success: true, dataUrl };
  } catch (e) {
    // Likely quota exceeded
    const message = e instanceof Error ? e.message : 'Storage quota exceeded';
    return { success: false, error: message };
  }
}

/**
 * Load custom audio from localStorage
 * Returns the data URL and filename if available
 */
export function loadCustomAudio(): { dataUrl: string; fileName: string } | null {
  try {
    const raw = localStorage.getItem(AUDIO_KEY);
    if (!raw) return null;
    
    const data = JSON.parse(raw);
    return { dataUrl: data.dataUrl, fileName: data.fileName };
  } catch {
    return null;
  }
}

/**
 * Clear custom audio from localStorage
 */
export function clearCustomAudio(): void {
  localStorage.removeItem(AUDIO_KEY);
}

/**
 * Get the size of stored custom audio in MB
 */
export function getStoredAudioSize(): number {
  const raw = localStorage.getItem(AUDIO_KEY);
  if (!raw) return 0;
  return raw.length / (1024 * 1024);
}

