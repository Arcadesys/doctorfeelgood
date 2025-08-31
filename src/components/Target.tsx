import React, { useEffect, useRef, useState } from 'react';
import { advancePosition, MotionState } from '../lib/motion';

type Props = {
  color: string;
  sizePx: number;
  shape: 'circle' | 'square' | 'diamond' | 'smiley' | 'triangle' | 'star' | 'hexagon' | 'ring' | 'bullseye' | 'cross' | 'heart';
  rotate: boolean;
  speedPxPerSec: number;
  edgePaddingPx: number;
  edgePauseMs: number;
  startPosition: 'center' | 'left' | 'right';
  playing: boolean;
  onPosition?: (normalized: number) => void; // 0..1
  onEdge?: (side: 'left' | 'right') => void;
};

function useMeasure(ref: React.RefObject<HTMLElement>) {
  const [rect, setRect] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const cr = entry.contentRect;
      setRect({ width: cr.width, height: cr.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return rect;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})$/.exec(hex.trim());
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

function isLight(hex: string): boolean {
  const c = parseHexColor(hex);
  if (!c) return false;
  // Relative luminance approximation
  const sr = c.r / 255;
  const sg = c.g / 255;
  const sb = c.b / 255;
  const lum = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
  return lum > 0.6;
}

function Target({ color, sizePx, shape, rotate, speedPxPerSec, edgePaddingPx, edgePauseMs, startPosition, playing, onPosition, onEdge }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const { width, height } = useMeasure(containerRef);
  // Use refs for animation state to avoid triggering React re-renders
  const dirRef = useRef<1 | -1>(1);
  const posRef = useRef(0); // px from left
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const pausedUntilRef = useRef<number>(0);
  const shapeRef = useRef<Props['shape']>(shape);
  useEffect(() => { shapeRef.current = shape; }, [shape]);
  const rotateRef = useRef<boolean>(rotate);
  useEffect(() => { rotateRef.current = rotate; }, [rotate]);
  const rotAngleDegRef = useRef<number>(0);

  // Keep latest callbacks in refs so rAF effect doesn't restart each render
  const onPositionRef = useRef<Props['onPosition']>(onPosition);
  const onEdgeRef = useRef<Props['onEdge']>(onEdge);
  useEffect(() => { onPositionRef.current = onPosition; }, [onPosition]);
  useEffect(() => { onEdgeRef.current = onEdge; }, [onEdge]);

  const minX = Math.max(0, Math.min(edgePaddingPx, Math.max(0, width - sizePx)));
  const maxX = Math.max(minX, width - sizePx - edgePaddingPx);
  const range = Math.max(0, maxX - minX);

  const setTransform = (x: number) => {
    if (!dotRef.current) return;
    const baseRot = shapeRef.current === 'diamond' ? 45 : 0;
    const spin = rotateRef.current ? rotAngleDegRef.current : 0;
    const total = baseRot + spin;
    const rot = total !== 0 ? ` rotate(${total}deg)` : '';
    dotRef.current.style.transform = `translateX(${x}px)${rot}`;
  };

  useEffect(() => {
    // center vertically, apply size/color/shape
    if (dotRef.current) {
      dotRef.current.style.top = `${Math.max(0, (height - sizePx) / 2)}px`;
      dotRef.current.style.width = `${sizePx}px`;
      dotRef.current.style.height = `${sizePx}px`;
      const usesSvg = shape !== 'circle' && shape !== 'square' && shape !== 'diamond';
      // Fill color for non-SVG shapes
      dotRef.current.style.background = usesSvg ? 'transparent' : color;
      dotRef.current.style.borderRadius = (shape === 'circle' || shape === 'smiley') ? '999px' : '0px';
      // Feature color for svg shapes that use currentColor (e.g., smiley)
      dotRef.current.style.color = isLight(color) ? '#000' : '#fff';
    }
  }, [height, sizePx, color, shape]);

  // Initialize start position when dimensions or config change and not running
  useEffect(() => {
    if (playing) return; // don't jump during playback
    let startX = minX + range / 2;
    if (startPosition === 'left') startX = minX;
    if (startPosition === 'right') startX = maxX;
    posRef.current = startX;
    setTransform(posRef.current);
  }, [playing, minX, maxX, range, startPosition]);

  useEffect(() => {
    const step = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      const next = advancePosition(
        { x: posRef.current, dir: dirRef.current, pausedUntilMs: pausedUntilRef.current } as MotionState,
        { minX, maxX, speedPxPerSec, edgePauseMs },
        dt,
        ts,
      );
      posRef.current = next.x;
      dirRef.current = next.dir;
      pausedUntilRef.current = next.pausedUntilMs;
      // Update rotation angle
      if (rotateRef.current) {
        const ROT_SPEED = 180; // deg/s
        rotAngleDegRef.current = (rotAngleDegRef.current + ROT_SPEED * dt) % 360;
      }
      if (next.hitEdge) onEdgeRef.current?.(next.hitEdge);
      const norm = range > 0 ? (posRef.current - minX) / range : 0.5;
      onPositionRef.current?.(norm);
      setTransform(posRef.current);
      rafRef.current = requestAnimationFrame(step);
    };

    if (playing) {
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [playing, speedPxPerSec, minX, maxX, range, edgePauseMs]);

  return (
    <div ref={containerRef} className="stage-inner" aria-label="Bilateral visual stage">
      <div ref={dotRef} className="target" role="img" aria-label="moving target">
        {shape === 'smiley' && (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <circle cx="50" cy="50" r="50" fill={color} />
            <circle cx="35" cy="38" r="6" fill="currentColor" />
            <circle cx="65" cy="38" r="6" fill="currentColor" />
            <path d="M30 60 C 40 78, 60 78, 70 60" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          </svg>
        )}

        {shape === 'triangle' && (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <polygon points="50,8 92,92 8,92" fill={color} />
          </svg>
        )}

        {shape === 'star' && (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <polygon fill={color}
              points="50,5 61,35 93,38 68,58 76,90 50,72 24,90 32,58 7,38 39,35" />
          </svg>
        )}

        {shape === 'hexagon' && (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <polygon fill={color} points="25,10 75,10 95,50 75,90 25,90 5,50" />
          </svg>
        )}

        {shape === 'ring' && (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="16" />
          </svg>
        )}

        {shape === 'bullseye' && (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="10" />
            <circle cx="50" cy="50" r="28" fill="none" stroke={color} strokeWidth="10" />
            <circle cx="50" cy="50" r="12" fill={color} />
          </svg>
        )}

        {shape === 'cross' && (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <rect x="42" y="10" width="16" height="80" fill={color} />
            <rect x="10" y="42" width="80" height="16" fill={color} />
          </svg>
        )}

        {shape === 'heart' && (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <path fill={color} d="M50 85 L15 50 C5 40 5 25 18 16 C31 7 45 13 50 23 C55 13 69 7 82 16 C95 25 95 40 85 50 Z" />
          </svg>
        )}
      </div>
    </div>
  );
}

export default React.memo(Target);
