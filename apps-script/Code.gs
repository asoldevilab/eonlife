/**
 * EON Life · Human Performance — servidor (Google Apps Script)
 *
 * Aquest codi va dins del projecte d'Apps Script VINCULAT al full de càlcul del centre
 * (al full: Extensions → Apps Script). Guia pas a pas: docs/INSTALLACIO.md
 *
 * Com es guarden les dades:
 *  · Una pestanya per tipus de dada (Pacients, Valoracions, Sessions, Biblioteca, Plantilles, Configuracio).
 *    Cada fila és un registre. Les primeres columnes són tècniques (id, dates, còpia completa en JSON,
 *    amagada) i a continuació hi ha columnes llegibles (una per test, per dada…) que l'app omple sola.
 *  · Registre_exercicis: una fila per exercici de cada sessió, per filtrar i fer gràfics.
 *  · Una carpeta de Drive per client (vídeos, informes, documents) dins de "EON Life · Clients".
 */

var APP_TITLE = 'EON Life · Human Performance';

var SHEETS = {
  patients: 'Pacients',
  assessments: 'Valoracions',
  sessions: 'Sessions',
  exercises: 'Biblioteca',
  templates: 'Plantilles',
  settings: 'Configuracio',
};
var LOG_SHEET = 'Registre_exercicis';
var BASE = ['id', 'patient_id', 'updated_at', 'updated_by', 'deleted', 'data_json'];
var LOG_BASE = ['session_id', 'patient_id'];
var CELL_LIMIT = 45000; // una cel·la de Google Sheets admet 50.000 caràcters
var ROOT_FOLDER_NAME = 'EON Life · Clients';
var SUBFOLDERS = ['01 · Valoracions', '02 · Vídeos', '03 · Informes'];
var BRAND = '#421215';

// ── Aplicació web ──
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

// Menú al full de càlcul.
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('EON Life')
    .addItem('Obre l\'aplicació', 'openApp')
    .addItem('Prepara el full (primer cop)', 'setup')
    .addToUi();
}

function openApp() {
  var url = ScriptApp.getService().getUrl();
  var body = url
    ? '<p style="font-family:sans-serif"><a href="' + url + '" target="_blank" rel="noopener">Obre EON Life</a></p>'
    : '<p style="font-family:sans-serif">Encara no has publicat l\'aplicació: Implementa → Nova implementació → Aplicació web.</p>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(body).setWidth(360).setHeight(110), 'EON Life');
}

/**
 * Executa-la UN COP des de l'editor (botó ▶ amb "setup" seleccionat).
 * Crea les pestanyes, la carpeta de clients i desa les referències.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Obre aquest projecte des del full de càlcul (Extensions → Apps Script) i torna a executar setup().');
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId());
  Object.keys(SHEETS).forEach(function (kind) { sheet_(ss, kind); });
  logSheet_(ss);
  var root = rootFolder_(true);
  ss.getSheets().forEach(function (sh) {
    if (/^(Full|Hoja|Sheet|Feuille|Blad)\s?1$/i.test(sh.getName()) && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
  Logger.log('Full de càlcul: ' + ss.getUrl());
  Logger.log('Carpeta de clients: ' + root.getUrl());
  return { spreadsheetUrl: ss.getUrl(), rootFolderUrl: root.getUrl() };
}

// ── Punt d'entrada de l'app (google.script.run.api) ──
function api(req) {
  try {
    req = req || {};
    var data;
    switch (req.action) {
      case 'bootstrap': data = bootstrap_(); break;
      case 'upsert': data = upsert_(req.kind, req.record, req.flat || {}, req.log || null); break;
      case 'ensureFolder': data = ensureFolder_(req.patient || {}); break;
      case 'listFiles': data = listFiles_(req.folderId); break;
      default: throw new Error('Acció desconeguda: ' + req.action);
    }
    return { ok: true, data: data };
  } catch (err) {
    console.error(err);
    return { ok: false, error: String((err && err.message) || err) };
  }
}

function bootstrap_() {
  var ss = ss_();
  var records = {};
  Object.keys(SHEETS).forEach(function (kind) {
    var sh = ss.getSheetByName(SHEETS[kind]);
    // Els registres eliminats de la biblioteca i les plantilles cal enviar-los: amaguen els de base.
    var keepDeleted = kind === 'exercises' || kind === 'templates';
    records[kind] = sh ? readRecords_(sh, keepDeleted) : [];
  });
  var root = rootFolder_(false);
  return {
    user: Session.getActiveUser().getEmail() || '',
    spreadsheetUrl: ss.getUrl(),
    rootFolderUrl: root ? root.getUrl() : '',
    records: records,
  };
}

function upsert_(kind, record, flat, log) {
  if (!SHEETS[kind]) throw new Error('Tipus de dada desconegut: ' + kind);
  if (!record || !record.id || !/^[A-Za-z0-9_-]{1,80}$/.test(String(record.id))) throw new Error('Registre sense identificador vàlid.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = ss_();
    var sh = sheet_(ss, kind);
    var now = new Date().toISOString();
    var user = Session.getActiveUser().getEmail() || '';
    record.updatedAt = now;
    record.updatedBy = user;
    var json = JSON.stringify(record);
    var chunks = [];
    for (var i = 0; i < json.length; i += CELL_LIMIT) chunks.push(json.slice(i, i + CELL_LIMIT));
    var chunkKeys = chunks.slice(1).map(function (_, n) { return 'data_json_' + (n + 2); });
    var readable = Object.keys(flat || {}).filter(function (k) {
      return BASE.indexOf(k) < 0 && !/^data_json/.test(k) && k.length <= 200 && !/[\r\n]/.test(k);
    });
    var headers = ensureHeaders_(sh, chunkKeys.concat(readable));
    var row = headers.map(function (h) {
      if (h === 'id') return record.id;
      if (h === 'patient_id') return kind === 'patients' ? record.id : (record.patientId || '');
      if (h === 'updated_at') return now;
      if (h === 'updated_by') return user;
      if (h === 'deleted') return !!record.deleted;
      if (h === 'data_json') return chunks[0] || '';
      if (/^data_json_\d+$/.test(h)) return chunks[Number(h.split('_').pop()) - 1] || '';
      return cell_(flat[h]);
    });
    var r = findRow_(sh, record.id);
    if (r) sh.getRange(r, 1, 1, headers.length).setValues([row]);
    else appendRows_(sh, [row]);
    if (kind === 'sessions') writeLog_(ss, record, record.deleted ? [] : (log || []));
    return { id: record.id, updatedAt: now, updatedBy: user };
  } finally {
    lock.releaseLock();
  }
}

// Crea (o recupera) la carpeta de Drive del client amb les subcarpetes.
function ensureFolder_(p) {
  if (!p.id || !/^[A-Za-z0-9_-]{1,80}$/.test(String(p.id))) throw new Error('Client sense identificador vàlid.');
  if (p.folderId) {
    try {
      var existing = DriveApp.getFolderById(p.folderId);
      if (!existing.isTrashed()) return { folderId: existing.getId(), folderUrl: existing.getUrl() };
    } catch (e) { /* la carpeta ja no existeix: se'n crea una de nova */ }
  }
  var root = rootFolder_(true);
  var it = root.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().indexOf(p.id) >= 0 && !f.isTrashed()) return { folderId: f.getId(), folderUrl: f.getUrl() };
  }
  var name = [[p.lastName, p.firstName].filter(Boolean).join(', ') || 'Client', p.id].join(' · ');
  var folder = root.createFolder(name);
  SUBFOLDERS.forEach(function (n) { folder.createFolder(n); });
  return { folderId: folder.getId(), folderUrl: folder.getUrl() };
}

// Fitxers de la carpeta del client i de les seves subcarpetes (per enllaçar vídeos).
function listFiles_(folderId) {
  if (!folderId) return [];
  var folder = DriveApp.getFolderById(folderId);
  var out = [];
  var add = function (file, where) {
    out.push({ id: file.getId(), name: file.getName(), url: file.getUrl(), mimeType: file.getMimeType(), folder: where, updated: file.getLastUpdated().toISOString() });
  };
  var files = folder.getFiles();
  while (files.hasNext() && out.length < 300) add(files.next(), '');
  var subs = folder.getFolders();
  while (subs.hasNext() && out.length < 300) {
    var sub = subs.next();
    var inner = sub.getFiles();
    while (inner.hasNext() && out.length < 300) add(inner.next(), sub.getName());
  }
  out.sort(function (a, b) { return a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0; });
  return out;
}

// ── Utilitats internes ──
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('Falta preparar el full de càlcul: executa la funció setup() des de l\'editor d\'Apps Script.');
}

function sheet_(ss, kind) {
  var name = SHEETS[kind];
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, BASE.length).setValues([BASE]);
    styleHeader_(sh, 1, BASE.length);
    sh.setFrozenRows(1);
    sh.hideColumns(BASE.indexOf('data_json') + 1);
  }
  return sh;
}

function logSheet_(ss) {
  var sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LOG_SHEET);
    sh.getRange(1, 1, 1, LOG_BASE.length).setValues([LOG_BASE]);
    styleHeader_(sh, 1, LOG_BASE.length);
    sh.setFrozenRows(1);
  }
  return sh;
}

function styleHeader_(sh, col, n) {
  sh.getRange(1, col, 1, n).setFontWeight('bold').setBackground(BRAND).setFontColor('#ffffff');
}

function rootFolder_(create) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('ROOT_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* s'ha esborrat o no hi ha accés */ }
  }
  if (!create) return null;
  var ss = ss_();
  var parents = DriveApp.getFileById(ss.getId()).getParents();
  var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var folder = parent.createFolder(ROOT_FOLDER_NAME);
  props.setProperty('ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function headers_(sh) {
  var width = Math.max(sh.getLastColumn(), 1);
  var h = sh.getRange(1, 1, 1, width).getValues()[0].map(function (x) { return String(x); });
  while (h.length && h[h.length - 1] === '') h.pop();
  return h;
}

// Afegeix a la dreta les columnes que encara no existeixen.
function ensureHeaders_(sh, keys) {
  var headers = headers_(sh);
  var missing = [];
  keys.forEach(function (k) { if (headers.indexOf(k) < 0 && missing.indexOf(k) < 0) missing.push(k); });
  if (missing.length) {
    var start = headers.length + 1;
    var needed = start + missing.length - 1;
    if (sh.getMaxColumns() < needed) sh.insertColumnsAfter(sh.getMaxColumns(), needed - sh.getMaxColumns());
    sh.getRange(1, start, 1, missing.length).setValues([missing]);
    styleHeader_(sh, start, missing.length);
    missing.forEach(function (k, i) { if (/^data_json/.test(k)) sh.hideColumns(start + i); });
    headers = headers.concat(missing);
  }
  return headers;
}

function findRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function appendRows_(sh, rows) {
  if (!rows.length) return;
  var start = sh.getLastRow() + 1;
  var needed = start + rows.length - 1;
  if (sh.getMaxRows() < needed) sh.insertRowsAfter(sh.getMaxRows(), needed - sh.getMaxRows());
  var width = rows[0].length;
  if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
  sh.getRange(start, 1, rows.length, width).setValues(rows);
}

function readRecords_(sh, keepDeleted) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var headers = headers_(sh);
  var width = headers.length;
  var iJson = headers.indexOf('data_json');
  var iDel = headers.indexOf('deleted');
  var extra = headers
    .map(function (h, i) { return { i: i, n: /^data_json_(\d+)$/.test(h) ? Number(h.split('_').pop()) : 0 }; })
    .filter(function (x) { return x.n > 0; })
    .sort(function (a, b) { return a.n - b.n; });
  var values = sh.getRange(2, 1, last - 1, width).getValues();
  var out = [];
  values.forEach(function (row) {
    if (!row[0]) return;
    var deleted = row[iDel] === true || String(row[iDel]).toUpperCase() === 'TRUE';
    if (deleted && !keepDeleted) return;
    var json = String(row[iJson] || '');
    extra.forEach(function (x) { json += String(row[x.i] || ''); });
    if (!json) return;
    try {
      var rec = JSON.parse(json);
      if (deleted) rec.deleted = true;
      out.push(rec);
    } catch (e) {
      console.warn('Fila il·legible a ' + sh.getName() + ': ' + row[0]);
    }
  });
  return out;
}

// Registre d'exercicis: substitueix les files de la sessió per les actuals.
function writeLog_(ss, session, rows) {
  var sh = logSheet_(ss);
  var last = sh.getLastRow();
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    var i = ids.length - 1;
    while (i >= 0) {
      if (String(ids[i][0]) === String(session.id)) {
        var j = i;
        while (j - 1 >= 0 && String(ids[j - 1][0]) === String(session.id)) j--;
        var count = i - j + 1;
        // Google Sheets no deixa esborrar totes les files no fixades: n'afegim una de buida abans.
        if (sh.getMaxRows() - count < 2) sh.insertRowsAfter(sh.getMaxRows(), 1);
        sh.deleteRows(j + 2, count);
        i = j - 1;
      } else {
        i--;
      }
    }
  }
  if (!rows || !rows.length) return;
  var keys = [];
  rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (keys.indexOf(k) < 0 && LOG_BASE.indexOf(k) < 0) keys.push(k); }); });
  var headers = ensureHeaders_(sh, keys);
  var values = rows.map(function (r) {
    return headers.map(function (h) {
      if (h === 'session_id') return session.id;
      if (h === 'patient_id') return session.patientId || '';
      return cell_(r[h]);
    });
  });
  appendRows_(sh, values);
}

// Valor segur per a una cel·la: números com a número i res que el full pugui llegir com a fórmula.
function cell_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return isFinite(v) ? v : '';
  if (typeof v === 'boolean') return v;
  var s = String(v);
  if (/^-?\d+([.,]\d+)?$/.test(s)) return Number(s.replace(',', '.'));
  return /^[=+\-@]/.test(s) ? '\'' + s : s;
}
