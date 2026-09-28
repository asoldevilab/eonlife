// Carrega els mòduls de l'app (sense interfície) en un context de Node per als tests.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const jsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'js');

export function loadCore(upTo = '06') {
  const files = readdirSync(jsDir).filter((f) => f.endsWith('.js') && f.slice(0, 2) <= upTo).sort();
  const storage = new Map();
  const context = {
    console,
    setTimeout, clearTimeout,
    window: {
      htmPreact: {},
      localStorage: {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k),
      },
    },
  };
  context.globalThis = context;
  vm.createContext(context);
  const code = files.map((f) => readFileSync(join(jsDir, f), 'utf8')).join('\n;\n')
    + '\n;globalThis.__core = { U, BLOCKS, OPT, THRESHOLDS, SCORES, PATTERNS, PROTOCOL, PROFILE_TESTS, TEST_INDEX, SEED_EXERCISES, SEED_TEMPLATES, Calc, Flat, parseMyJumpCsv, makeDemoData, Store: typeof Store !== "undefined" ? Store : null, LocalBackend: typeof LocalBackend !== "undefined" ? LocalBackend : null };';
  vm.runInContext(code, context, { filename: 'eonlife-core.js' });
  context.__core.__storage = storage;
  return context.__core;
}
