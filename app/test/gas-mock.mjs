// Simulació mínima dels serveis de Google Apps Script per provar Code.gs amb Node.
// Reprodueix les restriccions que ens importen (límits de la graella, files fixades, etc.).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let seq = 0;
const nextId = (p) => `${p}${++seq}`;

class Range {
  constructor(sheet, row, col, rows, cols) {
    Object.assign(this, { sheet, row, col, rows, cols });
    if (row < 1 || col < 1 || rows < 1 || cols < 1) throw new Error(`Rang no vàlid (${row},${col},${rows},${cols})`);
    if (row + rows - 1 > sheet.maxRows || col + cols - 1 > sheet.maxCols) {
      throw new Error(`The coordinates of the range are outside the dimensions of the sheet. (${row},${col},${rows},${cols}) max ${sheet.maxRows}x${sheet.maxCols}`);
    }
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.rows; r++) {
      const line = [];
      for (let c = 0; c < this.cols; c++) {
        const v = (this.sheet.cells[this.row - 1 + r] || [])[this.col - 1 + c];
        line.push(v === undefined ? '' : v);
      }
      out.push(line);
    }
    return out;
  }
  setValues(values) {
    if (values.length !== this.rows || values.some((l) => l.length !== this.cols)) throw new Error('Les dimensions de les dades no coincideixen amb el rang.');
    values.forEach((line, r) => line.forEach((v, c) => {
      const R = this.row - 1 + r;
      this.sheet.cells[R] = this.sheet.cells[R] || [];
      // Com Google Sheets: un apòstrof inicial força text i no es desa.
      this.sheet.cells[R][this.col - 1 + c] = typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
      if (typeof v === 'string' && v.length > 50000) throw new Error('Your input contains more than the maximum of 50000 characters in a single cell.');
    }));
    return this;
  }
  clearContent() { return this.setValues(this.getValues().map((l) => l.map(() => ''))); }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
}

class Sheet {
  constructor(name) { Object.assign(this, { name, cells: [], maxRows: 1000, maxCols: 26, frozen: 0, hidden: new Set() }); }
  getName() { return this.name; }
  getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
  getLastRow() {
    for (let r = this.cells.length - 1; r >= 0; r--) if ((this.cells[r] || []).some((v) => v !== '' && v !== undefined)) return r + 1;
    return 0;
  }
  getLastColumn() {
    let m = 0;
    for (const line of this.cells) if (line) line.forEach((v, c) => { if (v !== '' && v !== undefined) m = Math.max(m, c + 1); });
    return m;
  }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  insertColumnsAfter(after, n) { this.maxCols += n; }
  insertRowsAfter(after, n) { this.maxRows += n; this.cells.splice(after, 0, ...Array.from({ length: n }, () => [])); }
  deleteRows(start, n) {
    if (start <= this.frozen) throw new Error('No es poden esborrar files fixades.');
    if (this.maxRows - n <= this.frozen) throw new Error('Sorry, it is not possible to delete all non-frozen rows.');
    this.cells.splice(start - 1, n);
    this.maxRows -= n;
  }
  hideColumns(c) { this.hidden.add(c); }
  setFrozenRows(n) { this.frozen = n; }
}

class Spreadsheet {
  constructor() { this.id = nextId('SS'); this.sheets = [new Sheet('Full 1')]; }
  getId() { return this.id; }
  getUrl() { return `https://docs.google.com/spreadsheets/d/${this.id}`; }
  getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; }
  insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; }
  getSheets() { return [...this.sheets]; }
  deleteSheet(s) { this.sheets = this.sheets.filter((x) => x !== s); }
}

const iter = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };

class DriveFile {
  constructor(name, mimeType) { Object.assign(this, { id: nextId('F'), name, mimeType, updated: new Date() }); }
  getId() { return this.id; }
  getName() { return this.name; }
  getUrl() { return `https://drive.google.com/file/d/${this.id}`; }
  getMimeType() { return this.mimeType; }
  getLastUpdated() { return this.updated; }
}

class Folder {
  constructor(name, drive) { Object.assign(this, { id: nextId('D'), name, drive, folders: [], files: [], trashed: false }); drive.byId[this.id] = this; }
  getId() { return this.id; }
  getName() { return this.name; }
  getUrl() { return `https://drive.google.com/drive/folders/${this.id}`; }
  isTrashed() { return this.trashed; }
  createFolder(name) { const f = new Folder(name, this.drive); this.folders.push(f); return f; }
  getFolders() { return iter(this.folders); }
  getFiles() { return iter(this.files); }
  addFile(name, mime) { const f = new DriveFile(name, mime); this.files.push(f); return f; }
}

export function loadGas({ user = 'coach@eonlife.test' } = {}) {
  const ss = new Spreadsheet();
  const drive = { byId: {} };
  const myDrive = new Folder('La meva unitat', drive);
  const props = new Map();
  const logs = [];
  const context = {
    console: { log: () => {}, warn: (m) => logs.push(m), error: (m) => logs.push(String(m)) },
    Logger: { log: (m) => logs.push(m) },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      openById: (id) => { if (id !== ss.id) throw new Error('No es pot obrir el full'); return ss; },
      getUi: () => ({ createMenu: () => ({ addItem() { return this; }, addToUi() {} }), showModalDialog() {} }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Session: { getActiveUser: () => ({ getEmail: () => user }) },
    DriveApp: {
      getFileById: () => ({ getParents: () => iter([myDrive]) }),
      getRootFolder: () => myDrive,
      getFolderById: (id) => { const f = drive.byId[id]; if (!f) throw new Error('No existeix'); return f; },
    },
    HtmlService: {
      createHtmlOutputFromFile: (n) => ({ n, setTitle() { return this; }, addMetaTag() { return this; } }),
      createHtmlOutput: () => ({ setWidth() { return this; }, setHeight() { return this; } }),
    },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/x/exec' }) },
  };
  vm.createContext(context);
  const code = readFileSync(new URL('../../apps-script/Code.gs', import.meta.url), 'utf8');
  vm.runInContext(code + '\n;globalThis.__gas = { setup, api, doGet, onOpen };', context);
  return { gas: context.__gas, ss, drive, myDrive, props, logs };
}
