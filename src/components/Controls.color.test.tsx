import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Controls from './Controls';
import { AppConfig } from '../types';

function renderControls(partial?: Partial<AppConfig>) {
  const base: AppConfig = {
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
  const config: AppConfig = {
    ...base,
    ...partial,
    target: { ...base.target, ...(partial?.target || {}) },
    audio: { ...base.audio, ...(partial?.audio || {}) },
  };
  const onConfigChange = vi.fn();
  render(
    <Controls
      playing={false}
      remainingSec={120}
      onPlay={() => {}}
      onStop={() => {}}
      onReset={() => {}}
      config={config}
      onConfigChange={onConfigChange}
    />
  );
  return { onConfigChange };
}

describe('Controls color input', () => {
  it('emits onConfigChange with updated target.color when color input changes', () => {
    const { onConfigChange } = renderControls();
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    expect(colorInput.value.toLowerCase()).toBe('#00ff88');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });
    expect(onConfigChange).toHaveBeenCalled();
    const arg = (onConfigChange.mock.calls[0][0]) as AppConfig;
    expect(arg.target.color.toLowerCase()).toBe('#ff0000');
  });
});
