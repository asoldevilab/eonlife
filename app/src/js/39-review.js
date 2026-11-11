/* EON Life · sessions sense tancar: avís al vespre (a partir de les 21:00) i en obrir l'app els dies següents.
   Perquè cap sessió quedi com a no feta per oblit: per a cadascuna, Feta (confirmant qui l'ha feta, i amb l'RPE i el
   dolor si es volen posar), No s'ha fet (cancel·lada pel pacient, no presentat o cancel·lada pel centre) o Reprograma.
   Totes les tauletes veuen les de tot el centre. Si es tanca amb «Més tard», torna a sortir a la franja següent
   (l'endemà al matí o a les 21:00). */

const REVIEW_HOUR = 21;
const REVIEW_DAYS = 30; // les de més d'un mes enrere ja no s'hi posen
const REVIEW_KEY = 'eonlife:review:later';

const SessionReview = {
  // Les sessions que ja s'haurien d'haver tancat: les d'abans d'avui i, des de les 21:00, les d'avui.
  pending(now = new Date()) {
    const today = U.today();
    const lateToday = now.getHours() >= REVIEW_HOUR;
    const from = U.addDays(today, -REVIEW_DAYS);
    return U.sortBy(Store.all('sessions').filter((s) => Calc.sessionOpen(s) && s.date >= from
      && (s.date < today || (lateToday && s.date === today)) && Store.get('patients', s.patientId)),
    (s) => `${s.date} ${s.time || '99:99'}`);
  },
  // Franja de l'avís: el matí d'un dia (sessions dels dies anteriors) o el vespre (les d'avui).
  slot(now = new Date()) { return `${U.today()}-${now.getHours() >= REVIEW_HOUR ? 'vespre' : 'dia'}`; },
  later() { try { window.localStorage.setItem(REVIEW_KEY, this.slot()); } catch (e) { /* sense emmagatzematge */ } },
  postponed() { try { return window.localStorage.getItem(REVIEW_KEY) === this.slot(); } catch (e) { return false; } },
  // Sense l'avís automàtic (proves automàtiques): l'avís de l'inici continua sortint.
  off() { try { return window.EON_REVIEW_OFF === true && window.localStorage.getItem('eonlife:review:test') !== '1'; } catch (e) { return false; } },
};

let reviewOpen = false;
function openSessionReview() {
  if (reviewOpen) return;
  reviewOpen = true;
  let close = null;
  const done = () => { reviewOpen = false; close(); };
  close = UI.open(() => html`<${SessionReviewDialog} onClose=${done} />`, { onDismiss: () => { SessionReview.later(); done(); } });
}

// S'obre sol (un cop per franja) quan hi ha sessions per tancar. Va dins de l'App.
function SessionReviewWatch() {
  useEffect(() => {
    const check = () => {
      if (!Store.ready || Store.error || reviewOpen || SessionReview.postponed() || SessionReview.off()) return;
      if (location.hash.startsWith('#/fitxa') || location.hash.startsWith('#/informe')) return; // no a sobre d'una presentació
      if (SessionReview.pending().length) openSessionReview();
    };
    const off = Store.subscribe(() => setTimeout(check, 1500));
    const iv = setInterval(check, 5 * 60 * 1000);
    const vis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', vis);
    setTimeout(check, 2500);
    return () => { off(); clearInterval(iv); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return null;
}

// Avís a l'inici mentre en quedi alguna.
function SessionReviewBanner() {
  const n = SessionReview.pending().length;
  if (!n) return null;
  return html`<div class="review-banner" role="status">
    <${Icon} name="alert" size=${18} />
    <span class="grow"><strong>${U.plural(n, 'sessió', 'sessions')} sense tancar.</strong> Marca si s'han fet o no perquè no quedin com a pendents.</span>
    <${Btn} variant="primary" size="sm" icon="check" onClick=${openSessionReview}>Revisa-les</${Btn}>
  </div>`;
}

function SessionReviewDialog({ onClose }) {
  const [, setN] = useState(0);
  useEffect(() => Store.subscribe(() => setN((n) => n + 1)), []);
  const list = SessionReview.pending();
  const later = () => { SessionReview.later(); onClose(); };
  return html`<${Dialog} title="Sessions pendents de tancar" wide=${true} onClose=${later} footer=${html`
    <span class="muted small grow">${list.length ? `Queden ${U.plural(list.length, 'sessió', 'sessions')}.` : ''}</span>
    ${list.length ? html`<${Btn} variant="ghost" onClick=${later}>Més tard</${Btn}>` : html`<${Btn} variant="primary" onClick=${onClose}>Tanca</${Btn}>`}`}>
    ${list.length ? html`<p class="dialog-text">Aquestes sessions encara consten com a planificades. Marca, per a cadascuna, si s'ha fet o no.</p>
      <div class="review-list">${list.map((s) => html`<${ReviewRow} key=${s.id} s=${s} />`)}</div>`
      : html`<${Empty} icon="check" title="Tot al dia" text="Totes les sessions estan tancades." />`}
  </${Dialog}>`;
}

function ReviewRow({ s }) {
  const p = Store.get('patients', s.patientId) || {};
  const [rpe, setRpe] = useState((s.feedback || {}).rpe || '');
  const [pain, setPain] = useState((s.feedback || {}).pain || '');
  const [why, setWhy] = useState(false);
  const done = () => markSessionDone(s, { ...(rpe ? { rpe } : {}), ...(pain ? { pain } : {}) });
  const notDone = (reason) => {
    Store.update('sessions', s.id, (x) => { x.status = 'cancelada'; x.cancelReason = reason; });
    if (typeof Sync !== 'undefined') Sync.soon(s.patientId);
    UI.toast(`Sessió ${s.number} de ${p.firstName || U.fullName(p)}: ${Calc.cancelLabel({ cancelReason: reason }).toLowerCase()}.`);
  };
  const move = async () => {
    const date = await askDate({ title: 'Reprograma la sessió', label: 'Nova data', value: U.addDays(U.today(), 1) });
    if (!date) return;
    Store.update('sessions', s.id, (x) => { x.date = date; });
    if (typeof Sync !== 'undefined') Sync.soon(s.patientId);
    UI.toast(`Sessió ${s.number} de ${p.firstName || U.fullName(p)} moguda al ${U.fmtDate(date)}.`);
  };
  return html`<div class="review-row">
    <div class="review-who">
      <strong>${U.fullName(p)}</strong>
      <span class="muted small">S${s.number || ''} · ${U.fmtDateLong(s.date)}${s.time ? ` · ${s.time}` : ''}${s.professional ? ` · ${s.professional}` : ''}</span>
      ${s.goal && html`<span class="small">${s.goal}</span>`}
    </div>
    <div class="review-fb">
      <label class="review-mini"><span>RPE</span><select class="select select-sm" value=${rpe} onChange=${(e) => setRpe(e.currentTarget.value)} aria-label=${`RPE de la sessió de ${U.fullName(p)}`}>
        <option value="">—</option>${RPE_SCALE.map((v) => html`<option value=${v}>${v}</option>`)}</select></label>
      <label class="review-mini"><span>EVA</span><select class="select select-sm" value=${pain} onChange=${(e) => setPain(e.currentTarget.value)} aria-label=${`Dolor en acabar de ${U.fullName(p)}`}>
        <option value="">—</option>${EVA_SCALE.map((v) => html`<option value=${v}>${v}</option>`)}</select></label>
    </div>
    <div class="review-acts">
      <${Btn} size="sm" variant="primary" icon="check" onClick=${done}>Feta</${Btn}>
      ${why ? html`${OPT.cancelReasons.map((o) => html`<${Btn} size="sm" onClick=${() => notDone(o.v)}>${o.label}</${Btn}>`)}
          <${Btn} size="sm" variant="ghost" icon="x" title="Torna" onClick=${() => setWhy(false)} />`
        : html`<${Btn} size="sm" icon="x" onClick=${() => setWhy(true)}>No s'ha fet</${Btn}>
          <${Btn} size="sm" variant="ghost" icon="calendar" onClick=${move}>Reprograma</${Btn}>`}
    </div>
  </div>`;
}
