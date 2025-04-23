import React from 'react';
import { SettingsBase } from './SettingsBase';
import { SettingsComponentProps } from '../types/settings';

export const SettingsDrawer: React.FC<SettingsComponentProps> = (props) => {
  return <SettingsBase {...props} showTabs={true} />;
}; 