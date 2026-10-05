/**
 * Booking. Every booking button ([data-book], Button.astro) opens the booking form
 * (BookingForm.astro): who's booking and a few questions about the business. Sending it
 * emails us the answers (notify) and puts the free audit's booking page on Google Calendar
 * in the form's place, where the visitor picks a time. On the book page the form is already
 * in the page, so the buttons bring it into view instead.
 *
 * The booking page loads only once the answers are in, so a visitor who never books never
 * loads it. The same answers are emailed once a day at most, however often they're sent (a
 * second try, a reload, another tab), and an email that didn't go through is tried again the
 * next time the form is sent.
 */
import { fine, store } from './lib';

type Answers = Record<string, string>;

const NOTIFY_URL = 'https://api.web3forms.com/submit';

/* ---------- The form ---------- */

/** What the visitor fills in. The hidden fields are for Web3Forms, when the form posts without JavaScript. */
const questions = (form: HTMLFormElement) => [
  ...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input:not([type="hidden"]), select, textarea',
  ),
];

/** The answers, trimmed, or null (and the browser points at what's missing) if any is blank. */
function answersOf(form: HTMLFormElement): Answers | null {
  questions(form).forEach((f) => f instanceof HTMLSelectElement || (f.value = f.value.trim()));
  if (!form.reportValidity()) return null;
  return Object.fromEntries(questions(form).map((f) => [f.name, f.value]));
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

/** Step 2: the booking page in the form's place, loaded the first time it's needed. */
function pickATime(host: HTMLElement) {
  const form = host.querySelector('form')!;
  const step = host.querySelector<HTMLElement>('[data-booking-time]')!;
  const frame = step.querySelector<HTMLElement>('[data-booking-frame]')!;
  if (!frame.firstElementChild && frame.dataset.src) {
    const page = document.createElement('iframe');
    page.src = frame.dataset.src;
    page.title = 'Pick a time for your free systems audit';
    frame.append(page);
  }
  form.hidden = true;
  step.hidden = false;
  host.classList.add('is-picking');
  if (host instanceof HTMLDialogElement) host.setAttribute('aria-labelledby', step.getAttribute('aria-labelledby')!);
  step.focus({ preventScroll: true });
}

/* ---------- The email ---------- */

// Answers emailed from this browser in the last day, by hash (the answers themselves are never kept),
// with when they went. In storage, so other tabs and later visits see it; `sentHere` stands in when
// storage is blocked.
const SENT_KEY = 'nk-sent';
const SENT_FOR = 24 * 60 * 60 * 1000;
let sentHere: Record<string, number> = {};

// cyrb53: a quick 53-bit string hash, plenty to tell one set of answers from another.
function hash(text: string) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function sentLog(): Record<string, number> {
  let saved: unknown = null;
  try {
    saved = JSON.parse(store.get(SENT_KEY) ?? 'null');
  } catch {
    /* unreadable: start afresh */
  }
  const now = Date.now();
  return Object.fromEntries(
    Object.entries({ ...sentHere, ...(saved && typeof saved === 'object' ? saved : {}) }).filter(
      (e): e is [string, number] => typeof e[1] === 'number' && now - e[1] < SENT_FOR,
    ),
  );
}

function logSent(id: string, sent: boolean) {
  const log = sentLog();
  if (sent) log[id] = Date.now();
  else delete log[id];
  sentHere = log;
  store.set(SENT_KEY, JSON.stringify(log));
}

/** Emails us the answers (Web3Forms, to the address the form's access key was made for). It never
 *  holds up the booking. Answers already emailed in the last day aren't sent again; an email that
 *  didn't go through is tried again the next time the form is sent. */
function notify(form: HTMLFormElement, answers: Answers) {
  const key = (form.elements.namedItem('access_key') as HTMLInputElement | null)?.value;
  if (!key) return;
  const id = hash(JSON.stringify(answers));
  if (id in sentLog()) return;
  logSent(id, true);
  const body = new FormData();
  body.set('access_key', key);
  body.set('subject', `New audit form: ${answers.business} (${answers.niche})`);
  body.set('from_name', 'Neurokov website');
  // A reply to the email goes to the visitor.
  body.set('replyto', answers.email);
  // Each answer under its question, as the visitor read it.
  for (const [name, value] of Object.entries(answers)) {
    const field = form.elements.namedItem(name) as HTMLInputElement | null;
    body.set(field?.labels?.[0]?.textContent?.trim() || name, value);
  }
  body.set('Page', location.pathname + location.search);
  // keepalive: it still goes when the page is left straight away.
  // Accept: an answer in JSON, not a redirect to Web3Forms' thank-you page.
  fetch(NOTIFY_URL, { method: 'POST', body, keepalive: true, headers: { Accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new Error(`Web3Forms answered ${res.status}`);
    })
    .catch(() => logSent(id, false));
}

/* ---------- The dialog every booking button opens ---------- */

const dialog = document.querySelector<HTMLDialogElement>('dialog[data-booking]');
const dialogForm = dialog?.querySelector('form');

if (dialog && dialogForm) {
  const title = dialog.getAttribute('aria-labelledby')!;
  // Closed and opened again, it starts from the questions, still answered: a second try sends them
  // again (once a day at most) and goes back to the booking page.
  dialog.addEventListener('close', () => {
    dialogForm.hidden = false;
    dialog.querySelector<HTMLElement>('[data-booking-time]')!.hidden = true;
    dialog.classList.remove('is-picking');
    dialog.setAttribute('aria-labelledby', title);
  });
  dialog.querySelectorAll('[data-booking-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));
  // A click on the backdrop (the dialog itself, outside its box) closes it. Only a click that
  // started there too: selecting text in a field and letting go outside it isn't one.
  let pressedOutside = false;
  dialog.addEventListener('pointerdown', (e) => (pressedOutside = e.target === dialog));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog && pressedOutside) dialog.close();
    pressedOutside = false;
  });

  dialogForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const answers = answersOf(dialogForm);
    if (!answers) return;
    notify(dialogForm, answers);
    pickATime(dialog);
  });
}

/* ---------- The book page: the form in the page, then the booking page in its place ---------- */

const inline = document.querySelector<HTMLElement>('div[data-booking]');
const inlineForm = inline?.querySelector('form');

/** The book page's panel (the form, or by now the booking page) comes into view, unless it's already there. */
function panelIntoView() {
  const panel = inline?.parentElement;
  const top = panel?.getBoundingClientRect().top ?? 0;
  if (top < 0 || top > innerHeight / 2) panel?.scrollIntoView({ block: 'start' });
}

if (inline && inlineForm) {
  inlineForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const answers = answersOf(inlineForm);
    if (!answers) return;
    notify(inlineForm, answers);
    pickATime(inline);
    panelIntoView();
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
    if (inlineForm.hidden) inline.querySelector<HTMLElement>('[data-booking-time]')?.focus({ preventScroll: true });
    else focusForm(inlineForm, true);
    return;
  }
  // No modal dialogs (Safari before 15.4): the link opens the book page.
  if (!dialog || !dialogForm || typeof dialog.showModal !== 'function') return;
  e.preventDefault();
  if (!dialog.open) dialog.showModal();
  focusForm(dialogForm);
});
