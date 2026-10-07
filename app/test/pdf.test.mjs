// Proves de l'escriptor de PDF (08-pdf.js) i de les regles d'impressió per al PDF de l'informe (17-reportpdf.js).
//   node --test app/test/pdf.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadCore } from './load-core.mjs';

// JPEG de 8 × 8 píxels (granat de la marca).
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDwCiiiuc9s/9k=', 'base64');

test('PDF: una pàgina A4 per imatge, taula de referències correcta i títol amb accents', () => {
  const { PdfWriter } = loadCore('08');
  const jpeg = new Uint8Array(JPEG);
  const bytes = PdfWriter.build([{ jpeg, w: 8, h: 8 }, { jpeg, w: 8, h: 8 }], { title: 'Valoració inicial · Laura Vidal Serra', author: 'EON Life' });
  const text = Buffer.from(bytes).toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4\n'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
  assert.equal((text.match(/\/Type \/Page\b/g) || []).length, 2);
  assert.match(text, /\/Count 2/);
  assert.match(text, /\/MediaBox \[0 0 595\.28 841\.89\]/);
  assert.equal((text.match(/\/Filter \/DCTDecode/g) || []).length, 2);
  // Cada entrada de la taula de referències apunta exactament a l'inici del seu objecte.
  const xrefAt = Number(text.match(/startxref\n(\d+)\n/)[1]);
  assert.ok(text.slice(xrefAt).startsWith('xref\n'));
  const entries = [...text.slice(xrefAt).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  entries.forEach((off, i) => assert.ok(text.slice(off).startsWith(`${i + 1} 0 obj\n`), `objecte ${i + 1}`));
  assert.equal(Number(text.match(/\/Size (\d+)/)[1]), entries.length + 1);
  // El JPEG va sencer, amb la seva llargada
  const at = text.indexOf('stream\n\xff\xd8');
  assert.ok(at > 0);
  assert.equal(Buffer.from(bytes.slice(at + 7, at + 7 + JPEG.length)).compare(JPEG), 0);
  // Títol amb accents en UTF-16
  assert.equal(PdfWriter.pdfText('Valoració'), '<FEFF00560061006C006F007200610063006900F3>');
  assert.equal(PdfWriter.pdfText('Re-test (1)'), '(Re-test \\(1\\))');
  // Un lector de veritat l'obre (si hi ha pdfinfo)
  if (spawnSync('pdfinfo', ['-v']).status === 0) {
    const dir = mkdtempSync(join(tmpdir(), 'eon-pdf-'));
    const f = join(dir, 'informe.pdf');
    writeFileSync(f, bytes);
    const r = spawnSync('pdfinfo', [f], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Pages:\s+2/);
    assert.match(r.stdout, /Title:\s+Valoració inicial · Laura Vidal Serra/);
    assert.match(r.stdout, /Page size:\s+595\.28 x 841\.89 pts \(A4\)/);
    assert.doesNotMatch(r.stderr, /Syntax Error/);
  }
  assert.throws(() => PdfWriter.build([]), /cap pàgina/);
  assert.throws(() => PdfWriter.build([{ jpeg: new Uint8Array([1, 2, 3]), w: 1, h: 1 }]), /no és una imatge JPEG/);
});

test('PDF de l\'informe: les regles d\'impressió passen a .pdf-mode', () => {
  const { PrintScope } = loadCore('08');
  const S = (s) => PrintScope.scope(s);
  assert.equal(S(':root, :root:not([data-theme="light"]), :root[data-theme="dark"]'), '.pdf-mode, .pdf-mode, .pdf-mode');
  assert.equal(S('html, body'), '.pdf-mode, .pdf-mode');
  assert.equal(S('.no-print, .presentbar'), '.pdf-mode .no-print, .pdf-mode .presentbar');
  assert.equal(S('.rsec-title, .h3'), '.pdf-mode .rsec-title, .pdf-mode .h3');
  assert.equal(S('*'), '.pdf-mode *');
  assert.equal(S('.a:is(.b, .c) > p'), '.pdf-mode .a:is(.b, .c) > p');
  assert.equal(S('body .x'), '.pdf-mode .x');
});
