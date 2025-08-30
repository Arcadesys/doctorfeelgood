import React, { useEffect, useRef, useState } from 'react';
import { advancePosition, MotionState } from '../lib/motion';

type Props = {
  color: string;
  sizePx: number;
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

export default function Target({ color, sizePx, speedPxPerSec, edgePaddingPx, edgePauseMs, startPosition, playing, onPosition, onEdge }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const { width, height } = useMeasure(containerRef);
  const [dir, setDir] = useState<1 | -1>(1);
  const posRef = useRef(0); // px from left
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const pausedUntilRef = useRef<number>(0);

  const minX = Math.max(0, Math.min(edgePaddingPx, Math.max(0, width - sizePx)));
  const maxX = Math.max(minX, width - sizePx - edgePaddingPx);
  const range = Math.max(0, maxX - minX);

  useEffect(() => {
    // center vertically, apply size/color
    if (dotRef.current) {
      dotRef.current.style.top = `${Math.max(0, (height - sizePx) / 2)}px`;
      dotRef.current.style.width = `${sizePx}px`;
      dotRef.current.style.height = `${sizePx}px`;
      dotRef.current.style.background = color;
    }
  }, [height, sizePx, color]);

  // Initialize start position when dimensions or config change and not running
  useEffect(() => {
    if (playing) return; // don't jump during playback
    let startX = minX + range / 2;
    if (startPosition === 'left') startX = minX;
    if (startPosition === 'right') startX = maxX;
    posRef.current = startX;
    if (dotRef.current) dotRef.current.style.transform = `translateX(${posRef.current}px)`;
  }, [playing, minX, maxX, range, startPosition]);

  useEffect(() => {
    const step = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      const next = advancePosition(
        { x: posRef.current, dir, pausedUntilMs: pausedUntilRef.current } as MotionState,
        { minX, maxX, speedPxPerSec, edgePauseMs },
        dt,
        ts,
      );
      posRef.current = next.x;
      if (next.dir !== dir) setDir(next.dir);
      pausedUntilRef.current = next.pausedUntilMs;
      if (next.hitEdge) onEdge?.(next.hitEdge);
      const norm = range > 0 ? (posRef.current - minX) / range : 0.5;
      onPosition?.(norm);
      if (dotRef.current) dotRef.current.style.transform = `translateX(${posRef.current}px)`;
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
  }, [playing, speedPxPerSec, minX, maxX, range, dir, onPosition, onEdge, edgePauseMs]);

  return (
    <div ref={containerRef} className="stage-inner" aria-label="Bilateral visual stage">
      <div ref={dotRef} className="target" role="img" aria-label="moving target" />
    </div>
  );
}
