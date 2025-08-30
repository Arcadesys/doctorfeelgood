export type Direction = 1 | -1;

export interface MotionParams {
  minX: number;
  maxX: number;
  speedPxPerSec: number;
  edgePauseMs: number;
}

export interface MotionState {
  x: number; // current position in px
  dir: Direction; // current direction
  pausedUntilMs: number; // timestamp in ms (same clock as 'nowMs')
}

export interface MotionStepResult extends MotionState {
  hitEdge?: 'left' | 'right';
}

/**
 * Advance 1D motion with reflective edges and optional edge pause.
 * time base: ms for nowMs/pausedUntilMs, seconds for dtSec like rAF.
 */
export function advancePosition(
  state: MotionState,
  params: MotionParams,
  dtSec: number,
  nowMs: number,
): MotionStepResult {
  const { minX, maxX, speedPxPerSec, edgePauseMs } = params;
  let { x, dir, pausedUntilMs } = state;
  let hitEdge: 'left' | 'right' | undefined;

  if (nowMs < pausedUntilMs) {
    return { x, dir, pausedUntilMs };
  }

  x += dir * speedPxPerSec * dtSec;

  if (x <= minX) {
    x = minX;
    if (dir === -1) hitEdge = 'left';
    dir = 1;
    if (edgePauseMs > 0) pausedUntilMs = nowMs + edgePauseMs;
  } else if (x >= maxX) {
    x = maxX;
    if (dir === 1) hitEdge = 'right';
    dir = -1;
    if (edgePauseMs > 0) pausedUntilMs = nowMs + edgePauseMs;
  }

  return { x, dir: dir as Direction, pausedUntilMs, hitEdge };
}
