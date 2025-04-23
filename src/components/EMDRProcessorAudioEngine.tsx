import React from 'react';
import { SettingsBase } from './SettingsBase';
import { SettingsComponentProps } from '../types/settings';

export const EMDRProcessorAudioEngine: React.FC<SettingsComponentProps> = (props) => {
  return <SettingsBase {...props} title="Audio Settings" />;
}; 