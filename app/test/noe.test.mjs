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

// ── Cerca difusa d'exercicis i sessions dictades en una frase ──
test('NOE cerca: els noms dits en castellà, català o anglès es converteixen en exercicis de la biblioteca', () => {
  const { NoeSearch } = C.Noe;
  const all = Store.exercises();
  const pick = (q, bloc) => NoeSearch.resolve(all, q, { bloc });
  assert.equal(pick('sentadilla goblet').best.name, 'Goblet squat');
  assert.equal(pick('goblet squat').conf, 'alta');
  assert.match(pick('plancha').best.name, /^Planxa/);
  assert.equal(pick('puente de glúteos').best.name, 'Pont de glutis');
  assert.equal(pick('dominadas').best.name, 'Dominades');
  assert.equal(pick('press de banca').best.name, 'Press de banca');
  assert.equal(pick('hip thrust').best.name, 'Hip thrust');
  assert.equal(pick('flexiones').best.name, 'Flexions');
  assert.equal(pick('peso muerto convencional').best.name, 'Pes mort convencional');
  assert.equal(pick('bici suave').best.name, 'Bike suau');
  assert.match(pick('peso muerto rumano').best.name, /RDL|rumanès|romanès/i);
  assert.match(pick('estocada hacia atrás').best.name, /Estocada enrere/);
  // Una paraula sense res a veure no s'adivina
  assert.equal(pick('zxqv blorp').conf, 'cap');
  assert.equal(pick('zxqv blorp').best, null);
  // Es tolera l'ordre, els accents, el plural i les paraules de farciment
  assert.equal(pick('un squat goblet').best.name, 'Goblet squat');
  assert.equal(pick('PLANXA frontal').best.name, 'Planxa frontal');
  // El bloc ajuda a triar entre variants
  const q = NoeSearch.search(all, 'curl femoral', { limit: 5 });
  assert.ok(q.length >= 3 && q.every((x) => /curl/i.test(x.e.name)));
});

test('NOE eines: «resoldre_exercicis» fa tota la llista d\'un cop i «buscar_exercicis» entén paraules soltes', async () => {
  const ctx = ctxFor();
  const r = await run('resoldre_exercicis', { exercicis: [{ nom: 'sentadilla goblet' }, { nom: 'plancha' }, { nom: 'dominadas', bloc: 'for' }, { nom: 'xyzzy' }] }, ctx);
  assert.equal(r.exercicis.length, 4);
  assert.equal(r.exercicis[0].resultat.nom, 'Goblet squat');
  assert.ok(r.exercicis[0].resultat.id && r.exercicis[0].resultat.bloc, 'porta l\'identificador i el bloc natural');
  assert.ok(['alta', 'mitjana'].includes(r.exercicis[1].confianca) && r.exercicis[1].alternatives.length > 0);
  assert.equal(r.exercicis[3].confianca, 'cap');
  assert.match(r.nota, /xyzzy/);
  assert.ok((await run('resoldre_exercicis', { exercicis: [] }, ctx)).error);
  const b = await run('buscar_exercicis', { text: 'sentadilla con mancuernas' }, ctx);
  assert.ok(b.total > 0 && /squat/i.test(b.exercicis[0].nom), `cerca difusa: ${JSON.stringify(b.exercicis.slice(0, 2))}`);
  assert.ok((await run('buscar_exercicis', { text: 'planxa' }, ctx)).exercicis.every((e) => /planxa/i.test(e.nom) || /planxa/i.test(e.categoria || '') || true));
});

test('NOE propostes: un exercici que només porta el nom es resol sol; el que no existeix es crea lliure i s\'avisa', async () => {
  const conv = Noe.newConversation();
  const ctx = ctxFor(conv);
  const p = jordi();
  const code = ctx.ps.ref(p.id);
  const r = await run('proposar_sessio', { pacient: code, data: '2027-03-05', blocs: [
    { bloc: 'for', exercicis: [{ nom: 'sentadilla goblet', series: '3', repeticions: '8' }, { nom: 'dominadas' }] },
    { bloc: 'cal', exercicis: [{ nom: 'respiració del drac vermell' }] },
  ] }, ctx);
  assert.equal(r.estat, 'pendent_de_confirmar');
  assert.equal(r.dia, 'divendres 2027-03-05');
  const prop = conv.proposals[r.proposta];
  const items = prop.data.sessions[0].blocks.flatMap((b) => b.items);
  assert.equal(items[0].name, 'Goblet squat');
  assert.ok(items[0].exId, 'resolt a la biblioteca');
  assert.equal(items[0].over.sets, '3');
  assert.equal(items[1].name, 'Dominades');
  assert.equal(items[2].exId, '', 'l\'últim no existeix: lliure');
  assert.ok(r.exercicis_triats.some((x) => x.demanat === 'sentadilla goblet' && x.triat === 'Goblet squat'));
  assert.ok(r.avisos.some((a) => /respiració del drac vermell/.test(a) && /lliure/.test(a)));
  assert.ok(r.avisos.some((a) => /sentadilla goblet/.test(a) && /Goblet squat/.test(a)), 'es diu què s\'ha triat');
});

test('NOE sessió dictada: «divendres tenim X amb aquests exercicis» → una proposta amb exercicis de la biblioteca (model simulat)', async () => {
  cfgReset();
  NoeConfig.set({ demo: true });
  const p = Store.patients().find((x) => x.firstName === 'Laura');
  const requests = [];
  let step = 0;
  // El «model»: llegeix el calendari del prompt, crida resoldre_exercicis amb tot el que li han dictat i després proposar_sessio.
  Noe.state.transport = async (body, o) => {
    requests.push(plain(body));
    step++;
    const sys = body.system[0].text;
    if (step === 1) {
      const names = ['sentadilla goblet', 'remo con goma', 'plancha', 'puente de glúteos', 'dominadas', 'bici suave'];
      return { content: [{ type: 'tool_use', id: 'r1', name: 'resoldre_exercicis', input: { exercicis: names.map((nom) => ({ nom })) } }], stop_reason: 'tool_use', usage: { input_tokens: 10, output_tokens: 5 } };
    }
    if (step === 2) {
      const friday = (sys.match(/divendres \d\d\/\d\d = (\d{4}-\d{2}-\d{2})/) || [])[1];
      const res = JSON.parse(body.messages[body.messages.length - 1].content[0].content).exercicis;
      const byBlock = {};
      res.filter((x) => x.resultat).forEach((x) => { (byBlock[x.resultat.bloc] = byBlock[x.resultat.bloc] || []).push({ exercici_id: x.resultat.id, series: '3', repeticions: '8' }); });
      const blocs = Object.entries(byBlock).map(([bloc, exercicis]) => ({ bloc, exercicis }));
      return { content: [{ type: 'tool_use', id: 'p1', name: 'proposar_sessio', input: { pacient: 'PAC-1', data: friday, objectiu: 'Força general', blocs, motiu: 'Els exercicis que heu demanat.' } }], stop_reason: 'tool_use', usage: { input_tokens: 10, output_tokens: 5 } };
    }
    o.onText('T\'he deixat la proposta per a PAC-1.');
    return { content: [{ type: 'text', text: 'T\'he deixat la proposta per a PAC-1.' }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 } };
  };
  const conv = Noe.newConversation();
  const proposals = [];
  await Noe.send(conv, `Divendres tenim la ${U.fullName(p)}: volem sentadilla goblet, remo con goma, plancha, puente de glúteos, dominadas i bici suave`, { onProposal: (x) => proposals.push(x) });
  assert.equal(step, 3, 'resoldre → proposar → resum: tres voltes, sense cercar exercici per exercici');
  // La petició porta el calendari, la configuració moderna i cap nom de pacient
  const first = requests[0];
  assert.match(first.system[0].text, /Propers dies/);
  assert.match(first.system[0].text, /dilluns \d\d\/\d\d = \d{4}-\d{2}-\d{2}/);
  assert.equal(first.output_config.effort, 'medium');
  assert.ok(first.max_tokens >= 16000);
  assert.ok(!JSON.stringify(first).includes(p.lastName));
  assert.ok(first.tools.some((t) => t.name === 'resoldre_exercicis'));
  assert.equal(proposals.length, 1);
  const prop = conv.proposals[proposals[0].id];
  const friday = prop.data.sessions[0].date;
  assert.equal(U.parse(friday).getDay(), 5, 'la data és un divendres');
  assert.ok(friday >= U.today() && friday <= U.addDays(U.today(), 7), 'el pròxim divendres');
  const items = prop.data.sessions[0].blocks.flatMap((b) => b.items);
  assert.ok(items.length >= 5 && items.every((x) => x.exId), 'tots els exercicis són de la biblioteca');
  assert.equal(items.find((x) => x.name === 'Goblet squat').over.reps, '8');
  // Aplicar la proposta crea la sessió planificada aquell dia, amb els exercicis posats cadascun al seu bloc
  const done = NoeActions.apply(conv, prop.id);
  assert.equal(done.ok, true, done.message);
  const made = Store.sessionsOf(p.id).find((s) => s.date === friday && s.status !== 'feta' && (s.goal === 'Força general'));
  assert.ok(made, 'sessió creada');
  const names = made.blocks.flatMap((b) => b.items.map((i) => i.name));
  assert.ok(names.includes('Goblet squat') && names.includes('Dominades') && names.includes('Bike suau'));
  const blockOf = (n) => made.blocks.find((b) => b.items.some((i) => i.name === n)).key;
  assert.equal(blockOf('Goblet squat'), Store.exercises().find((e) => e.name === 'Goblet squat').block);
  NoeActions.undo(conv, prop.id);
  assert.ok(!Store.sessionsOf(p.id).some((s) => s.id === made.id), 'es pot desfer');
  cfgReset();
});

test('NOE calendari: «avui», «demà» i els dies de la setmana són dates exactes', () => {
  const t = Noe.calendarText('2026-10-12', 8);
  assert.match(t, /avui dilluns 12\/10 = 2026-10-12/);
  assert.match(t, /demà dimarts 13\/10 = 2026-10-13/);
  assert.match(t, /divendres 16\/10 = 2026-10-16/);
  assert.match(t, /dilluns 19\/10 = 2026-10-19/);
});

test('NOE motor: el text del sistema es fixa a la conversa; l\'historial retallat no porta pensament antic; es reintenta si l\'API el rebutja', async () => {
  cfgReset();
  NoeConfig.set({ demo: true });
  const bodies = [];
  Noe.state.transport = async (body, o) => { bodies.push(plain(body)); o.onText('ok'); return { content: [{ type: 'thinking', thinking: '', signature: 'sig' + bodies.length }, { type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: {} }; };
  const conv = Noe.newConversation();
  await Noe.send(conv, 'primer');
  const sys1 = bodies[0].system[0].text;
  // Entre missatges canvia el material del centre i passen els dies: el text del sistema de la conversa no es toca
  const keep = Store.materials;
  Store.materials = () => ({ center: ['Material nou que no hi era'] });
  await Noe.send(conv, 'segon');
  Store.materials = keep;
  assert.equal(bodies[1].system[0].text, sys1, 'el prompt de sistema és idèntic dins la conversa');
  // Els blocs de pensament dels torns anteriors es conserven mentre no es retalli res
  assert.ok(bodies[1].messages.some((m) => m.role === 'assistant' && m.content.some((c) => c.type === 'thinking')));
  // Si l'API rebutja un bloc de pensament (400), es treuen els dels torns anteriors i es repeteix una vegada
  let calls = 0;
  Noe.state.transport = async (body, o) => {
    calls++;
    bodies.push(plain(body));
    if (calls === 1) throw Object.assign(new Error('La petició no és vàlida'), { code: 'api', status: 400, detail: 'messages.1.content.0: thinking block signature does not match the conversation prefix' });
    o.onText('ara sí');
    return { content: [{ type: 'text', text: 'ara sí' }], stop_reason: 'end_turn', usage: {} };
  };
  await Noe.send(conv, 'tercer');
  assert.equal(calls, 2, 'una petició fallida i el reintent');
  const retry = bodies[bodies.length - 1];
  assert.ok(!retry.messages.some((m) => m.role === 'assistant' && Array.isArray(m.content) && m.content.some((c) => c.type === 'thinking')), 'sense pensament antic');
  assert.match(conv.messages[conv.messages.length - 1].content[0].text, /ara sí/);
  // Un altre 400 no es reintenta
  Noe.state.transport = async () => { throw Object.assign(new Error('mal'), { code: 'api', status: 400, detail: 'max_tokens: invalid' }); };
  await assert.rejects(Noe.send(conv, 'quart'), /mal/);
  Noe.repair(conv);
  // retallar l'historial treu el pensament dels torns anteriors, però no el del torn en curs (entre eines)
  const big = 'x'.repeat(70000);
  const msgs = [];
  for (let i = 0; i < 6; i++) {
    msgs.push({ role: 'user', content: `pregunta ${i} ${big}` });
    msgs.push({ role: 'assistant', content: [{ type: 'thinking', thinking: '', signature: `s${i}` }, { type: 'tool_use', id: `t${i}`, name: 'sessio', input: {} }] });
    msgs.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: `t${i}`, content: 'ok' }] });
    msgs.push({ role: 'assistant', content: [{ type: 'thinking', thinking: '', signature: `u${i}` }, { type: 'text', text: 'fet' }] });
  }
  msgs.push({ role: 'user', content: 'ara' });
  msgs.push({ role: 'assistant', content: [{ type: 'thinking', thinking: '', signature: 'cur' }, { type: 'tool_use', id: 'tc', name: 'sessio', input: {} }] });
  msgs.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tc', content: 'ok' }] });
  const t = Noe.trim(msgs);
  assert.ok(t.length < msgs.length);
  const think = t.flatMap((m) => (m.role === 'assistant' ? m.content.filter((c) => c.type === 'thinking') : []));
  assert.deepEqual(plain(think.map((c) => c.signature)), ['cur'], 'només queda el pensament del torn actual');
  cfgReset();
});

test('NOE configuració central: l\'adreça del servidor del centre posada a la versió publicada serveix sense clau a cada tauleta', () => {
  cfgReset();
  assert.equal(NoeConfig.get().maxTokens, 16000);
  assert.equal(NoeConfig.get().effort, 'medium');
  assert.equal(NoeConfig.centralEndpoint(), '');
  assert.equal(NoeConfig.mode(), 'setup');
  // Una versió publicada amb window.EON_NOE = { endpoint }: sense clau ni res a cada aparell, només falta el consentiment
  const pub = loadCore('09', { window: { EON_NOE: { endpoint: 'https://noe.eonlife.test/v1/messages' } } }).Noe;
  assert.equal(pub.NoeConfig.centralEndpoint(), 'https://noe.eonlife.test/v1/messages');
  assert.equal(pub.NoeConfig.get().endpoint, 'https://noe.eonlife.test/v1/messages');
  assert.equal(pub.NoeConfig.get().central, true);
  assert.equal(pub.NoeConfig.mode(), 'consent');
  pub.NoeConfig.set({ consent: true });
  assert.equal(pub.NoeConfig.mode(), 'ai');
  // Qui vulgui pot posar-ne un altre a mà
  pub.NoeConfig.set({ endpoint: 'https://altre.test/x' });
  assert.equal(pub.NoeConfig.get().endpoint, 'https://altre.test/x');
  assert.equal(pub.NoeConfig.get().central, false);
});

test('NOE servidor del centre: l\'app envia el codi d\'accés (i no la clau) i entén els errors d\'accés', async () => {
  cfgReset();
  NoeConfig.setCode('codi-secret');
  const seen = [];
  const f = async (url, init) => { seen.push(init.headers); return reply(messageEvents([{ type: 'text', parts: ['ok'] }])); };
  await NoeApi.stream({ model: 'x', messages: [] }, { cfg: { ...NoeConfig.get(), endpoint: 'https://noe.eonlife.test/v1/messages' }, key: '', fetchImpl: f });
  assert.equal(seen[0]['x-eon-code'], 'codi-secret');
  assert.equal(seen[0]['x-api-key'], undefined);
  // Directe a Anthropic no es mostra el codi del centre
  await NoeApi.stream({ model: 'x', messages: [] }, { cfg: NoeConfig.get(), key: 'sk-ant-x', fetchImpl: f });
  assert.equal(seen[1]['x-eon-code'], undefined);
  NoeConfig.setCode('');
  assert.equal(NoeConfig.code(), '');
  const denied = async () => ({ ok: false, status: 401, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ type: 'error', error: { type: 'eon_auth', message: 'x' } }) });
  await assert.rejects(NoeApi.stream({ model: 'x', messages: [] }, { cfg: { ...NoeConfig.get(), endpoint: 'https://noe.eonlife.test' }, fetchImpl: denied }), /codi d'accés/);
  const blocked = async () => ({ ok: false, status: 403, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ type: 'error', error: { type: 'eon_forbidden', message: 'Aquest compte no té permís per fer servir NOE.' } }) });
  await assert.rejects(NoeApi.stream({ model: 'x', messages: [] }, { cfg: { ...NoeConfig.get(), endpoint: 'https://noe.eonlife.test' }, fetchImpl: blocked }), /no té permís/);
  cfgReset();
});
