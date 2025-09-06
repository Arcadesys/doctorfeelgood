import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Controls from './Controls';
import Target from './Target';
import { AppConfig } from '../types';

// Mock requestAnimationFrame for Target component
const mockRaf = vi.fn();
const mockCancelAnimationFrame = vi.fn();

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', mockRaf);
  vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderControls(partial?: { target?: Partial<AppConfig['target']>; audio?: Partial<AppConfig['audio']>; durationSec?: number }) {
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
    durationSec: partial?.durationSec ?? base.durationSec,
    target: { ...base.target, ...partial?.target },
    audio: { ...base.audio, ...partial?.audio },
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
  return { onConfigChange, config };
}

// Integration test component that connects Controls and Target
function ControlsTargetIntegration({ initialConfig }: { initialConfig?: { target?: Partial<AppConfig['target']>; audio?: Partial<AppConfig['audio']>; durationSec?: number } }) {
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
  
  const [config, setConfig] = useState<AppConfig>({
    ...base,
    durationSec: initialConfig?.durationSec ?? base.durationSec,
    target: { ...base.target, ...initialConfig?.target },
    audio: { ...base.audio, ...initialConfig?.audio },
  });
  const [playing, setPlaying] = useState(false);
  const [remainingSec, setRemainingSec] = useState(120);

  const handleConfigChange = (newConfig: AppConfig) => {
    setConfig(newConfig);
  };

  return (
    <div>
      <Controls
        playing={playing}
        remainingSec={remainingSec}
        onPlay={() => setPlaying(true)}
        onStop={() => setPlaying(false)}
        onReset={() => {
          setPlaying(false);
          setRemainingSec(120);
        }}
        config={config}
        onConfigChange={handleConfigChange}
      />
      <Target
        color={config.target.color}
        sizePx={config.target.sizePx}
        shape={config.target.shape ?? 'circle'}
        rotate={config.target.rotate ?? false}
        speedPxPerSec={config.target.speedPxPerSec}
        edgePaddingPx={config.target.edgePaddingPx}
        edgePauseMs={config.target.edgePauseMs}
        startPosition={config.target.startPosition}
        playing={playing}
      />
    </div>
  );
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

  it('renders color input with correct initial value', () => {
    const { config } = renderControls({ target: { color: '#3366cc' } });
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    expect(colorInput.value.toLowerCase()).toBe('#3366cc');
    expect(colorInput.type).toBe('color');
  });

  it('preserves other target properties when updating color', () => {
    const { onConfigChange } = renderControls({
      target: {
        color: '#00FF88',
        sizePx: 50,
        shape: 'star',
        rotate: true,
        speedPxPerSec: 800,
        edgePaddingPx: 25,
        edgePauseMs: 200,
        startPosition: 'right',
      }
    });

    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: '#ffff00' } });
    
    expect(onConfigChange).toHaveBeenCalled();
    const arg = (onConfigChange.mock.calls[0][0]) as AppConfig;
    expect(arg.target).toEqual({
      sizePx: 50,
      color: '#ffff00',
      shape: 'star',
      rotate: true,
      speedPxPerSec: 800,
      edgePaddingPx: 25,
      edgePauseMs: 200,
      startPosition: 'right',
    });
  });

  it('handles various hex color formats', () => {
    const { onConfigChange } = renderControls();
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;

    const testColors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#7f7f7f'];
    
    testColors.forEach((color, index) => {
      fireEvent.change(colorInput, { target: { value: color } });
      expect(onConfigChange).toHaveBeenCalledTimes(index + 1);
      const arg = (onConfigChange.mock.calls[index][0]) as AppConfig;
      expect(arg.target.color.toLowerCase()).toBe(color.toLowerCase());
    });
  });
});

describe('Color selector integration with Target', () => {
  it('updates target background color when color selector changes', () => {
    render(<ControlsTargetIntegration />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const target = screen.getByLabelText('moving target');
    
    // Initial color should be applied
    expect(target.style.background).toBe('rgb(0, 255, 136)');
    
    // Change color to red
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });
    
    // Target should update to new color
    expect(target.style.background).toBe('rgb(255, 0, 0)');
  });

  it('updates target color for different non-SVG shapes', () => {
    render(<ControlsTargetIntegration />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const shapeSelect = screen.getByDisplayValue('Circle');
    const target = screen.getByLabelText('moving target');
    
    // Test with square shape
    fireEvent.change(shapeSelect, { target: { value: 'square' } });
    fireEvent.change(colorInput, { target: { value: '#0000ff' } });
    
    expect(target.style.background).toBe('rgb(0, 0, 255)');
    expect(target.style.borderRadius).toBe('0px'); // square shape
    
    // Test with circle shape
    fireEvent.change(shapeSelect, { target: { value: 'circle' } });
    fireEvent.change(colorInput, { target: { value: '#ffff00' } });
    
    expect(target.style.background).toBe('rgb(255, 255, 0)');
    expect(target.style.borderRadius).toBe('999px'); // circle shape

    // Test with diamond shape
    fireEvent.change(shapeSelect, { target: { value: 'diamond' } });
    fireEvent.change(colorInput, { target: { value: '#ff00ff' } });
    
    expect(target.style.background).toBe('rgb(255, 0, 255)');
    expect(target.style.borderRadius).toBe('0px'); // diamond shape
  });

  it('handles SVG shape colors correctly', () => {
    render(<ControlsTargetIntegration />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const shapeSelect = screen.getByDisplayValue('Circle');
    const target = screen.getByLabelText('moving target');
    
    // Change to star shape (SVG)
    fireEvent.change(shapeSelect, { target: { value: 'star' } });
    fireEvent.change(colorInput, { target: { value: '#ff6600' } });
    
    // SVG shapes use transparent background and the color is applied to the SVG fill
    expect(target.style.background).toBe('transparent');
    
    // Check that SVG is present and has the correct fill color
    const svg = target.querySelector('svg');
    expect(svg).toBeDefined();
    
    const polygon = svg?.querySelector('polygon');
    expect(polygon?.getAttribute('fill')).toBe('#ff6600');
  });

  it('updates text color based on background lightness for shapes with currentColor', () => {
    render(<ControlsTargetIntegration />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const shapeSelect = screen.getByDisplayValue('Circle');
    const target = screen.getByLabelText('moving target');
    
    // Change to smiley (SVG with text elements that use currentColor)
    fireEvent.change(shapeSelect, { target: { value: 'smiley' } });
    
    // Test with light color - should use dark text
    fireEvent.change(colorInput, { target: { value: '#ffffff' } });
    expect(target.style.color).toBe('rgb(0, 0, 0)');
    
    // Test with dark color - should use light text
    fireEvent.change(colorInput, { target: { value: '#000000' } });
    expect(target.style.color).toBe('rgb(255, 255, 255)');
    
    // Test with medium-dark color - should use light text
    fireEvent.change(colorInput, { target: { value: '#444444' } });
    expect(target.style.color).toBe('rgb(255, 255, 255)');
  });

  it('preserves color when switching between non-SVG shapes', () => {
    render(<ControlsTargetIntegration />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const shapeSelect = screen.getByDisplayValue('Circle');
    const target = screen.getByLabelText('moving target');
    
    // Set a specific color
    fireEvent.change(colorInput, { target: { value: '#cc3366' } });
    expect(target.style.background).toBe('rgb(204, 51, 102)');
    
    // Switch to square
    fireEvent.change(shapeSelect, { target: { value: 'square' } });
    expect(target.style.background).toBe('rgb(204, 51, 102)');
    
    // Switch to diamond
    fireEvent.change(shapeSelect, { target: { value: 'diamond' } });
    expect(target.style.background).toBe('rgb(204, 51, 102)');
  });

  it('preserves color when switching from SVG to non-SVG shapes', () => {
    render(<ControlsTargetIntegration />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const shapeSelect = screen.getByDisplayValue('Circle');
    const target = screen.getByLabelText('moving target');
    
    // Start with SVG shape
    fireEvent.change(shapeSelect, { target: { value: 'star' } });
    fireEvent.change(colorInput, { target: { value: '#9966cc' } });
    
    // SVG should have transparent background
    expect(target.style.background).toBe('transparent');
    
    // Switch to non-SVG shape
    fireEvent.change(shapeSelect, { target: { value: 'circle' } });
    
    // Color should be applied as background
    expect(target.style.background).toBe('rgb(153, 102, 204)');
  });

  it('handles color changes with different target sizes', () => {
    render(<ControlsTargetIntegration />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const sizeSlider = screen.getByDisplayValue('24');
    const target = screen.getByLabelText('moving target');
    
    // Change size and color
    fireEvent.change(sizeSlider, { target: { value: '50' } });
    fireEvent.change(colorInput, { target: { value: '#66ccff' } });
    
    expect(target.style.width).toBe('50px');
    expect(target.style.height).toBe('50px');
    expect(target.style.background).toBe('rgb(102, 204, 255)');
  });

  it('works correctly with various SVG shapes', () => {
    render(<ControlsTargetIntegration />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const shapeSelect = screen.getByDisplayValue('Circle');
    const target = screen.getByLabelText('moving target');
    
    const svgShapes = ['star', 'triangle', 'hexagon', 'smiley', 'ring', 'bullseye', 'cross', 'heart'];
    
    svgShapes.forEach(shape => {
      fireEvent.change(shapeSelect, { target: { value: shape } });
      fireEvent.change(colorInput, { target: { value: '#336699' } });
      
      expect(target.style.background).toBe('transparent');
      
      const svg = target.querySelector('svg');
      expect(svg).toBeDefined();
      
      // Check that some SVG element has the color applied
      const coloredElements = svg?.querySelectorAll('[fill="#336699"], [stroke="#336699"]');
      expect(coloredElements && coloredElements.length > 0).toBe(true);
    });
  });

  it('handles edge case colors correctly', () => {
    render(<ControlsTargetIntegration />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const target = screen.getByLabelText('moving target');
    
    const edgeCaseColors = [
      { hex: '#ffffff', rgb: 'rgb(255, 255, 255)' },
      { hex: '#000000', rgb: 'rgb(0, 0, 0)' },
      { hex: '#ff0000', rgb: 'rgb(255, 0, 0)' },
      { hex: '#00ff00', rgb: 'rgb(0, 255, 0)' },
      { hex: '#0000ff', rgb: 'rgb(0, 0, 255)' },
    ];
    
    edgeCaseColors.forEach(({ hex, rgb }) => {
      fireEvent.change(colorInput, { target: { value: hex } });
      expect(target.style.background).toBe(rgb);
    });
  });

  it('updates multiple SVG elements with same color for bullseye shape', () => {
    render(<ControlsTargetIntegration />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const shapeSelect = screen.getByDisplayValue('Circle');
    const target = screen.getByLabelText('moving target');
    
    // Test bullseye shape which has multiple SVG elements
    fireEvent.change(shapeSelect, { target: { value: 'bullseye' } });
    fireEvent.change(colorInput, { target: { value: '#336699' } });
    
    const svg = target.querySelector('svg');
    const circles = svg?.querySelectorAll('circle');
    
    // All circles should use the same color
    circles?.forEach((circle) => {
      const stroke = circle.getAttribute('stroke');
      const fill = circle.getAttribute('fill');
      // Either stroke or fill should be the target color
      expect(stroke === '#336699' || fill === '#336699').toBe(true);
    });
  });

  it('works correctly with custom initial color configuration', () => {
    render(<ControlsTargetIntegration initialConfig={{ 
      target: { color: '#663399' }
    }} />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const target = screen.getByLabelText('moving target');
    
    // Should start with the custom color
    expect(colorInput.value.toLowerCase()).toBe('#663399');
    expect(target.style.background).toBe('rgb(102, 51, 153)');
    
    // Should update when changed
    fireEvent.change(colorInput, { target: { value: '#99cc33' } });
    expect(target.style.background).toBe('rgb(153, 204, 51)');
  });

  it('maintains color consistency when toggling rotation', () => {
    render(<ControlsTargetIntegration />);
    
    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    const rotateCheckbox = screen.getByLabelText('Rotate');
    const target = screen.getByLabelText('moving target');
    
    // Set color and enable rotation
    fireEvent.change(colorInput, { target: { value: '#ff9900' } });
    expect(target.style.background).toBe('rgb(255, 153, 0)');
    
    // Enable rotation - color should remain
    fireEvent.click(rotateCheckbox);
    expect(target.style.background).toBe('rgb(255, 153, 0)');
    
    // Disable rotation - color should still remain
    fireEvent.click(rotateCheckbox);
    expect(target.style.background).toBe('rgb(255, 153, 0)');
  });
});
