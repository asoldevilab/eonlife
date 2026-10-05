// Carrega els mòduls de l'app (sense interfície) en un context de Node per als tests.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const jsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'js');

const memoryStorage = (map) => ({
  getItem: (k) => (map.has(k) ? map.get(k) : null),
  setItem: (k, v) => map.set(k, String(v)),
  removeItem: (k) => map.delete(k),
});

export function loadCore(upTo = '07', { window: win = {}, ...extra } = {}) {
  const files = readdirSync(jsDir).filter((f) => f.endsWith('.js') && f.slice(0, 2) <= upTo).sort();
  const storage = new Map();
  const context = {
    console,
    setTimeout, clearTimeout,
    TextEncoder, TextDecoder, URL, URLSearchParams, Blob, btoa, atob, escape, crypto: globalThis.crypto,
    window: {
      htmPreact: {},
      localStorage: memoryStorage(storage),
      sessionStorage: memoryStorage(new Map()),
      location: { origin: 'https://app.eonlife.test', pathname: '/', search: '', hash: '', assign() {} },
      history: { replaceState() {} },
      ...win,
    },
    ...extra,
  };
  context.globalThis = context;
  vm.createContext(context);
  const code = files.map((f) => readFileSync(join(jsDir, f), 'utf8')).join('\n;\n')
    + '\n;globalThis.__core = { DB, DB_TABLES, U, BLOCKS, OPT, THRESHOLDS, SCORES, PATTERNS, PROTOCOL, TEST_INDEX, SEED_EXERCISES, SEED_TEMPLATES, Calc, Flat, parseMyJumpCsv, makeDemoData, Store: typeof Store !== "undefined" ? Store : null, LocalBackend: typeof LocalBackend !== "undefined" ? LocalBackend : null, Xlsx: typeof Xlsx !== "undefined" ? Xlsx : null, DoctorReport: typeof DoctorReport !== "undefined" ? DoctorReport : null, KinventPdf: typeof KinventPdf !== "undefined" ? KinventPdf : null, migrateDemo: typeof migrateDemo !== "undefined" ? migrateDemo : null, removeDemoClients: typeof removeDemoClients !== "undefined" ? removeDemoClients : null, cloneBlocks: typeof cloneBlocks !== "undefined" ? cloneBlocks : null, progressBlocks: typeof progressBlocks !== "undefined" ? progressBlocks : null, M365: typeof M365 !== "undefined" ? { M365, MsAuth, GraphClient, ExcelDb, M365Api, M365Backend, Outbox, XL, xlCell, m365TemplateSheets, m365TemplateFile, M365_NAMES } : null };';
  vm.runInContext(code, context, { filename: 'eonlife-core.js' });
  context.__core.__storage = storage;
  return context.__core;
}
