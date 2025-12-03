import '@testing-library/jest-dom';

// Minimal Worker stub for Node tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class StubWorker {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postMessage(_msg: any) { /* noop for unit tests */ }
  terminate() { /* noop */ }
  addEventListener() { /* noop */ }
  removeEventListener() { /* noop */ }
  dispatchEvent() { return false; }
}

// @ts-ignore
if (typeof globalThis !== 'undefined' && !(globalThis as any).Worker) {
  // @ts-ignore
  (globalThis as any).Worker = StubWorker;
}
