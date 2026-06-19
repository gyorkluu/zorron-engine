import '@testing-library/jest-dom/vitest';

/**
 * Polyfill `ResizeObserver` for jsdom.
 *
 * React Flow (and other layout-aware libraries) rely on ResizeObserver which
 * jsdom does not implement. We install a minimal stub so component tests that
 * mount the FlowCanvas can run without throwing.
 */
class ResizeObserverStub {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element): void {
    // Fire once synchronously with a zero-size rect so effects complete.
    this.callback([{ target, contentRect: { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 } } as ResizeObserverEntry], this);
  }
  unobserve(): void {
    /* no-op */
  }
  disconnect(): void {
    /* no-op */
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

/** Polyfill `DOMMatrix` for jsdom (used by some rendering libraries). */
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrixStub {
    constructor() {
      // no-op
    }
  } as unknown as typeof DOMMatrix;
}

/**
 * Polyfill `Blob.text()` and `Blob.arrayBuffer()` for jsdom.
 *
 * Older jsdom versions may not implement `Blob.text()` / `Blob.arrayBuffer()`.
 * The workspace.service tests rely on reading file content via `file.text()`
 * and the mock writable stream calls `data.arrayBuffer()` when persisting
 * binary asset blobs.
 */
if (typeof Blob.prototype.text !== 'function') {
  Blob.prototype.text = function text(this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

if (typeof Blob.prototype.arrayBuffer !== 'function') {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}
