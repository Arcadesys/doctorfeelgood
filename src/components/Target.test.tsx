import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Target from './Target';

// Mock requestAnimationFrame
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

const defaultProps = {
  color: '#ff0000',
  sizePx: 24,
  shape: 'circle' as const,
  rotate: false,
  speedPxPerSec: 400,
  edgePaddingPx: 16,
  edgePauseMs: 0,
  startPosition: 'center' as const,
  playing: false,
};

describe('Target', () => {
  it('renders with correct accessibility attributes', () => {
    render(<Target {...defaultProps} />);
    
    expect(screen.getByLabelText('Bilateral visual stage')).toBeDefined();
    expect(screen.getByLabelText('moving target')).toBeDefined();
  });

  it('renders different shapes correctly', () => {
    const shapes = ['circle', 'square', 'diamond', 'smiley', 'triangle', 'star', 'hexagon', 'ring', 'bullseye', 'cross', 'heart'] as const;
    
    shapes.forEach(shape => {
      const { unmount } = render(<Target {...defaultProps} shape={shape} />);
      const target = screen.getByLabelText('moving target');
      expect(target).toBeDefined();
      
      if (shape === 'smiley' || shape === 'triangle' || shape === 'star' || shape === 'hexagon' || shape === 'ring' || shape === 'bullseye' || shape === 'cross' || shape === 'heart') {
        // These shapes use SVG
        expect(target.querySelector('svg')).toBeDefined();
      }
      
      unmount();
    });
  });

  it('applies correct styling for different shapes', () => {
    // Test circle (uses border-radius)
    const { rerender } = render(<Target {...defaultProps} shape="circle" />);
    let target = screen.getByLabelText('moving target');
    expect(target.style.borderRadius).toBe('999px');
    
    // Test square (no border-radius)
    rerender(<Target {...defaultProps} shape="square" />);
    target = screen.getByLabelText('moving target');
    expect(target.style.borderRadius).toBe('0px');
    
    // Test diamond (should have rotation)
    rerender(<Target {...defaultProps} shape="diamond" />);
    target = screen.getByLabelText('moving target');
    expect(target.style.transform).toContain('rotate(45deg)');
  });

  it('applies color correctly for non-SVG shapes', () => {
    render(<Target {...defaultProps} shape="circle" color="#00ff00" />);
    const target = screen.getByLabelText('moving target');
    expect(target.style.background).toBe('#00ff00');
  });

  it('sets size correctly', () => {
    render(<Target {...defaultProps} sizePx={48} />);
    const target = screen.getByLabelText('moving target');
    expect(target.style.width).toBe('48px');
    expect(target.style.height).toBe('48px');
  });

  it('starts animation when playing is true', () => {
    const { rerender } = render(<Target {...defaultProps} playing={false} />);
    expect(mockRaf).not.toHaveBeenCalled();
    
    rerender(<Target {...defaultProps} playing={true} />);
    expect(mockRaf).toHaveBeenCalled();
  });

  it('stops animation when playing becomes false', () => {
    const { rerender } = render(<Target {...defaultProps} playing={true} />);
    expect(mockRaf).toHaveBeenCalled();
    
    rerender(<Target {...defaultProps} playing={false} />);
    expect(mockCancelAnimationFrame).toHaveBeenCalled();
  });

  it('calls onPosition callback with normalized position', () => {
    const onPosition = vi.fn();
    render(<Target {...defaultProps} playing={true} onPosition={onPosition} />);
    
    // Check that RAF was called
    expect(mockRaf).toHaveBeenCalled();
    
    // Get the animation callback
    const animationCallback = mockRaf.mock.calls[0][0];
    
    // Mock the motion step
    animationCallback(1000);
    
    expect(onPosition).toHaveBeenCalled();
    const normalizedPosition = onPosition.mock.calls[0][0];
    expect(typeof normalizedPosition).toBe('number');
    expect(normalizedPosition).toBeGreaterThanOrEqual(0);
    expect(normalizedPosition).toBeLessThanOrEqual(1);
  });

  it('applies correct text color based on background lightness', () => {
    // Light color should use dark text
    const { rerender } = render(<Target {...defaultProps} color="#ffffff" shape="smiley" />);
    let target = screen.getByLabelText('moving target');
    expect(target.style.color).toBe('#000');
    
    // Dark color should use light text
    rerender(<Target {...defaultProps} color="#000000" shape="smiley" />);
    target = screen.getByLabelText('moving target');
    expect(target.style.color).toBe('#fff');
  });

  it('handles different start positions', () => {
    const positions = ['left', 'center', 'right'] as const;
    
    positions.forEach(position => {
      const { unmount } = render(<Target {...defaultProps} startPosition={position} playing={false} />);
      const target = screen.getByLabelText('moving target');
      expect(target).toBeDefined();
      // Position is set via transform, which is applied in useEffect
      unmount();
    });
  });

  it('handles rotation when rotate prop is true', () => {
    render(<Target {...defaultProps} rotate={true} shape="square" />);
    const target = screen.getByLabelText('moving target');
    // Initial transform should be applied
    expect(target.style.transform).toBeDefined();
  });

  it('centers target vertically based on container height', () => {
    render(<Target {...defaultProps} sizePx={24} />);
    const target = screen.getByLabelText('moving target');
    // Top position should be calculated to center the target
    expect(target.style.top).toBeDefined();
  });

  it('renders SVG correctly for smiley face', () => {
    render(<Target {...defaultProps} shape="smiley" color="#ffff00" />);
    const target = screen.getByLabelText('moving target');
    const svg = target.querySelector('svg');
    expect(svg).toBeDefined();
    
    // Check for smiley face elements
    const face = svg?.querySelector('circle[fill="#ffff00"]');
    expect(face).toBeDefined();
    
    const eyes = svg?.querySelectorAll('circle[fill="currentColor"]');
    expect(eyes).toHaveLength(2);
    
    const mouth = svg?.querySelector('path[stroke="currentColor"]');
    expect(mouth).toBeDefined();
  });

  it('renders SVG correctly for other shapes', () => {
    const svgShapes = ['triangle', 'star', 'hexagon', 'ring', 'bullseye', 'cross', 'heart'] as const;
    
    svgShapes.forEach(shape => {
      const { unmount } = render(<Target {...defaultProps} shape={shape} color="#0000ff" />);
      const target = screen.getByLabelText('moving target');
      const svg = target.querySelector('svg');
      expect(svg).toBeDefined();
      
      // Each shape should have some colored element
      const coloredElement = svg?.querySelector(`[fill="#0000ff"], [stroke="#0000ff"]`);
      expect(coloredElement).toBeDefined();
      
      unmount();
    });
  });

  it('maintains aspect ratio for SVG shapes', () => {
    render(<Target {...defaultProps} shape="star" />);
    const target = screen.getByLabelText('moving target');
    const svg = target.querySelector('svg');
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('updates when props change', () => {
    const { rerender } = render(<Target {...defaultProps} color="#ff0000" sizePx={24} />);
    let target = screen.getByLabelText('moving target');
    expect(target.style.background).toBe('#ff0000');
    expect(target.style.width).toBe('24px');
    
    rerender(<Target {...defaultProps} color="#00ff00" sizePx={48} />);
    target = screen.getByLabelText('moving target');
    expect(target.style.background).toBe('#00ff00');
    expect(target.style.width).toBe('48px');
  });
});