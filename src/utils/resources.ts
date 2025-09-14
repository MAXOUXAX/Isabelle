import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Maximum number of parent directories to traverse while searching for the project root.
// Prevents accidentally walking the entire filesystem if something is misconfigured.
const MAX_DIRECTORY_TRAVERSAL_DEPTH = 10;

/**
 * Resolve the absolute path to a resource in a way that works in both development and production.
 *
 * Search order (first existing wins):
 *  1. <runtimeDir>/resources/... (production: bundled index.mjs next to resources)
 *  2. <projectRoot>/resources/... (deployment copies resources to root)
 *  3. <projectRoot>/public/resources/... (development with tsx; resources served from public)
 *
 * The project root is discovered by walking up from the caller's directory until a package.json is found.
 *
 * Usage:
 *   const filePath = resolveResourcePath('sutom', 'mots.filtered.txt');
 *   const data = fs.readFileSync(filePath, 'utf-8');
 */
export function resolveResourcePath(...segments: string[]): string {
  const runtimeDir = path.dirname(fileURLToPath(import.meta.url));

  /**
   * Walk up the directory tree (bounded by MAX_DIRECTORY_TRAVERSAL_DEPTH) to find a folder
   * containing a package.json which we treat as the project root.
   *
   * Fallback behaviour: if no package.json is found within the depth limit, we return the
   * starting directory (runtimeDir).
   */
  function findProjectRoot(startDir: string): string {
    let current = startDir;
    for (let i = 0; i < MAX_DIRECTORY_TRAVERSAL_DEPTH; i++) {
      if (fs.existsSync(path.join(current, 'package.json'))) return current;
      const parent = path.dirname(current);
      if (parent === current) break; // Reached filesystem root
      current = parent;
    }
    // Fallback: no package.json found within limit; use the original runtime directory.
    return startDir;
  }

  const projectRoot = findProjectRoot(runtimeDir);

  const candidatePaths: string[] = [];
  const pushCandidate = (base: string, prefix: string[] = []) => {
    candidatePaths.push(path.join(base, ...prefix, ...segments));
  };

  pushCandidate(runtimeDir, ['resources']);
  pushCandidate(projectRoot, ['resources']);
  pushCandidate(projectRoot, ['public', 'resources']);

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    `Resource not found. Looked for: ${segments.join('/')}. Tried paths:\n` +
      candidatePaths.map((c) => ` - ${c}`).join('\n'),
  );
}
