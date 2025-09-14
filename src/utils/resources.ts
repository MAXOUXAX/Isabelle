import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

  function findProjectRoot(dir: string): string {
    let current = dir;
    for (let i = 0; i < 10; i++) {
      if (fs.existsSync(path.join(current, 'package.json'))) return current;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return dir;
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
