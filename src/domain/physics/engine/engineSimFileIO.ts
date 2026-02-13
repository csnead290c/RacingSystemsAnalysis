/**
 * EngineSim File I/O — browser-safe helpers for export/import.
 *
 * Primary persistence is now DB-backed (see src/state/engineSims.ts).
 * This module provides:
 *  - Export JSON (download current doc as backup)
 *  - Upload file (for legacy .eng import or JSON backup restore)
 *
 * No third-party dependencies.
 */

import {
  serializeEngineSimDocument,
  ENGINE_SIM_FILE_EXTENSION,
  type EngineSimDocumentV1,
} from './engineSimDocument';

// ── Export (download) ───────────────────────────────────────────────

/** Download the document as a JSON file (works in all browsers). */
export function downloadDocument(doc: EngineSimDocumentV1): void {
  const json = serializeEngineSimDocument(doc);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestFileName(doc);
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

// ── Upload (file picker) ────────────────────────────────────────────

/**
 * Prompt the user to select a file via a hidden <input type="file">.
 * Returns the file text content and name, or null if cancelled.
 */
export function uploadFile(accept: string): Promise<{ text: string; fileName: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try {
        const text = await file.text();
        resolve({ text, fileName: file.name });
      } catch {
        resolve(null);
      } finally {
        input.remove();
      }
    });

    input.addEventListener('cancel', () => {
      resolve(null);
      input.remove();
    });

    document.body.appendChild(input);
    input.click();
  });
}

/** Upload specifically for legacy .eng files. */
export function uploadEngFile(): Promise<{ text: string; fileName: string } | null> {
  return uploadFile('.eng,.ENG');
}

/** Upload specifically for JSON backup files. */
export function uploadJsonFile(): Promise<{ text: string; fileName: string } | null> {
  return uploadFile(`${ENGINE_SIM_FILE_EXTENSION},.json`);
}

// ── Helpers ─────────────────────────────────────────────────────────

function suggestFileName(doc: EngineSimDocumentV1): string {
  const base = doc.name?.trim() || 'Untitled';
  const safe = base.replace(/[^a-zA-Z0-9_\- ]/g, '_');
  return `${safe}${ENGINE_SIM_FILE_EXTENSION}`;
}
