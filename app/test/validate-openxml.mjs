// Validació estricta dels Excel amb el validador oficial de Microsoft (Open XML SDK, esquema de Microsoft 365).
//   node app/test/validate-openxml.mjs        (o: npm run test:openxml)
// Fa tots els Excel dels clients de la demo (sessions, valoracions i visió general) més la base de dades buida,
// i hi passa el validador: és el que més s'acosta a saber si Excel obrirà els fitxers sense demanar «reparar».
// Cal el SDK de .NET 8 (`dotnet`) i accés a NuGet la primera vegada. No forma part de `npm test` perquè necessita xarxa.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadCore } from './load-core.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
if (spawnSync('dotnet', ['--version'], { stdio: 'ignore' }).status !== 0) {
  console.log('Cal el SDK de .NET 8 (dotnet) per validar els Excel amb el validador de Microsoft.');
  process.exit(2);
}

const FIXED = new Date(2026, 9, 5, 12, 0, 0).getTime();
class FixedDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(FIXED); }
  static now() { return FIXED; }
}
const core = loadCore('09', { CompressionStream, Response, Date: FixedDate });
const db = core.makeDemoData();
const { Store, ExcelSet, M365 } = core;
Store.data = { patients: db.patients, assessments: db.assessments, sessions: db.sessions, exercises: {}, templates: db.templates };
Store.settings = db.settings;

const out = mkdtempSync(join(tmpdir(), 'eon-openxml-'));
const files = [];
writeFileSync(join(out, 'base-de-dades.xlsx'), M365.m365TemplateFile());
files.push(join(out, 'base-de-dades.xlsx'));
for (const pid of Object.keys(db.patients)) {
  for (const f of ExcelSet.plan(ExcelSet.data(pid, Store), { today: '2026-10-05' })) {
    const path = join(out, `${pid}-${f.name}`);
    writeFileSync(path, (await f.make({}).build({ stamp: '05/10/2026 18:30' })).bytes);
    files.push(path);
  }
}
console.log(`${files.length} fitxers a ${out}`);

const run = spawnSync('dotnet', ['run', '--project', join(dir, 'openxml-validator'), '-c', 'Release', '--', ...files], { stdio: 'inherit', env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1' } });
process.exit(run.status ?? 1);
