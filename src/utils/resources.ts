import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Maximum number of parent directories to ascend while locating the project root.
const MAX_DIRECTORY_TRAVERSAL_DEPTH = 10;

/**
 * Resolve the absolute path to a resource file (e.g. data, word lists, templates) in both
 * development and production environments.
 *
 * Search order (first existing path wins):
 *  1. <runtimeDir>/resources/...            (bundled runtime: resources collocated with compiled code)
 *  2. <projectRoot>/resources/...           (deployment: resources copied to repository root)
 *  3. <projectRoot>/public/resources/...    (development: raw resources under public/)
 *
 * The project root is inferred by ascending parent directories from the calling file until a
 * directory containing a package.json is found (bounded by MAX_DIRECTORY_TRAVERSAL_DEPTH).
 *
 * @param segments One or more path components identifying the resource relative to the resource
 *                 root (e.g. resolveResourcePath('sutom', 'mots.filtered.txt')). Each argument is
 *                 treated as a distinct path segment to remain cross‑platform and avoid manual
 *                 string concatenation.
 * @returns The absolute filesystem path to the first matching resource.
 * @throws  If no candidate path exists for the provided segments.
 *
 * @example
 * const wordListPath = resolveResourcePath('sutom', 'mots.filtered.txt');
 * const contents = fs.readFileSync(wordListPath, 'utf-8');
 */
export function resolveResourcePath(...segments: string[]): string {
  const runtimeDir = path.dirname(fileURLToPath(import.meta.url));

  // Ascend directories (bounded) to locate a directory containing package.json. If none is found
  // within the traversal limit, fall back to the starting directory so resolution still attempts
  // runtime-relative locations.
  function findProjectRoot(startDir: string): string {
    let current = startDir;
    for (let i = 0; i < MAX_DIRECTORY_TRAVERSAL_DEPTH; i++) {
      if (fs.existsSync(path.join(current, 'package.json'))) return current;
      const parent = path.dirname(current);
      if (parent === current) break; // Reached filesystem root
      current = parent;
    }
    // No package.json found within limit; use the original runtime directory.
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
