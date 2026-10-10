/**
 * Booking. Every booking button ([data-book], Button.astro) opens the booking form
 * (BookingForm.astro): four questions about the business. Sending it
 * emails us the answers (notify) and puts the free audit's booking page on Google Calendar
 * in the form's place, where the visitor picks a time. On the book page the form is already
 * in the page, so the buttons bring it into view instead.
 *
 * The booking page loads only once the answers are in, so a visitor who never books never
 * loads it. The same answers are emailed once a day at most, however often they're sent (a
 * second try, a reload, another tab). An email that didn't go through is tried again while the
 * visitor stays, at once when their connection comes back, and once more as they leave.
 */
import { fine, store, storageWorks } from './lib';

type Answers = Record<string, string>;

const NOTIFY_URL = 'https://api.web3forms.com/submit';

/* ---------- The form ---------- */

/** What the visitor fills in. The hidden fields are for Web3Forms, when the form posts without
 *  JavaScript; botcheck is the spam trap no person sees. */
const questions = (form: HTMLFormElement) => [
  ...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input:not([type="hidden"]):not([name="botcheck"]), select, textarea',
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
    page.title = 'Pick a time for your free growth audit';
    frame.append(page);
  }
  form.hidden = true;
  step.hidden = false;
  host.classList.add('is-picking');
  shield(host, frame);
  if (host instanceof HTMLDialogElement) {
    host.setAttribute('aria-labelledby', step.getAttribute('aria-labelledby')!);
    // A short screen scrolled down to the button: step 2 starts at its top, title first.
    host.scrollTop = 0;
  }
  step.focus({ preventScroll: true });
}

/** The booking page appears right under the pointer: no click of the run that sent the form (the
 *  second of a double click, a burst of taps) may land in it, to pick a time or take the keyboard
 *  into Google's page. It takes clicks once the presses have stopped for a moment. */
function shield(host: HTMLElement, frame: HTMLElement) {
  frame.style.pointerEvents = 'none';
  let timer = 0;
  const wait = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      frame.style.pointerEvents = '';
      host.removeEventListener('pointerdown', wait, true);
    }, 700);
  };
  host.addEventListener('pointerdown', wait, true);
  wait();
}

/* ---------- The email ---------- */

// Answers emailed from this browser in the last day, by hash (the answers themselves are never kept),
// with when they went and whether Web3Forms took them. In storage, so other tabs and later visits see
// it; `sentHere` stands in when storage is blocked.
const SENT_KEY = 'nk-sent';
const SENT_FOR = 24 * 60 * 60 * 1000;
// A send still on its way (from another tab, say) isn't started again for this long.
const UNDER_WAY = 60 * 1000;
// Waits between tries of an email that didn't go through, while the visitor stays.
const RETRY_AFTER = [5, 15, 30, 60, 120, 300].map((s) => s * 1000);

interface Sent {
  at: number;
  ok: boolean;
}
let sentHere: Record<string, Sent> = {};

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

/** The log as storage has it (as this page has it when storage is blocked), last day only. Entries
 *  from before the outcome was kept are bare times, of emails that went. */
function sentLog(): Record<string, Sent> {
  let saved: unknown = null;
  if (storageWorks) {
    try {
      saved = JSON.parse(store.get(SENT_KEY) ?? 'null');
    } catch {
      /* unreadable: start afresh */
    }
  }
  const log = storageWorks ? (saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {}) : sentHere;
  const now = Date.now();
  const out: Record<string, Sent> = {};
  for (const [id, v] of Object.entries(log)) {
    const entry = typeof v === 'number' ? { at: v, ok: true } : (v as Sent | null);
    if (entry && typeof entry.at === 'number' && now - entry.at < SENT_FOR) out[id] = { at: entry.at, ok: !!entry.ok };
  }
  return out;
}

function logSent(id: string, entry: Sent | null) {
  const log = sentLog();
  if (entry) log[id] = entry;
  else delete log[id];
  sentHere = log;
  store.set(SENT_KEY, JSON.stringify(log));
}

/** Emails that didn't go through yet, by hash: how to send each again, and its next try. */
const pending = new Map<string, { send: () => void; timer: number }>();
/** Answers another tab was sending, to look at again once its send should have reported back. */
const rechecks = new Set<string>();
// Leaving the page cuts the page off from its requests, not the requests themselves (keepalive): one
// that fails to report back as the page goes still went.
let leaving = false;
addEventListener('pagehide', () => {
  leaving = true;
  // The last chance for an email still waiting to be tried again.
  pending.forEach((p) => p.send());
});
addEventListener('pageshow', () => (leaving = false));
addEventListener('online', () => pending.forEach((p) => p.send()));

/** Emails us the answers (Web3Forms, to the address the form's access key was made for). It never
 *  holds up the booking. Answers already emailed in the last day aren't sent again; an email that
 *  didn't go through is tried again (below). */
function notify(form: HTMLFormElement, answers: Answers) {
  const key = (form.elements.namedItem('access_key') as HTMLInputElement | null)?.value;
  if (!key) return;
  // A bot ticked the trap no person can see: nothing is sent.
  if ((form.elements.namedItem('botcheck') as HTMLInputElement | null)?.checked) return;
  const id = hash(JSON.stringify(answers));
  const waiting = pending.get(id);
  if (waiting) return waiting.send(); // sent again by hand: no need to wait for the next try
  const before = sentLog()[id];
  if (before?.ok) return;
  if (before && Date.now() - before.at < UNDER_WAY) {
    // Another tab (or this page before a reload) is sending them now. Should it never say how that
    // went (closed mid-send), they go from here once the wait is over.
    if (!rechecks.has(id)) {
      rechecks.add(id);
      setTimeout(() => (rechecks.delete(id), notify(form, answers)), UNDER_WAY - (Date.now() - before.at) + 1000);
    }
    return;
  }
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
  deliver(id, body);
}

function deliver(id: string, body: FormData) {
  let inFlight = false;
  let tries = 0;
  const later = () => {
    const wait = RETRY_AFTER[tries++];
    if (wait === undefined) return void pending.delete(id); // given up; a send by hand still goes
    pending.set(id, { send, timer: window.setTimeout(send, wait) });
  };
  const send = () => {
    if (inFlight) return;
    clearTimeout(pending.get(id)?.timer);
    const before = sentLog()[id];
    // Meanwhile it went from another tab: done. Or another tab is sending it now: wait and see.
    if (before?.ok) return void pending.delete(id);
    if (pending.has(id) && before && Date.now() - before.at < UNDER_WAY) return later();
    inFlight = true;
    logSent(id, { at: Date.now(), ok: false });
    // keepalive: it still goes when the page is left straight away.
    // Accept: an answer in JSON, not a redirect to Web3Forms' thank-you page.
    fetch(NOTIFY_URL, { method: 'POST', body, keepalive: true, headers: { Accept: 'application/json' } })
      .then(async (res) => {
        // Web3Forms says in its answer whether the email is on its way.
        const reply = (await res.json().catch(() => null)) as { success?: boolean } | null;
        if (!res.ok || reply?.success === false) throw new Error(`Web3Forms answered ${res.status}`);
        pending.delete(id);
        logSent(id, { at: Date.now(), ok: true });
      })
      .catch(() => {
        inFlight = false;
        if (leaving) return;
        // Not sent: another tab or a second try may send it now, and this page tries again in a while.
        logSent(id, null);
        later();
      });
  };
  send();
}


export function startBooking() {
  /* ---------- The dialog every booking button opens ---------- */

  // Not in the page's HTML: every page but the book pages fetches it (pages/booking-popup.astro) on
  // the visitor's first move, or with the first press of a booking button, which keeps it off the
  // first paint. Without modal dialogs (Safari before 15.4) the buttons' link, the book page, does.
  const wantsDialog =
    document.body.hasAttribute('data-booking-dialog') &&
    typeof HTMLDialogElement === 'function' &&
    typeof HTMLDialogElement.prototype.showModal === 'function';
  let dialogLoad: Promise<HTMLDialogElement | null> | undefined;
  let openedAt = -Infinity;
  let fromMenu = false;

  /** The dialog, fetched once and put where the page would have had it (after the footer), with its
   *  styles; null if it can't be had (offline, say), and then tried again on the next press. */
  function loadDialog() {
    dialogLoad ??= fetch('/booking-popup/')
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
      .then((html) => {
        const fetched = new DOMParser().parseFromString(html, 'text/html');
        const dialog = fetched.querySelector<HTMLDialogElement>('dialog[data-booking]');
        const form = dialog?.querySelector('form');
        if (!dialog || !form) return null;
        document.head.append(...fetched.querySelectorAll('style'));
        const footer = document.querySelector('body > .footer');
        if (footer) footer.after(dialog);
        else document.body.append(dialog);
        setUpDialog(dialog, form);
        return dialog;
      })
      .catch(() => {
        dialogLoad = undefined;
        return null;
      });
    return dialogLoad;
  }

  if (wantsDialog) {
    const MOVES = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart', 'focusin', 'scroll'];
    const early = () => {
      for (const type of MOVES) removeEventListener(type, early, true);
      loadDialog();
    };
    for (const type of MOVES) addEventListener(type, early, { capture: true, passive: true });
  }

  function setUpDialog(dialog: HTMLDialogElement, dialogForm: HTMLFormElement) {
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
    // started there too: selecting text in a field and letting go outside it isn't one. Nor the rest
    // of a double click or a quick run of clicks or taps on the button that opened it: the backdrop
    // comes up under the pointer, and the presses after the first would close the form they opened.
    // A run is told by the time since the press before (a touch screen's click count starts over
    // every third tap).
    let pressedOutside = false;
    let lastPress = -Infinity;
    let pressBefore = -Infinity;
    document.addEventListener(
      'pointerdown',
      (e) => {
        pressBefore = lastPress;
        lastPress = e.timeStamp;
      },
      true,
    );
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = e.target === dialog && e.timeStamp - openedAt > 600 && e.timeStamp - pressBefore > 500;
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog && pressedOutside) dialog.close();
      pressedOutside = false;
    });
    // Opened from the phone menu, whose links are gone once it closes: focus goes back to the menu
    // button rather than to nowhere (nor to a link of the menu while it's still fading out).
    dialog.addEventListener('close', () => {
      if (!fromMenu) return;
      fromMenu = false;
      requestAnimationFrame(() => {
        const at = document.activeElement;
        if (!at || at === document.body || at.closest('[data-mobile-menu]') || !(at as HTMLElement).checkVisibility?.()) {
          document.querySelector<HTMLElement>('[data-burger]')?.focus();
        }
      });
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

  // A booking button that has a book page scroll to its panel: the clicks after the one that asked
  // for it, a double click's second say, would land on whatever the scroll carries under the pointer
  // (in the footer, the email link above the booking link). They're dropped till the scroll is over.
  let holdClicksTill = -Infinity;
  document.addEventListener(
    'click',
    (e) => {
      if (e.timeStamp >= holdClicksTill) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

  /** Scrolls `el` to the top of the window; `at`, the time of the click that asked for it. */
  function bringToTop(el: HTMLElement, at = -Infinity) {
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    if (Math.abs(el.getBoundingClientRect().top - pad) < 2) return;
    el.scrollIntoView({ block: 'start' });
    holdClicksTill = at + 1000;
    addEventListener('scrollend', () => (holdClicksTill = -Infinity), { once: true });
  }

  /** The book page's panel (the form, or by now the booking page) comes into view, unless it's already there. */
  function panelIntoView(at?: number) {
    const panel = inline?.parentElement;
    const top = panel?.getBoundingClientRect().top ?? 0;
    if (panel && (top < 0 || top > innerHeight / 2)) bringToTop(panel, at);
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
    const button = (e.target as Element).closest?.('[data-book]');
    if (!button) return;
    // Already on the booking page of its own (pick-a-time): the buttons bring it into view.
    const picker = document.querySelector<HTMLElement>('[data-booking-page]');
    if (picker) {
      e.preventDefault();
      bringToTop(picker, e.timeStamp);
      picker.focus({ preventScroll: true });
      return;
    }
    if (inline && inlineForm) {
      e.preventDefault();
      panelIntoView(e.timeStamp);
      if (inlineForm.hidden) inline.querySelector<HTMLElement>('[data-booking-time]')?.focus({ preventScroll: true });
      else focusForm(inlineForm, true);
      return;
    }
    if (!wantsDialog) return;
    e.preventDefault();
    const link = button as HTMLAnchorElement;
    const href = link.href;
    // Usually here since the visitor's first move; if not, it comes in a moment. (The busy cursor is
    // set here rather than in the stylesheet, which every page carries in its HTML.)
    link.setAttribute('aria-busy', 'true');
    link.style.cursor = 'progress';
    loadDialog().then((dialog) => {
      link.removeAttribute('aria-busy');
      link.style.cursor = '';
      const form = dialog?.querySelector('form');
      // Not to be had: the link's page, the book page, has the same form.
      if (!dialog || !form) {
        if (href) location.assign(href);
        return;
      }
      if (!dialog.open) {
        fromMenu = !!button.closest('[data-mobile-menu]');
        dialog.showModal();
        openedAt = performance.now();
      }
      focusForm(form);
    });
  });
}
