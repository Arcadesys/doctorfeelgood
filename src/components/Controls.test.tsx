import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Controls from './Controls';
import { AppConfig } from '../types';

function createDefaultConfig(): AppConfig {
  return {
    durationSec: 120,
    target: {
      sizePx: 24,
      color: '#00FF88',
      shape: 'circle',
      rotate: false,
      speedPxPerSec: 400,
      edgePaddingPx: 16,
      edgePauseMs: 0,
      startPosition: 'center',
    },
    audio: { mode: 'click', volume: 0.8, waveform: 'square' },
  };
}

function renderControls(overrides?: {
  playing?: boolean;
  remainingSec?: number;
  config?: Partial<AppConfig>;
  onPlay?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onConfigChange?: (config: AppConfig) => void;
}) {
  const defaultConfig = createDefaultConfig();
  const config = {
    ...defaultConfig,
    ...overrides?.config,
    target: { ...defaultConfig.target, ...overrides?.config?.target },
    audio: { ...defaultConfig.audio, ...overrides?.config?.audio },
  };
  
  const props = {
    playing: overrides?.playing ?? false,
    remainingSec: overrides?.remainingSec ?? 120,
    onPlay: overrides?.onPlay ?? vi.fn(),
    onStop: overrides?.onStop ?? vi.fn(),
    onReset: overrides?.onReset ?? vi.fn(),
    config,
    onConfigChange: overrides?.onConfigChange ?? vi.fn(),
  };
  
  render(<Controls {...props} />);
  return props;
}

describe('Controls', () => {
  describe('Transport controls', () => {
    it('renders play button enabled when not playing', () => {
      renderControls({ playing: false });
      const playButton = screen.getByLabelText('Play') as HTMLButtonElement;
      expect(playButton.disabled).toBe(false);
    });

    it('renders play button disabled when playing', () => {
      renderControls({ playing: true });
      const playButton = screen.getByLabelText('Play') as HTMLButtonElement;
      expect(playButton.disabled).toBe(true);
    });

    it('renders stop button enabled when playing', () => {
      renderControls({ playing: true });
      const stopButton = screen.getByLabelText('Stop') as HTMLButtonElement;
      expect(stopButton.disabled).toBe(false);
    });

    it('renders stop button disabled when not playing', () => {
      renderControls({ playing: false });
      const stopButton = screen.getByLabelText('Stop') as HTMLButtonElement;
      expect(stopButton.disabled).toBe(true);
    });

    it('calls onPlay when play button is clicked', () => {
      const onPlay = vi.fn();
      renderControls({ onPlay });
      fireEvent.click(screen.getByLabelText('Play'));
      expect(onPlay).toHaveBeenCalled();
    });

    it('calls onStop when stop button is clicked', () => {
      const onStop = vi.fn();
      renderControls({ playing: true, onStop });
      fireEvent.click(screen.getByLabelText('Stop'));
      expect(onStop).toHaveBeenCalled();
    });

    it('calls onReset when reset button is clicked', () => {
      const onReset = vi.fn();
      renderControls({ onReset });
      fireEvent.click(screen.getByLabelText('Reset session'));
      expect(onReset).toHaveBeenCalled();
    });
  });

  describe('Time display', () => {
    it('displays remaining time in MM:SS format', () => {
      renderControls({ remainingSec: 125 });
      expect(screen.getByText('2:05')).toBeDefined();
    });

    it('displays time with zero padding', () => {
      renderControls({ remainingSec: 65 });
      expect(screen.getByText('1:05')).toBeDefined();
    });

    it('displays zero time correctly', () => {
      renderControls({ remainingSec: 0 });
      expect(screen.getByText('0:00')).toBeDefined();
    });

    it('displays times under a minute correctly', () => {
      renderControls({ remainingSec: 45 });
      // Use getByLabelText to find the specific time display element
      const timeDisplay = screen.getByLabelText('Session controls').querySelector('.time');
      expect(timeDisplay?.textContent).toBe('0:45');
    });
  });

  describe('Speed control', () => {
    it('updates speed when range input changes', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const speedSlider = screen.getByDisplayValue('400');
      fireEvent.change(speedSlider, { target: { value: '600' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ speedPxPerSec: 600 })
        })
      );
    });

    it('displays BPM calculation', () => {
      renderControls({ 
        config: { 
          target: { 
            sizePx: 24,
            color: '#00FF88', 
            speedPxPerSec: 2400,
            edgePaddingPx: 16,
            edgePauseMs: 0,
            startPosition: 'center',
          } 
        } 
      });
      expect(screen.getByText(/60 BPM/)).toBeDefined();
    });
  });

  describe('Target controls', () => {
    it('updates target size', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const sizeSlider = screen.getByDisplayValue('24');
      fireEvent.change(sizeSlider, { target: { value: '32' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ sizePx: 32 })
        })
      );
    });

    it('updates target shape', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const shapeSelect = screen.getByDisplayValue('Circle');
      fireEvent.change(shapeSelect, { target: { value: 'square' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ shape: 'square' })
        })
      );
    });

    it('updates target rotation', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const rotateCheckbox = screen.getByLabelText('Rotate');
      fireEvent.click(rotateCheckbox);
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ rotate: true })
        })
      );
    });

    it('updates start position', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const startSelect = screen.getByDisplayValue('Center');
      fireEvent.change(startSelect, { target: { value: 'left' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ startPosition: 'left' })
        })
      );
    });

    it('updates edge padding', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const paddingInput = screen.getByDisplayValue('16');
      fireEvent.change(paddingInput, { target: { value: '20' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ edgePaddingPx: 20 })
        })
      );
    });

    it('updates edge pause', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const pauseInput = screen.getByDisplayValue('0');
      fireEvent.change(pauseInput, { target: { value: '100' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ edgePauseMs: 100 })
        })
      );
    });
  });

  describe('Audio controls', () => {
    it('updates volume', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const volumeSlider = screen.getByDisplayValue('0.8');
      fireEvent.change(volumeSlider, { target: { value: '0.5' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({ volume: 0.5 })
        })
      );
    });

    it('updates audio mode', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const audioSelect = screen.getByDisplayValue('Click');
      fireEvent.change(audioSelect, { target: { value: 'beep' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({ mode: 'beep' })
        })
      );
    });

    it('shows waveform selector only for click mode', () => {
      renderControls({ config: { audio: { mode: 'click', volume: 0.8, waveform: 'square' } } });
      expect(screen.getByText('Waveform')).toBeDefined();
    });

    it('hides waveform selector for non-click modes', () => {
      renderControls({ config: { audio: { mode: 'beep', volume: 0.8 } } });
      expect(screen.queryByText('Waveform')).toBeNull();
    });

    it('updates waveform when in click mode', () => {
      const onConfigChange = vi.fn();
      renderControls({ 
        onConfigChange,
        config: { audio: { mode: 'click', volume: 0.8, waveform: 'square' } }
      });
      
      const waveformSelect = screen.getByDisplayValue('Square');
      fireEvent.change(waveformSelect, { target: { value: 'sine' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({ waveform: 'sine' })
        })
      );
    });

    it('shows file upload when audio mode is file', () => {
      renderControls({ config: { audio: { mode: 'file', volume: 0.8 } } });
      expect(screen.getByText('Sound File')).toBeDefined();
      expect(screen.getByText('Upload Audio')).toBeDefined();
    });

    it('hides file upload when audio mode is not file', () => {
      renderControls({ config: { audio: { mode: 'click', volume: 0.8, waveform: 'square' } } });
      expect(screen.queryByText('Sound File')).toBeNull();
    });
  });

  describe('Edge cases and validation', () => {
    it('handles negative edge padding values', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const paddingInput = screen.getByDisplayValue('16');
      fireEvent.change(paddingInput, { target: { value: '-5' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ edgePaddingPx: 0 })
        })
      );
    });

    it('handles negative edge pause values', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const pauseInput = screen.getByDisplayValue('0');
      fireEvent.change(pauseInput, { target: { value: '-10' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ edgePauseMs: 0 })
        })
      );
    });

    it('handles invalid numeric input gracefully', () => {
      const onConfigChange = vi.fn();
      renderControls({ onConfigChange });
      
      const paddingInput = screen.getByDisplayValue('16');
      fireEvent.change(paddingInput, { target: { value: 'abc' } });
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ edgePaddingPx: 0 })
        })
      );
    });
  });
});