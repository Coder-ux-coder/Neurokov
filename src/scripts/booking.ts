/**
 * Booking. Every booking button ([data-book], Button.astro) opens the booking form
 * (BookingForm.astro): four questions about the business, then Cal.com's calendar,
 * with the answers attached to the booking. On the book page the form is already
 * in the page, so the buttons bring it into view instead.
 *
 * Cal.com's embed loads once someone starts booking (the form opens, or a field on
 * the book page's form gets focus), so a visitor who never books never loads it or
 * its cookie, and by the time the questions are answered it has arrived. If it
 * can't load, the answers go to the event's page on cal.com in the address, where
 * Cal.com reads them the same way.
 *
 * The answers are also emailed to us the moment the form is sent (notify), so they
 * reach us even when no time gets picked.
 */
import { currentTheme, fine } from './lib';

type CalFn = ((...args: unknown[]) => void) & {
  loaded?: boolean;
  ns: Record<string, (...args: unknown[]) => void>;
  q?: unknown[];
};
type Answers = Record<string, string>;

const CAL_SRC = 'https://app.cal.com/embed/embed.js';
const CAL_NS = 'audit';
/** How long a booking waits for Cal.com before the link takes over: a connection that hangs rather than fails. */
const PATIENCE = 8000;
const NOTIFY_URL = 'https://api.web3forms.com/submit';

const cal = () => (window as unknown as { Cal: CalFn }).Cal;
let calLoad: Promise<boolean> | null = null;
let calHere = false;

const calUi = () => ({
  theme: currentTheme(),
  cssVarsPerTheme: { light: { 'cal-brand': '#ff4f00' }, dark: { 'cal-brand': '#ff5a1f' } },
  hideEventTypeDetails: false,
  layout: 'month_view',
});

/** Loads Cal.com's embed, once, and says whether it arrived. */
function loadCal(): Promise<boolean> {
  if (calLoad) return calLoad;
  // Cal.com's official loader stub: queues calls until embed.js arrives.
  /* eslint-disable */
  (function (C: any, A: string, L: string) {
    let p = function (a: any, ar: any) {
      a.q.push(ar);
    };
    let d = C.document;
    C.Cal =
      C.Cal ||
      function () {
        let cal = C.Cal;
        let ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          d.head.appendChild(d.createElement('script')).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api: any = function () {
            p(api, arguments);
          };
          const namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ['initNamespace', namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
  })(window, CAL_SRC, 'init');
  /* eslint-enable */
  cal()('init', CAL_NS, { origin: 'https://app.cal.com' });
  cal().ns[CAL_NS]('ui', calUi());
  document.addEventListener('nk:theme', () => cal().ns[CAL_NS]('ui', calUi()));
  const script = document.querySelector<HTMLScriptElement>(`script[src="${CAL_SRC}"]`);
  calLoad = new Promise<boolean>((resolve) => {
    if (!script) return resolve(false);
    script.addEventListener('load', () => resolve((calHere = true)));
    script.addEventListener('error', () => resolve(false));
  });
  return calLoad;
}

/** Whether Cal.com is here or arrives in time. One that turns up later still counts next time. */
const calInTime = () =>
  Promise.race([loadCal(), new Promise<boolean>((resolve) => setTimeout(() => resolve(calHere), PATIENCE))]);

/* ---------- The form ---------- */

/** The answers, trimmed, or null (and the browser points at what's missing) if any is blank. */
function answersOf(form: HTMLFormElement): Answers | null {
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((f) => (f.value = f.value.trim()));
  if (!form.reportValidity()) return null;
  return Object.fromEntries([...new FormData(form)].map(([name, value]) => [name, String(value)]));
}

// The form's own address is the event's page on cal.com, and its path is the embed's calLink.
const calLink = (form: HTMLFormElement) => new URL(form.action).pathname.slice(1);
/** The event's page on cal.com with the answers in the address, which is where Cal.com reads them from. */
const calPage = (form: HTMLFormElement, answers: Answers) => `${form.action}?${new URLSearchParams(answers)}`;
// Each answer prefills the event's hidden booking question of the same name.
const calConfig = (answers: Answers) => ({ layout: 'month_view', theme: currentTheme(), ...answers });

let lastSent = '';

/** Emails us the answers (Web3Forms, to the address the form's data-notify key was made for). It never
 *  holds up the booking, and the same answers sent twice in a row go once. */
function notify(form: HTMLFormElement, answers: Answers) {
  const key = form.dataset.notify;
  const sent = JSON.stringify(answers);
  if (!key || sent === lastSent) return;
  lastSent = sent;
  const body = new FormData();
  body.set('access_key', key);
  body.set('subject', `New audit form: ${answers.business} (${answers.niche})`);
  body.set('from_name', 'Neurokov website');
  // Each answer under its question, as the visitor read it.
  for (const [name, value] of Object.entries(answers)) {
    const field = form.elements.namedItem(name) as HTMLInputElement | null;
    body.set(field?.labels?.[0]?.textContent?.trim() || name, value);
  }
  body.set('Page', location.pathname + location.search);
  // keepalive: it still goes when the page is left straight away (Cal.com's page opening in this tab).
  // Accept: an answer in JSON, not a redirect to Web3Forms' thank-you page.
  fetch(NOTIFY_URL, { method: 'POST', body, keepalive: true, headers: { Accept: 'application/json' } }).catch(() => {});
}

/** Where focus goes when the form comes up: with a mouse or keyboard, the first question still
 *  unanswered (or the button, once none is); on a touch screen the title, so the keyboard doesn't
 *  cover the form before it has been read. */
function focusForm(form: HTMLFormElement, preventScroll = false) {
  const to = fine
    ? (form.querySelector<HTMLElement>(':invalid') ?? form.querySelector<HTMLElement>('[type="submit"]'))
    : form.querySelector<HTMLElement>('.booking__title');
  to?.focus({ preventScroll });
}

// Where the popup can't go, the link does: in a new tab while the click still counts as the
// visitor's (later, browsers block the tab as a pop-up), else in this one.
function follow(url: string) {
  const act = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
  const tab = act?.isActive ? window.open(url, '_blank') : null;
  if (tab) tab.opener = null;
  else location.href = url;
}

/* ---------- The dialog every booking button opens ---------- */

const dialog = document.querySelector<HTMLDialogElement>('dialog[data-booking]');
const dialogForm = dialog?.querySelector('form');

if (dialog && dialogForm) {
  const submit = dialogForm.querySelector<HTMLButtonElement>('[type="submit"]')!;
  dialog.querySelector('[data-booking-close]')?.addEventListener('click', () => dialog.close());
  // A click on the backdrop (the dialog itself, outside its box) closes it. Only a click that
  // started there too: selecting text in a field and letting go outside it isn't one.
  let pressedOutside = false;
  dialog.addEventListener('pointerdown', (e) => (pressedOutside = e.target === dialog));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog && pressedOutside) dialog.close();
    pressedOutside = false;
  });

  dialogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.hasAttribute('aria-busy')) return; // already on its way
    const answers = answersOf(dialogForm);
    if (!answers) return;
    notify(dialogForm, answers);
    // Cal.com still on its way: the arrow blinks until it lands (or the link takes over).
    submit.setAttribute('aria-busy', 'true');
    const ok = await calInTime();
    submit.removeAttribute('aria-busy');
    if (!dialog.open) return; // closed while it waited: the visitor changed their mind
    // Cal.com's popup can't sit above a modal dialog, so the form steps aside. Its answers stay
    // in it, for a second try.
    dialog.close();
    if (!ok) return follow(calPage(dialogForm, answers));
    cal().ns[CAL_NS]('ui', calUi());
    cal().ns[CAL_NS]('modal', { calLink: calLink(dialogForm), config: calConfig(answers) });
  });
}

/* ---------- The book page: the form in the page, then the calendar in its place ---------- */

const inline = document.querySelector<HTMLElement>('div[data-booking]');
const inlineForm = inline?.querySelector('form');
const calStep = document.querySelector<HTMLElement>('[data-booking-cal]');
const calEl = document.querySelector<HTMLElement>('[data-cal-inline]');
const fallback = document.querySelector<HTMLElement>('[data-cal-fallback]');
const fallbackLink = fallback?.querySelector('a');

/** The book page's panel (the form, or by now the calendar) comes into view, unless it's already there. */
function panelIntoView() {
  const panel = inline?.parentElement;
  const top = panel?.getBoundingClientRect().top ?? 0;
  if (top < 0 || top > innerHeight / 2) panel?.scrollIntoView({ block: 'start' });
}

if (inline && inlineForm && calStep && calEl) {
  inlineForm.addEventListener('focusin', loadCal, { once: true });
  inlineForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const answers = answersOf(inlineForm);
    if (!answers) return;
    notify(inlineForm, answers);
    loadCal();
    cal().ns[CAL_NS]('inline', { elementOrSelector: calEl, calLink: calLink(inlineForm), config: calConfig(answers) });
    fallbackLink?.setAttribute('href', calPage(inlineForm, answers));
    // The calendar, or the link standing in for it when Cal.com can't load.
    const show = (calendar: boolean) => {
      const hadFocus = (calendar ? fallback : calStep)?.contains(document.activeElement);
      calStep.hidden = !calendar;
      fallback?.classList.toggle('is-shown', !calendar);
      if (hadFocus) (calendar ? calStep : fallbackLink)?.focus({ preventScroll: true });
    };
    inline.hidden = true;
    show(true);
    panelIntoView();
    calStep.focus({ preventScroll: true });
    // Still nothing after a few seconds: offer the link, and let the calendar take over if it turns up.
    calInTime().then((ok) => {
      if (ok) return;
      show(false);
      loadCal().then((late) => late && show(true));
    });
  });
}

/* ---------- Booking buttons ---------- */

// On the document, so it runs after the phone menu's own click handler has closed the menu (the
// menu makes the rest of the page inert while it's open).
document.addEventListener('click', (e) => {
  // A new tab asked for: the link (the book page) does the job.
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!(e.target as Element).closest?.('[data-book]')) return;
  if (inline && inlineForm) {
    e.preventDefault();
    panelIntoView();
    if (inline.hidden) calStep?.focus({ preventScroll: true });
    else focusForm(inlineForm, true);
    return;
  }
  // No modal dialogs (Safari before 15.4): the link opens the book page.
  if (!dialog || !dialogForm || typeof dialog.showModal !== 'function') return;
  e.preventDefault();
  loadCal();
  if (!dialog.open) dialog.showModal();
  focusForm(dialogForm);
});
