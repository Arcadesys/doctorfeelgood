// JSDOM/Testing Library setup
import '@testing-library/jest-dom/vitest';

// Polyfill ResizeObserver for tests
class ResizeObserver {
  private callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe(target: Element) {
    // Fire once with current size
    const cr = {
      bottom: 0,
      height: (target as HTMLElement).clientHeight || 0,
      left: 0,
      right: 0,
      top: 0,
      width: (target as HTMLElement).clientWidth || 0,
      x: 0,
      y: 0,
      toJSON() { return {}; },
    } as unknown as DOMRectReadOnly;
    this.callback([{ target, contentRect: cr } as ResizeObserverEntry], this);
  }
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
(global as any).ResizeObserver = ResizeObserver;
