export interface EMDRSettings {
  speed: number;
  sessionDuration: number;
  audioMode: boolean;
  volume: number;
  targetSize: number;
  targetColor: string;
  backgroundColor: string;
}

export interface SettingsComponentProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EMDRSettings;
  onSettingsChange: (settings: Partial<EMDRSettings>) => void;
  title?: string;
  showTabs?: boolean;
  isSessionActive?: boolean;
  onSettingChange?: (settingName: string, value: string | number | boolean) => Promise<void>;
  onPresetSelect?: () => void;
} 