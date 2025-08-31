import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

function getTargetDiv() {
  const target = document.querySelector('.target') as HTMLDivElement | null;
  return target;
}

describe('App color integration', () => {
  it('changing color in Controls updates the rendered target color', async () => {
    render(<App />);

    // initial target should exist
    const target = getTargetDiv();
    expect(target).toBeTruthy();

    // For circle/square, background should be initial color (#00FF88)
    // style attribute may be empty until effect runs; let microtask flush
    await Promise.resolve();

    const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
    // Change to a vivid red
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });

    // Wait a tick for React to commit effects
    await Promise.resolve();

    const updated = getTargetDiv();
    expect(updated).toBeTruthy();

    // The target can be either showing a CSS background (non-SVG shapes)
    // or rendering an SVG with fill/stroke. For circle (default), background is used.
    const cs = getComputedStyle(updated!);
    const bgColor = cs.backgroundColor || updated!.style.backgroundColor || updated!.style.background;
    if (bgColor) {
      expect(bgColor.replace(/\s+/g, '').toLowerCase()).toBe('rgb(255,0,0)');
    } else {
      // If background not set (SVG shapes), ensure there is an SVG with fill/stroke updated
      const svg = updated!.querySelector('svg');
      expect(svg).toBeTruthy();
      const colored = svg!.querySelector('[fill="#ff0000"], [stroke="#ff0000"]');
      expect(colored).toBeTruthy();
    }
  });
});
