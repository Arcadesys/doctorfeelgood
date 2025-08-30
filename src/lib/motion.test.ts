import { describe, it, expect } from 'vitest';
import { advancePosition, MotionState } from './motion';

const params = {
  minX: 0,
  maxX: 100,
  speedPxPerSec: 50,
  edgePauseMs: 0,
};

describe('advancePosition', () => {
  it('moves right with positive dir', () => {
    const s: MotionState = { x: 10, dir: 1, pausedUntilMs: 0 };
    const out = advancePosition(s, params, 1, 0);
    expect(out.x).toBeCloseTo(60, 5);
    expect(out.dir).toBe(1);
    expect(out.hitEdge).toBeUndefined();
  });

  it('bounces at right edge and reverses', () => {
    const s: MotionState = { x: 90, dir: 1, pausedUntilMs: 0 };
    const out = advancePosition(s, params, 1, 1000);
    expect(out.x).toBe(100);
    expect(out.dir).toBe(-1);
    expect(out.hitEdge).toBe('right');
  });

  it('bounces at left edge and reverses', () => {
    const s: MotionState = { x: 10, dir: -1, pausedUntilMs: 0 };
    const out = advancePosition(s, params, 1, 2000);
    expect(out.x).toBe(0);
    expect(out.dir).toBe(1);
    expect(out.hitEdge).toBe('left');
  });

  it('respects edge pause before moving again', () => {
    const s: MotionState = { x: 100, dir: 1, pausedUntilMs: 0 };
    const out1 = advancePosition(s, { ...params, edgePauseMs: 200 }, 0.1, 3000);
    expect(out1.x).toBe(100);
    expect(out1.dir).toBe(-1);
    expect(out1.pausedUntilMs).toBe(3200);
    expect(out1.hitEdge).toBe('right');

    const out2 = advancePosition(out1, { ...params, edgePauseMs: 200 }, 0.1, 3100);
    expect(out2.x).toBe(100); // still paused

    const out3 = advancePosition(out1, { ...params, edgePauseMs: 200 }, 0.1, 3300);
    expect(out3.x).toBeLessThan(100); // moving left after pause window
    expect(out3.dir).toBe(-1);
  });
});
