/* EON Life · generador de fitxers Excel (.xlsx) sense dependències.
   Serveix per crear la plantilla de la base de dades a Microsoft 365: un full per tipus de dada,
   cadascun amb una taula d'Excel (capçalera de color, primera fila fixada i columnes internes amagades). */

const Xlsx = (() => {
  const esc = (s) => String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const colName = (n) => { // 1 → A, 27 → AA
    let s = '';
    for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
    return s;
  };

  // ── ZIP (sense compressió) ──
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (bytes) => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };

  function zip(files) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    const u16 = (v) => [v & 0xFF, (v >>> 8) & 0xFF];
    const u32 = (v) => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];
    const DOS_TIME = 0, DOS_DATE = ((2024 - 1980) << 9) | (1 << 5) | 1;
    for (const f of files) {
      const name = enc.encode(f.name);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(DOS_TIME), ...u16(DOS_DATE), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
      const local = new Uint8Array([...u32(0x04034b50), ...common]);
      parts.push(local, name, data);
      central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
      offset += local.length + name.length + data.length;
    }
    const cdSize = central.reduce((n, p) => n + p.length, 0);
    const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
    const all = [...parts, ...central, end];
    const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
    let pos = 0;
    for (const p of all) { out.set(p, pos); pos += p.length; }
    return out;
  }

  // ── Llibre ──
  // sheets: [{ name, table?, columns: [{ name, width?, hidden? }], rows?: [[...]] }]
  function workbook(sheets, { brand = '421215' } = {}) {
    const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const NSR = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
    const files = [];
    const ct = [
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    ];
    const wbRels = [];
    const wbSheets = [];
    let tableNo = 0;

    const cell = (ref, v, style) => {
      const s = style ? ` s="${style}"` : '';
      if (v === null || v === undefined || v === '') return '';
      if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
      if (typeof v === 'boolean') return `<c r="${ref}"${s} t="b"><v>${v ? 1 : 0}</v></c>`;
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    };

    sheets.forEach((sh, i) => {
      const n = i + 1;
      const cols = sh.columns;
      const width = cols.length;
      const rows = sh.rows || [];
      const last = colName(width);
      const lastRow = Math.max(2, rows.length + 1);
      const xmlRows = [`<row r="1">${cols.map((c, j) => cell(`${colName(j + 1)}1`, c.name, 1)).join('')}</row>`];
      rows.forEach((r, k) => {
        xmlRows.push(`<row r="${k + 2}">${r.map((v, j) => cell(`${colName(j + 1)}${k + 2}`, v)).join('')}</row>`);
      });
      const colXml = cols.map((c, j) => `<col min="${j + 1}" max="${j + 1}" width="${c.width || 16}" customWidth="1"${c.hidden ? ' hidden="1"' : ''}/>`).join('');
      let tableRef = '';
      if (sh.table) {
        tableNo++;
        const tid = tableNo;
        const ref = `A1:${last}${lastRow}`;
        files.push({
          name: `xl/tables/table${tid}.xml`,
          data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<table xmlns="${NS}" id="${tid}" name="${esc(sh.table)}" displayName="${esc(sh.table)}" ref="${ref}" totalsRowShown="0">`
            + `<autoFilter ref="${ref}"/><tableColumns count="${width}">${cols.map((c, j) => `<tableColumn id="${j + 1}" name="${esc(c.name)}"/>`).join('')}</tableColumns>`
            + '<tableStyleInfo name="TableStyleLight15" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>',
        });
        files.push({
          name: `xl/worksheets/_rels/sheet${n}.xml.rels`,
          data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${tid}.xml"/></Relationships>`,
        });
        ct.push(`<Override PartName="/xl/tables/table${tid}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`);
        tableRef = '<tableParts count="1"><tablePart r:id="rId1"/></tableParts>';
      }
      files.push({
        name: `xl/worksheets/sheet${n}.xml`,
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="${NS}" xmlns:r="${NSR}">`
          + `<dimension ref="A1:${last}${lastRow}"/>`
          + `<sheetViews><sheetView workbookViewId="0"${i === 0 ? ' tabSelected="1"' : ''}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>`
          + '<sheetFormatPr defaultRowHeight="15"/>'
          + `<cols>${colXml}</cols><sheetData>${xmlRows.join('')}</sheetData>`
          + '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
          + `${tableRef}</worksheet>`,
      });
      ct.push(`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
      wbRels.push(`<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/>`);
      wbSheets.push(`<sheet name="${esc(sh.name)}" sheetId="${n}" r:id="rId${n}"/>`);
    });
    const stylesId = sheets.length + 1;
    wbRels.push(`<Relationship Id="rId${stylesId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`);

    files.unshift(
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${ct.join('')}</Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="${NS}" xmlns:r="${NSR}"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="16000"/></bookViews><sheets>${wbSheets.join('')}</sheets></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${PKG}">${wbRels.join('')}</Relationships>` },
      {
        name: 'xl/styles.xml',
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="${NS}">`
          + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts>'
          + `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${brand}"/><bgColor indexed="64"/></patternFill></fill></fills>`
          + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
          + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
          + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>'
          + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
          + '</styleSheet>',
      },
    );
    return zip(files);
  }

  return { workbook, colName, zip, crc32 };
})();
