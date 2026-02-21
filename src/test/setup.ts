import '@testing-library/jest-dom';

// Minimal localStorage stub for Node/jsdom tests
// Some test files stub localStorage; ensure we always have a usable shape.
const _lsStore: Record<string, string> = {};
const _ls = {
  getItem: (key: string) => (_lsStore[key] ?? null),
  setItem: (key: string, value: string) => { _lsStore[key] = String(value); },
  removeItem: (key: string) => { delete _lsStore[key]; },
  clear: () => { for (const k of Object.keys(_lsStore)) delete _lsStore[k]; },
  get length() { return Object.keys(_lsStore).length; },
  key: (i: number) => Object.keys(_lsStore)[i] ?? null,
};

// @ts-ignore
if (typeof globalThis !== 'undefined') {
  // @ts-ignore
  const ls: any = (globalThis as any).localStorage;
  const isValid = ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function';
  if (!isValid) {
    // @ts-ignore
    (globalThis as any).localStorage = _ls;
  }
}

// jsdom/undici fetch requires absolute URLs, but the app uses browser-relative URLs.
// Wrap fetch for tests so relative URLs resolve against http://localhost.
// @ts-ignore
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).fetch === 'function') {
  // @ts-ignore
  const _realFetch: any = (globalThis as any).fetch;
  // @ts-ignore
  (globalThis as any).fetch = (input: any, init?: any) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      if (input.startsWith('/api/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Test environment: API disabled' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return _realFetch(`http://localhost${input}`, init);
    }
    if (input && typeof input.url === 'string' && input.url.startsWith('/')) {
      const req = new Request(`http://localhost${input.url}`, input);
      return _realFetch(req, init);
    }
    if (typeof input === 'string' && input.startsWith('http://localhost/api/')) {
      return Promise.resolve(
        new Response(JSON.stringify({ error: 'Test environment: API disabled' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    return _realFetch(input, init);
  };
}

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
