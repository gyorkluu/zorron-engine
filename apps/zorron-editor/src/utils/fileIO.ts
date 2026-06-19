/**
 * File I/O utilities for project import/export.
 *
 * Uses the browser File API and `URL.createObjectURL` for downloads.
 */

import type { ProjectDetail } from '@/types/project';

/** Trigger a browser download of a JSON-serializable payload. */
export function downloadJson(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Export a project detail as `project.json`. */
export function exportProjectJson(project: ProjectDetail): void {
  downloadJson(`${sanitizeFilename(project.title)}-${project.id.slice(0, 8)}`, project);
}

/** Open a file picker and read a JSON file as a parsed object. */
export function pickJsonFile<T = unknown>(): Promise<T | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result)) as T);
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

/** Sanitize a string for use as a filename. */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 64) || 'project';
}
