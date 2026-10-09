// NOE, l'assistent d'IA: motor, privacitat, eines, propostes i bucle (sense cridar mai l'API real).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load-core.mjs';

const C = loadCore('09');
await C.Store.init();
const { Noe, NoeConfig, NoePseudo, NoeApi, NoeTools, NoeActions, NoeKnowledge, NoeDemo, NOE_MODELS } = C.Noe;
const { Store, U } = C;
const plain = (v) => JSON.parse(JSON.stringify(v)); // el vm té els seus propis Array/Object: es passa a objectes d'aquest context

const cfgReset = () => { NoeConfig.set({ ...NoeConfig.DEFAULTS }); NoeConfig.setKey(''); Noe.state.transport = null; };
const ctxFor = (conv = Noe.newConversation(), privacy = true) => ({ conv, ps: NoePseudo.create(conv.ps), privacy, hooks: {} });
const jordi = () => Store.patients().find((p) => p.firstName === 'Jordi');
const run = (name, input, ctx) => NoeTools.run(name, input, ctx);

// Una resposta SSE (com la de l'API) a partir d'esdeveniments, trencada en trossos arbitraris.
const sse = (events, cut = 37) => {
  const text = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
  const enc = new TextEncoder();
  const chunks = [];
  for (let i = 0; i < text.length; i += cut) chunks.push(enc.encode(text.slice(i, i + cut)));
  return new ReadableStream({ start(c) { chunks.forEach((x) => c.enqueue(x)); c.close(); } });
};
const reply = (events, { status = 200, ctype = 'text/event-stream' } = {}) => ({ ok: status < 400, status, headers: { get: () => ctype }, body: sse(events), text: async () => '', json: async () => ({}) });
const messageEvents = (blocks, stop = 'end_turn') => [
  { type: 'message_start', message: { model: 'm', usage: { input_tokens: 11 } } },
  ...blocks.flatMap((b, index) => (b.type === 'text'
    ? [{ type: 'content_block_start', index, content_block: { type: 'text', text: '' } }, ...b.parts.map((t) => ({ type: 'content_block_delta', index, delta: { type: 'text_delta', text: t } })), { type: 'content_block_stop', index }]
    : [{ type: 'content_block_start', index, content_block: { type: 'tool_use', id: b.id, name: b.name, input: {} } }, ...b.parts.map((t) => ({ type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: t } })), { type: 'content_block_stop', index }])),
  { type: 'message_delta', delta: { stop_reason: stop }, usage: { output_tokens: 7 } }, { type: 'message_stop' },
];

test('NOE: l\'SSE d\'Anthropic es llegeix encara que arribi a trossos (text i eines amb JSON a trossos)', async () => {
  cfgReset();
  const seen = { text: '', tools: [], req: null };
  const f = async (url, init) => { seen.req = { url, init }; return reply(messageEvents([{ type: 'text', parts: ['Hola ', 'món'] }, { type: 'tool_use', id: 'tu1', name: 'llista_pacients', parts: ['{"estat":', '"actiu","limit":3}'] }], 'tool_use')); };
  const msg = await NoeApi.stream({ model: 'x', messages: [] }, { cfg: NoeConfig.get(), key: 'sk-ant-test', fetchImpl: f, onText: (t) => { seen.text += t; }, onTool: (t) => seen.tools.push(plain(t)) });
  assert.equal(seen.text, 'Hola món');
  assert.equal(msg.stop_reason, 'tool_use');
  assert.deepEqual(plain(msg.content[1]), { type: 'tool_use', id: 'tu1', name: 'llista_pacients', input: { estat: 'actiu', limit: 3 } });
  assert.equal(seen.tools.length, 1);
  assert.equal(msg.usage.output_tokens, 7);
  // Capçaleres: directe a Anthropic porta la clau i el permís del navegador; amb servidor intermediari no.
  assert.equal(seen.req.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(seen.req.init.headers['x-api-key'], 'sk-ant-test');
  assert.equal(seen.req.init.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.equal(seen.req.init.headers['anthropic-version'], '2023-06-01');
  assert.equal(JSON.parse(seen.req.init.body).stream, true);
  await NoeApi.stream({ model: 'x', messages: [] }, { cfg: { ...NoeConfig.get(), endpoint: 'https://proxy.eonlife.test/noe' }, key: '', fetchImpl: f });
  assert.equal(seen.req.url, 'https://proxy.eonlife.test/noe');
  assert.equal(seen.req.init.headers['x-api-key'], undefined);
  assert.equal(seen.req.init.headers['anthropic-dangerous-direct-browser-access'], undefined);
});

test('NOE: sense streaming (resposta JSON) també funciona', async () => {
  const full = { content: [{ type: 'text', text: 'Fet' }, { type: 'tool_use', id: 'a', name: 'sessio', input: { sessio: 'S-1' } }], stop_reason: 'tool_use', usage: { input_tokens: 3, output_tokens: 2 }, model: 'm' };
  const f = async () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, body: null, json: async () => full });
  const msg = await NoeApi.stream({ model: 'x' }, { cfg: NoeConfig.get(), key: 'k', fetchImpl: f });
  assert.equal(msg.content[0].text, 'Fet');
  assert.deepEqual(plain(msg.content[1].input), { sessio: 'S-1' });
  assert.equal(msg.stop_reason, 'tool_use');
});

test('NOE: els errors de l\'API es diuen en català i s\'entenen', async () => {
  const err = (status, message, type = 'invalid_request_error') => async () => ({ ok: false, status, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ type: 'error', error: { type, message } }) });
  const go = (status, message) => NoeApi.stream({}, { cfg: NoeConfig.get(), key: 'k', fetchImpl: err(status, message) }).then(() => null, (e) => e);
  assert.match((await go(401, 'invalid x-api-key')).message, /clau de l'API no és vàlida/);
  assert.match((await go(429, 'rate')).message, /límit de peticions o de crèdit/);
  assert.match((await go(529, 'overloaded')).message, /saturat/);
  assert.match((await go(400, 'Your credit balance is too low')).message, /saldo de l'API/);
  assert.match((await go(404, 'model: nope')).message, /No trobo el model «nope»/);
  const net = await NoeApi.stream({}, { cfg: NoeConfig.get(), key: 'k', fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }).then(() => null, (e) => e);
  assert.equal(net.code, 'network');
  assert.match(net.message, /connexió/);
  // Un error enmig del flux (overloaded) també arriba com a error.
  const mid = await NoeApi.stream({}, { cfg: NoeConfig.get(), key: 'k', fetchImpl: async () => reply([{ type: 'message_start', message: {} }, { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }]) }).then(() => null, (e) => e);
  assert.match(mid.message, /saturat/);
});

test('NOE: configuració (la clau es desa a part i el mode depèn de la clau i del consentiment)', () => {
  cfgReset();
  assert.equal(NoeConfig.mode(), 'setup');
  NoeConfig.setKey('sk-ant-123');
  assert.equal(NoeConfig.mode(), 'consent');
  assert.ok(!JSON.stringify(NoeConfig.get()).includes('sk-ant-123'), 'la clau no és a la configuració');
  NoeConfig.set({ consent: true });
  assert.equal(NoeConfig.mode(), 'ai');
  NoeConfig.set({ demo: true });
  assert.equal(NoeConfig.mode(), 'demo');
  cfgReset();
  assert.equal(NoeConfig.get().privacy, true, 'la privacitat és activa per defecte');
  assert.equal(NoeConfig.get().model, 'claude-sonnet-5-5');
  assert.ok(NOE_MODELS.some((m) => m.v === 'claude-opus-5-5') && NOE_MODELS.some((m) => m.v === 'claude-haiku-5-5'));
});

test('NOE privacitat: els noms dels pacients es canvien per codis i tornen en mostrar', () => {
  const p = jordi();
  const ps = NoePseudo.create();
  const full = U.fullName(p);
  const enc = ps.encode(`Planifica el mes per a ${full}, o sigui ${p.lastName}, ${p.firstName}. I també ${p.firstName.toUpperCase()}`);
  assert.ok(!enc.includes(p.firstName) && !enc.includes(p.lastName) && !enc.toLowerCase().includes('jordi'), enc);
  assert.match(enc, /PAC-1/);
  assert.equal(ps.decode('Parlem de PAC-1.'), `Parlem de ${full}.`);
  // Estable: el mateix pacient, el mateix codi; un altre, un altre.
  const other = Store.patients().find((x) => x.id !== p.id);
  assert.equal(ps.ref(p.id), 'PAC-1');
  assert.equal(ps.ref(other.id), 'PAC-2');
  // Els enllaços [[pacient:PAC-1]] no es toquen (l'app els converteix).
  assert.equal(ps.decode('[[pacient:PAC-1]]'), '[[pacient:PAC-1]]');
  // Accents i majúscules.
  assert.equal(NoePseudo.create().encode('alex marti soler té dolor').trim().startsWith('PAC-'), true);
  // Una paraula que no és un nom no es toca.
  assert.equal(NoePseudo.create().encode('Planifica un squat i un pes mort'), 'Planifica un squat i un pes mort');
});

test('NOE privacitat: resoldre un pacient per codi, id o nom, i avisar si hi ha dubte', () => {
  const ps = NoePseudo.create();
  const p = jordi();
  ps.ref(p.id);
  assert.equal(ps.resolve('PAC-1').pid, p.id);
  assert.equal(ps.resolve('pac-1').pid, p.id);
  assert.equal(ps.resolve(p.id).pid, p.id);
  assert.equal(ps.resolve(U.fullName(p)).pid, p.id);
  assert.match(ps.resolve('PAC-99').error, /No conec cap pacient/);
  assert.match(ps.resolve('Ningú Inexistent').error, /No trobo cap pacient/);
  assert.match(ps.resolve('').error, /Falta/);
});

test('NOE eines de lectura: res d\'identificatiu surt cap a l\'IA (nom, telèfon, correu, naixement, carpeta)', async () => {
  const p = jordi();
  Store.update('patients', p.id, (x) => { x.email = 'secret.mail@exemple.cat'; x.phone = '600123456'; x.emergency = 'Maria Puig 611222333'; x.folderUrl = 'https://sharepoint.test/carpeta-jordi'; x.notes = `${U.fullName(x)} ha dit que li fa mal el genoll.`; });
  const ctx = ctxFor();
  const all = JSON.stringify([
    await run('llista_pacients', {}, ctx), await run('fitxa_pacient', { pacient: p.id }, ctx), await run('valoracions_pacient', { pacient: p.id, ultimes: 3 }, ctx),
    await run('sessions_pacient', { pacient: p.id, detall: true }, ctx), await run('cerca_global', { text: 'genoll' }, ctx),
  ]);
  for (const bad of ['secret.mail', '600123456', '611222333', 'sharepoint.test', p.firstName, p.lastName, p.birthDate]) assert.ok(!all.includes(bad), `s'ha filtrat «${bad}»`);
  assert.ok(all.includes('PAC-'), 'els pacients surten amb codi');
  const f = await run('fitxa_pacient', { pacient: ctx.ps.ref(p.id) }, ctx);
  assert.match(f.notes_internes, /PAC-\d+ ha dit que li fa mal el genoll/);
  assert.equal(typeof f.edat, 'number');
});

test('NOE eines: llista, fitxa, valoracions, sessions, calendari i biblioteca tornen dades útils', async () => {
  const ctx = ctxFor();
  const l = await run('llista_pacients', { estat: 'actiu', limit: 2 }, ctx);
  assert.equal(l.pacients.length, 2);
  assert.ok(l.total >= 2 && l.pacients[0].pacient === 'PAC-1');
  const idle = await run('llista_pacients', { sense_sessio_dies: 1 }, ctx);
  assert.ok(idle.pacients.every((r) => r.dies_sense_sessio === undefined || r.dies_sense_sessio > 1));
  const v = await run('valoracions_pacient', { pacient: 'PAC-1' }, ctx);
  assert.ok(v.valoracions.length === 1 && v.valoracions[0].mesures.length > 3 && v.valoracions[0].punts_d_atencio.length >= 1);
  const ss = await run('sessions_pacient', { pacient: 'PAC-1', detall: true, limit: 2 }, ctx);
  assert.ok(ss.sessions.length === 2 && ss.sessions[0].blocs[0].exercicis[0].nom);
  const one = await run('sessio', { sessio: ss.sessions[0].id }, ctx);
  assert.equal(one.id, ss.sessions[0].id);
  const cal = await run('calendari_pacient', { pacient: 'PAC-1', mes: U.monthKey(U.today()) }, ctx);
  assert.ok(Array.isArray(cal.dies_ocupats) && cal.dies_habituals_d_entrenament.length >= 1);
  assert.match((await run('calendari_pacient', { pacient: 'PAC-1', mes: 'novembre' }, ctx)).error, /AAAA-MM/);
  const ex = await run('buscar_exercicis', { bloc: 'for', material: 'barra' }, ctx);
  assert.ok(ex.exercicis.length > 3 && ex.exercicis.every((e) => e.bloc === 'for'));
  const fam = await run('familia_exercici', { exercici_id: 'X-FOR-01' }, ctx);
  assert.ok(fam.nivells.length >= 2 && fam.nivells.every((n, i, a) => i === 0 || Number(n.nivell) >= Number(a[i - 1].nivell)));
  assert.match((await run('sessio', { sessio: 'S-nope' }, ctx)).error, /No trobo/);
  assert.match((await run('fitxa_pacient', { pacient: 'PAC-77' }, ctx)).error, /No conec/);
  assert.match((await run('eina_inventada', {}, ctx)).error, /no existeix/);
});

const monthInput = (month, extra = {}) => ({
  pacient: 'PAC-1', mes: month, motiu: 'Progressió suau',
  sessions: [
    { data: `${month}-03`, objectiu: 'Força', pilar: 'Força i potència', blocs: [
      { bloc: 'mob', exercicis: [{ exercici_id: 'X-MOB-01' }] },
      { bloc: 'for', exercicis: [{ exercici_id: 'X-FOR-01', series: '3', repeticions: '6', intensitat: 'RIR 2', carrega: '40' }, { nom: 'Exercici inventat de la IA', series: '2', repeticions: '10' }] },
    ] },
    { data: `${month}-10`, objectiu: 'Força', blocs: [{ bloc: 'Força principal', exercicis: [{ nom: 'Back squat' }] }, { bloc: 'bloc-que-no-existeix', exercicis: [{ nom: 'x' }] }] },
    { data: 'no-es-una-data', blocs: [{ bloc: 'for', exercicis: [{ exercici_id: 'X-FOR-01' }] }] },
  ],
  ...extra,
});

test('NOE propostes: «proposar_*» no canvia res fins que la persona aplica; i es pot desfer', async () => {
  const conv = Noe.newConversation();
  const ctx = ctxFor(conv);
  const month = U.monthKey(U.addMonths(`${U.monthKey(U.today())}-01`, 2));
  const before = Store.sessionsOf(jordi().id).length;
  const hooked = [];
  ctx.hooks.onProposal = (p) => hooked.push(p.id);
  const r = await run('proposar_planificacio_mes', monthInput(month, { pacient: jordi().id }), ctx);
  assert.equal(r.estat, 'pendent_de_confirmar');
  assert.equal(r.sessions_a_crear, 2);
  assert.deepEqual(hooked, ['PR-1']);
  assert.equal(Store.sessionsOf(jordi().id).length, before, 'proposar no crea res');
  const prop = conv.proposals['PR-1'];
  assert.ok(prop.warnings.some((w) => /Exercici inventat/.test(w) && /fora de la biblioteca|biblioteca/.test(w)), prop.warnings.join('|'));
  assert.ok(prop.warnings.some((w) => /Bloc desconegut/.test(w)));
  assert.ok(prop.warnings.some((w) => /Data no vàlida/.test(w)));
  // Aplicar crea les sessions planificades, amb els exercicis de la biblioteca i la prescripció.
  const ap = NoeActions.apply(conv, 'PR-1');
  assert.equal(ap.ok, true);
  assert.deepEqual(plain(ap.route), ['client', jordi().id, 'mes']);
  const made = Store.sessionsOf(jordi().id).filter((s) => s.date.startsWith(month));
  assert.equal(made.length, 2);
  const s1 = made.find((s) => s.date === `${month}-03`);
  assert.equal(s1.status, 'planificada');
  assert.equal(s1.goal, 'Força');
  const forBlock = s1.blocks.find((b) => b.key === 'for');
  assert.equal(forBlock.items[0].exId, 'X-FOR-01');
  assert.equal(forBlock.items[0].sets, '3');
  assert.equal(forBlock.items[0].intensity, 'RIR 2');
  assert.equal(forBlock.items[0].load, '40');
  assert.equal(forBlock.items[1].name, 'Exercici inventat de la IA');
  assert.equal(forBlock.items[1].exId, '');
  assert.deepEqual(plain(s1.blocks.map((b) => b.key)), ['mob', 'for'], 'en l\'ordre dels blocs');
  const ids = made.flatMap((s) => s.blocks.flatMap((b) => b.items.map((i) => i.id)));
  assert.equal(new Set(ids).size, ids.length, 'cada línia té un identificador propi');
  assert.equal(NoeActions.apply(conv, 'PR-1').ok, false, 'no s\'aplica dues vegades');
  assert.equal(Store.sessionsOf(jordi().id).filter((s) => s.date.startsWith(month)).length, 2);
  // El model rep una nota de l'app perquè sàpiga què ha decidit la persona.
  assert.ok(conv.notes.some((n) => /APLICAT.*PR-1/.test(n)));
  // Desfer treu el que s'ha creat.
  assert.equal(NoeActions.undo(conv, 'PR-1').ok, true);
  assert.equal(Store.sessionsOf(jordi().id).filter((s) => s.date.startsWith(month)).length, 0);
  assert.equal(Store.sessionsOf(jordi().id).length, before);
  assert.equal(conv.proposals['PR-1'].status, 'undone');
});

test('NOE propostes: els dies ocupats es salten, una sessió sola avisa i es pot descartar', async () => {
  const conv = Noe.newConversation();
  const ctx = ctxFor(conv);
  const p = jordi();
  const busy = Store.sessionsOf(p.id).find((s) => s.date >= U.today()) || Store.addPlanned(p.id, { date: U.addDays(U.today(), 5), blocks: [], goal: 'x' });
  const month = busy.date.slice(0, 7);
  const r = await run('proposar_planificacio_mes', { pacient: p.id, mes: month, sessions: [{ data: busy.date, blocs: [{ bloc: 'for', exercicis: [{ exercici_id: 'X-FOR-01' }] }] }] }, ctx);
  assert.equal(r.sessions_a_crear, 0);
  assert.ok(conv.proposals['PR-1'].warnings.some((w) => /ja té sessió/.test(w)));
  const one = await run('proposar_sessio', { pacient: p.id, data: busy.date, blocs: [{ bloc: 'for', exercicis: [{ exercici_id: 'X-FOR-01' }] }] }, ctx);
  assert.ok(one.avisos.some((w) => /Ja hi ha una sessió aquell dia/.test(w)));
  const n = Store.sessionsOf(p.id).length;
  assert.equal(NoeActions.discard(conv, 'PR-2').ok, true);
  assert.equal(Store.sessionsOf(p.id).length, n);
  assert.equal(NoeActions.apply(conv, 'PR-2').ok, false, 'una proposta descartada no es pot aplicar');
  // Cap exercici vàlid → error clar, no una proposta buida.
  assert.match((await run('proposar_sessio', { pacient: p.id, data: U.today(), blocs: [{ bloc: 'for', exercicis: [] }] }, ctx)).error, /cap exercici vàlid/);
});

test('NOE propostes: canvis a una sessió (substituir, afegir, treure, prescripció, objectiu) i desfer; no toca les sessions fetes', async () => {
  const conv = Noe.newConversation();
  const ctx = ctxFor(conv);
  const p = jordi();
  const s = Store.addPlanned(p.id, { date: U.addDays(U.today(), 20), goal: 'Inicial', blocks: [
    { key: 'for', focus: '', note: '', items: [itemFor('X-FOR-01'), itemFor('X-FOR-02')] }, { key: 'cal', focus: '', note: '', items: [itemFor('X-CAL-03')] }] });
  function itemFor(id) { return C.Store.exercise(id) && { ...C.NoeTools && {}, ...makeItem(id) }; }
  function makeItem(id) { const e = Store.exercise(id); return { id: U.uid('I'), exId: id, name: e.name, sets: e.sets, reps: e.reps, load: '', intensity: '', rest: '', tempo: '', note: '', done: false }; }
  const first = s.blocks[0].items[0];
  const r = await run('proposar_canvi_sessio', { sessio: s.id, motiu: 'Més volum', canvis: [
    { accio: 'prescripcio', exercici: first.id, camps: { series: '5', repeticions: '3', intensitat: 'RIR 1' } },
    { accio: 'substituir', bloc: 'for', exercici: s.blocks[0].items[1].name, nou: { exercici_id: 'X-FOR-03' } },
    { accio: 'afegir', bloc: 'acc', nou: { exercici_id: 'X-ACC-01' } },
    { accio: 'treure', bloc: 'cal', exercici: 'Respiració', },
    { accio: 'canviar_objectiu', valor: 'Força màxima' },
    { accio: 'afegir', bloc: 'for', nou: { exercici_id: 'X-NO-EXISTEIX' } },
  ] }, ctx);
  assert.equal(r.estat, 'pendent_de_confirmar');
  const before = plain(Store.get('sessions', s.id));
  assert.equal(NoeActions.apply(conv, 'PR-1').ok, true);
  const after = Store.get('sessions', s.id);
  assert.equal(after.goal, 'Força màxima');
  assert.equal(after.blocks.find((b) => b.key === 'for').items[0].sets, '5');
  assert.equal(after.blocks.find((b) => b.key === 'for').items[1].exId, 'X-FOR-03');
  assert.ok(after.blocks.find((b) => b.key === 'acc').items.some((i) => i.exId === 'X-ACC-01'));
  assert.equal(NoeActions.undo(conv, 'PR-1').ok, true);
  assert.deepEqual(plain(Store.get('sessions', s.id)), before, 'desfer deixa la sessió com estava');
  // Una sessió feta no es pot canviar.
  Store.update('sessions', s.id, (x) => { x.status = 'feta'; });
  assert.match((await run('proposar_canvi_sessio', { sessio: s.id, canvis: [{ accio: 'canviar_objectiu', valor: 'x' }] }, ctx)).error, /ja és feta/);
  assert.match((await run('proposar_canvi_sessio', { sessio: 'S-no', canvis: [] }, ctx)).error, /No trobo/);
});

test('NOE propostes: pla d\'entrenament i nota (amb desfer)', async () => {
  const conv = Noe.newConversation();
  const ctx = ctxFor(conv);
  const p = jordi();
  const ex = (id) => ({ exercici_id: id });
  await run('proposar_pla', { pacient: p.id, nom: 'Bloc de força 4 setmanes', objectiu: 'Força de cames', inici: U.today(), dies: [1, 4], sessions: [
    { n: 1, fase: 'Acumulació', blocs: [{ bloc: 'for', exercicis: [ex('X-FOR-01')] }] }, { n: 2, fase: 'Acumulació', blocs: [{ bloc: 'for', exercicis: [ex('X-FOR-02')] }] }] }, ctx);
  const plans = Store.plans(p.id).length;
  assert.equal(NoeActions.apply(conv, 'PR-1').ok, true);
  const plan = Store.plans(p.id).find((x) => x.name === 'Bloc de força 4 setmanes');
  assert.ok(plan && plan.sessions.length === 2 && plan.sessions[0].blocks.length === 6 && plan.sessions[0].blocks.find((b) => b.key === 'for').items.length === 1);
  assert.equal(NoeActions.undo(conv, 'PR-1').ok, true);
  assert.equal(Store.plans(p.id).length, plans);
  const oldNotes = Store.get('patients', p.id).notes;
  await run('proposar_nota', { pacient: p.id, text: 'Evitar impacte aquesta setmana' }, ctx);
  assert.equal(NoeActions.apply(conv, 'PR-2').ok, true);
  assert.match(Store.get('patients', p.id).notes, /\[NOE · .*\] Evitar impacte aquesta setmana$/);
  assert.equal(NoeActions.undo(conv, 'PR-2').ok, true);
  assert.equal(Store.get('patients', p.id).notes, oldNotes);
});

test('NOE bucle: eines → resultats → resposta; la privacitat s\'aplica al missatge; el prompt porta les regles', async () => {
  cfgReset();
  NoeConfig.set({ demo: true });
  const p = jordi();
  const requests = [];
  let n = 0;
  Noe.state.transport = async (body, o) => {
    requests.push(plain(body));
    n++;
    if (n === 1) { o.onText('Miro la fitxa. '); o.onTool({ name: 'fitxa_pacient', input: { pacient: 'PAC-1' } }); return { content: [{ type: 'text', text: 'Miro la fitxa. ' }, { type: 'tool_use', id: 't1', name: 'fitxa_pacient', input: { pacient: 'PAC-1' } }], stop_reason: 'tool_use', usage: { input_tokens: 100, output_tokens: 20 } }; }
    o.onText('Resum fet per a PAC-1.');
    return { content: [{ type: 'text', text: 'Resum fet per a PAC-1.' }], stop_reason: 'end_turn', usage: { input_tokens: 150, output_tokens: 10, cache_read_input_tokens: 90 } };
  };
  const conv = Noe.newConversation();
  const events = [];
  await Noe.send(conv, `Com està ${U.fullName(p)}?`, { onTool: (nm) => events.push(`tool:${nm}`), onToolResult: (nm) => events.push(`res:${nm}`), onText: (t) => events.push(`text:${t}`), context: (ps) => `La persona veu ${ps.ref(p.id)}.` });
  assert.deepEqual(plain(events), ['text:Miro la fitxa. ', 'tool:fitxa_pacient', 'res:fitxa_pacient', 'text:Resum fet per a PAC-1.']);
  assert.equal(requests.length, 2);
  const first = requests[0];
  assert.equal(first.model, 'claude-sonnet-5-5');
  assert.equal(first.system[0].cache_control.type, 'ephemeral');
  assert.match(first.system[0].text, /Ets NOE/);
  assert.match(first.system[0].text, /Els canvis a l'app només passen amb confirmació/);
  assert.match(first.system[0].text, /Banderes vermelles/);
  assert.ok(first.system[0].text.includes('menys de 8 cm') || first.system[0].text.includes('per sota de 8 cm'), 'els llindars de l\'app són al prompt');
  assert.ok(first.tools.length >= 12 && first.tools.some((t) => t.name === 'proposar_planificacio_mes'));
  assert.equal(first.tools[first.tools.length - 1].cache_control.type, 'ephemeral');
  assert.ok(first.tools.every((t) => t.input_schema && t.description), 'totes les eines tenen esquema i descripció');
  // El missatge que veu la IA no porta el nom.
  const userMsg = first.messages[0].content;
  assert.ok(!userMsg.includes(p.firstName) && !userMsg.includes(p.lastName), userMsg);
  assert.match(userMsg, /Com està PAC-1\?/);
  assert.match(userMsg, /\[Nota de l'app: La persona veu PAC-1\.\]/);
  assert.ok(!JSON.stringify(first.system).includes(p.lastName), 'el prompt no porta cap nom de pacient');
  // La segona volta porta el resultat de l'eina.
  const second = requests[1].messages;
  assert.equal(second[second.length - 1].content[0].type, 'tool_result');
  assert.equal(second[second.length - 1].content[0].tool_use_id, 't1');
  assert.ok(!second[second.length - 1].content[0].content.includes(p.lastName));
  assert.ok(conv.usage.input >= 340 && conv.usage.output === 30);
  cfgReset();
});

test('NOE bucle: sense configurar no parla; una eina que falla no tomba la conversa; límit de voltes; repair', async () => {
  cfgReset();
  const conv = Noe.newConversation();
  await assert.rejects(() => Noe.send(conv, 'hola'), (e) => e.code === 'setup');
  NoeConfig.setKey('k');
  await assert.rejects(() => Noe.send(conv, 'hola'), (e) => e.code === 'consent');
  assert.equal(conv.messages.length, 0, 'no es desa res si no es pot parlar');
  NoeConfig.set({ consent: true });
  // Eina amb error: el model rep l'error i pot respondre.
  let n = 0;
  Noe.state.transport = async () => {
    n++;
    if (n === 1) return { content: [{ type: 'tool_use', id: 'x', name: 'sessio', input: { sessio: 'no-existeix' } }], stop_reason: 'tool_use', usage: {} };
    return { content: [{ type: 'text', text: 'Veig que no existeix.' }], stop_reason: 'end_turn', usage: {} };
  };
  await Noe.send(conv, 'obre la sessió');
  const result = conv.messages.find((m) => Array.isArray(m.content) && m.content[0].type === 'tool_result');
  assert.equal(result.content[0].is_error, true);
  assert.match(result.content[0].content, /No trobo la sessió/);
  // Un model que no para de demanar eines s'atura.
  let calls = 0;
  Noe.state.transport = async () => { calls++; return { content: [{ type: 'tool_use', id: `l${calls}`, name: 'llista_pacients', input: {} }], stop_reason: 'tool_use', usage: {} }; };
  const texts = [];
  await Noe.send(Noe.newConversation(), 'bucle', { onText: (t) => texts.push(t) });
  assert.equal(calls, Noe.MAX_ROUNDS);
  assert.match(texts.join(''), /m'aturo aquí/);
  // Un error de xarxa deixa la conversa neta (sense mig torn) i es pot continuar.
  const c2 = Noe.newConversation();
  Noe.state.transport = async () => { throw Object.assign(new Error('Sense connexió'), { code: 'network' }); };
  await assert.rejects(() => Noe.send(c2, 'hola'), /Sense connexió/);
  Noe.repair(c2);
  assert.equal(c2.messages.length, 0);
  Noe.state.transport = async () => ({ content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: {} });
  await Noe.send(c2, 'torna-hi');
  assert.equal(c2.messages.length, 2);
  cfgReset();
});

test('NOE conversa: s\'envien només els últims torns quan és molt llarga (sense trencar eina/resultat)', () => {
  const big = 'x'.repeat(60000);
  const msgs = [];
  for (let i = 0; i < 8; i++) {
    msgs.push({ role: 'user', content: `pregunta ${i} ${big}` });
    msgs.push({ role: 'assistant', content: [{ type: 'tool_use', id: `t${i}`, name: 'sessio', input: {} }] });
    msgs.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: `t${i}`, content: 'ok' }] });
    msgs.push({ role: 'assistant', content: [{ type: 'text', text: 'fet' }] });
  }
  const t = Noe.trim(msgs);
  assert.ok(t.length < msgs.length && t.length >= 4);
  assert.equal(t[0].role, 'user');
  assert.ok(typeof t[0].content === 'string', 'comença per un missatge de la persona');
  for (let i = 0; i < t.length; i++) {
    const m = t[i];
    if (Array.isArray(m.content) && m.content[0].type === 'tool_result') assert.ok(t[i - 1].content.some((c) => c.type === 'tool_use' && c.id === m.content[0].tool_use_id), 'cada resultat té la seva eina');
  }
  assert.equal(t[t.length - 1], msgs[msgs.length - 1], 'es manté l\'últim torn');
});

test('NOE demostració: planifica un mes sense IA amb les mateixes eines i propostes', async () => {
  cfgReset();
  NoeConfig.set({ demo: true });
  Noe.state.transport = NoeDemo.transport;
  const p = jordi();
  const conv = Noe.newConversation();
  const made = [];
  await Noe.send(conv, `Planifica el mes de gener per a ${U.fullName(p)}`, { onProposal: (pr) => made.push(pr) });
  assert.equal(made.length, 1);
  const prop = conv.proposals['PR-1'];
  assert.equal(prop.kind, 'mes');
  assert.ok(prop.data.sessions.length >= 6 && prop.data.sessions.every((s) => s.date.slice(5, 7) === '01'));
  assert.ok(prop.data.sessions.every((s) => s.blocks.some((b) => b.key === 'for' && b.items.length >= 1)));
  // La prescripció del demo només porta intensitat a força i accessoris.
  assert.ok(prop.data.sessions[0].blocks.filter((b) => b.key === 'mob' || b.key === 'cal').every((b) => b.items.every((i) => !i.over.intensity)));
  const text = conv.messages[conv.messages.length - 1].content[0].text;
  assert.match(text, /Mode demostració/);
  assert.match(text, /Aplica/);
  // «Qui no ha entrenat…» llista pacients amb enllaços.
  const c2 = Noe.newConversation();
  await Noe.send(c2, 'Qui no ha entrenat fa temps?');
  assert.match(c2.messages[c2.messages.length - 1].content[0].text, /\[\[pacient:PAC-\d+\]\]|Tots els pacients han entrenat/);
  cfgReset();
});

test('NOE coneixement: el prompt té les regles, la seguretat i el context, i no depèn de dades de pacients', () => {
  const s = NoeKnowledge.system({ now: 'dijous', user: 'Ricardo', materials: ['Barra olímpica', 'Keiser'], professionals: ['Ricardo', 'Arnau'], thresholds: { wbltMin: 9 } });
  for (const t of ['Ets NOE', 'PAC-1', 'proposar_', 'banderes vermelles'.replace('b', 'B'), 'Sobrecàrrega progressiva'.toLowerCase().replace('s', 's'), 'Parles amb Ricardo', 'Barra olímpica', '1 Mobilitat', 'Tornada a la calma', 'LCA', 'No diagnostica', 'per sota de 9 cm']) assert.ok(s.includes(t) || s.toLowerCase().includes(t.toLowerCase()), `falta «${t}»`);
  assert.ok(!/\{\w+\}/.test(s), 'no queden marcadors sense substituir');
  assert.ok(s.length > 9000 && s.length < 40000, `mida del prompt: ${s.length}`);
});
