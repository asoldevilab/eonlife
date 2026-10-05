/* EON Life · utilitats generals (dates, números, text, fitxers). */
'use strict';

const { h, render, html, useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } = window.htmPreact;

// Dins del visor d'enllaços privats de claude.ai no es pot imprimir ni descarregar fitxers.
const IS_ARTIFACT = window.EON_ENV === 'artifact';
// L'app de les tauletes (mode local amb clients reals): comença buida i treu els clients de prova d'abans.
const NO_DEMO = window.EON_NO_DEMO === true;

const MONTHS = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
const MONTHS_SHORT = ['gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];
const WEEKDAYS = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
const WEEKDAYS_SHORT = ['dg', 'dl', 'dt', 'dc', 'dj', 'dv', 'ds'];

const U = {
  uid(prefix) {
    const t = Date.now().toString(36).toUpperCase();
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${t}${r}`;
  },

  clone(o) {
    return o == null ? o : JSON.parse(JSON.stringify(o));
  },

  // Accepta "12,5", "12.5", 12.5. Retorna null si no és un número.
  num(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '' || s === '-' || s === '.') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  },

  round(n, d = 1) {
    if (n == null || !Number.isFinite(n)) return null;
    const f = 10 ** d;
    return Math.round(n * f) / f;
  },

  // Format català: coma decimal.
  fmt(n, d = 1, fallback = '—') {
    if (n == null || !Number.isFinite(n)) return fallback;
    const r = U.round(n, d);
    const s = d > 0 ? String(r) : String(Math.round(r));
    return s.replace('.', ',');
  },

  // Sempre amb els mateixos decimals (per a columnes de taules): 7 → "7,0".
  fmtFixed(n, d = 1, fallback = '—') {
    if (n == null || !Number.isFinite(n)) return fallback;
    return n.toFixed(d).replace('.', ',');
  },

  fmtSigned(n, d = 1) {
    if (n == null || !Number.isFinite(n)) return '—';
    const s = U.fmt(Math.abs(n), d);
    if (U.round(n, d) === 0) return s;
    return (n > 0 ? '+' : '−') + s;
  },

  // ── Dates (sempre cadenes AAAA-MM-DD, en hora local) ──
  pad(n) { return String(n).padStart(2, '0'); },

  iso(d) {
    return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`;
  },

  today() { return U.iso(new Date()); },

  parse(s) {
    if (!s || typeof s !== 'string') return null;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  },

  addDays(s, n) {
    const d = U.parse(s);
    if (!d) return s;
    d.setDate(d.getDate() + n);
    return U.iso(d);
  },

  addMonths(s, n) {
    const d = U.parse(s);
    if (!d) return s;
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return U.iso(d);
  },

  diffDays(a, b) {
    const da = U.parse(a), db = U.parse(b);
    if (!da || !db) return null;
    return Math.round((db - da) / 86400000);
  },

  // Dilluns de la setmana de la data.
  weekStart(s) {
    const d = U.parse(s);
    if (!d) return s;
    const wd = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - wd);
    return U.iso(d);
  },

  monthKey(s) { return s ? s.slice(0, 7) : ''; },

  // "de setembre", "d'octubre"
  deMonth(m) {
    const name = MONTHS[m];
    return /^[aeiouàèéíòóú]/i.test(name) ? `d'${name}` : `de ${name}`;
  },

  fmtDate(s) {
    const d = U.parse(s);
    if (!d) return '—';
    return `${U.pad(d.getDate())}/${U.pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  },

  fmtDateShort(s) {
    const d = U.parse(s);
    if (!d) return '—';
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  },

  fmtDateLong(s, withWeekday = true) {
    const d = U.parse(s);
    if (!d) return '—';
    const base = `${d.getDate()} ${U.deMonth(d.getMonth())} de ${d.getFullYear()}`;
    return withWeekday ? `${WEEKDAYS[d.getDay()]}, ${base}` : base;
  },

  fmtMonth(key) {
    const [y, m] = key.split('-').map(Number);
    const name = MONTHS[m - 1];
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
  },

  weekday(s) {
    const d = U.parse(s);
    return d ? WEEKDAYS[d.getDay()] : '';
  },

  weekdayShort(s) {
    const d = U.parse(s);
    return d ? WEEKDAYS_SHORT[d.getDay()] : '';
  },

  age(birth, ref) {
    const b = U.parse(birth);
    const r = U.parse(ref || U.today());
    if (!b || !r) return null;
    let a = r.getFullYear() - b.getFullYear();
    if (r.getMonth() < b.getMonth() || (r.getMonth() === b.getMonth() && r.getDate() < b.getDate())) a--;
    return a;
  },

  // "fa 3 dies", "fa 6 setmanes", "fa 4 mesos"
  since(s, ref) {
    const days = U.diffDays(s, ref || U.today());
    if (days == null) return '';
    if (days < 0) return `d'aquí a ${-days} ${-days === 1 ? 'dia' : 'dies'}`;
    if (days === 0) return 'avui';
    if (days < 14) return `fa ${days} ${days === 1 ? 'dia' : 'dies'}`;
    if (days < 70) return `fa ${Math.floor(days / 7)} setmanes`;
    const months = Math.floor(days / 30.44);
    return months < 24 ? `fa ${months} mesos` : `fa ${Math.floor(days / 365.25)} anys`;
  },

  // ── Text ──
  norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  },

  initials(p) {
    const a = (p.firstName || '').trim().charAt(0);
    const b = (p.lastName || '').trim().charAt(0);
    return (a + b).toUpperCase() || '·';
  },

  fullName(p) {
    if (!p) return '';
    return [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || 'Sense nom';
  },

  plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; },

  cls(...parts) {
    return parts.flat().filter(Boolean).join(' ');
  },

  sortBy(arr, key, dir = 1) {
    const f = typeof key === 'function' ? key : (o) => o[key];
    return [...arr].sort((a, b) => {
      const va = f(a), vb = f(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  },

  debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },

  // ── Fitxers ──
  download(filename, text, mime = 'text/plain') {
    try {
      const blob = new Blob([text], { type: `${mime};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      return true;
    } catch (e) {
      return false;
    }
  },

  readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(r.error || new Error('No s\'ha pogut llegir el fitxer.'));
      r.readAsText(file);
    });
  },

  csvCell(v) {
    if (v == null) return '';
    const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  },

  // CSV amb ";" i BOM perquè Excel (configuració catalana/espanyola) l'obri bé.
  toCsv(rows, headers) {
    const lines = [headers.map(U.csvCell).join(';')];
    for (const r of rows) lines.push(headers.map((h) => U.csvCell(r[h])).join(';'));
    return '﻿' + lines.join('\r\n');
  },

  // Lector CSV tolerant (separador ; , o tabulador; cometes dobles).
  parseCsv(text) {
    const src = String(text || '').replace(/^﻿/, '');
    const firstLine = src.split(/\r?\n/)[0] || '';
    const counts = { ';': 0, ',': 0, '\t': 0 };
    for (const ch of firstLine) if (ch in counts) counts[ch]++;
    const sep = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (q) {
        if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && src[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some((x) => x.trim() !== '')) rows.push(row);
        row = [];
      } else cell += c;
    }
    row.push(cell);
    if (row.some((x) => x.trim() !== '')) rows.push(row);
    return rows;
  },

  // Enllaç web, o fitxer desat a la tauleta en la versió de prova («eonlocal:…», vegeu LocalFiles).
  isUrl(s) { const t = String(s || '').trim(); return /^https?:\/\/\S+$/i.test(t) || /^eonlocal:[\w-]+$/.test(t); },
};
