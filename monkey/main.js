// ---------- Mobilní navigace ----------
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');

function setMenu(open) {
  nav.classList.toggle('is-open', open);
  navToggle.classList.toggle('is-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
  document.querySelector('.header').classList.toggle('menu-open', open);
  document.documentElement.classList.toggle('no-scroll', open);
}

navToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));
// Při otočení / zvětšení okna na desktop menu zavřít, aby nezůstal zamčený scroll
matchMedia('(min-width: 861px)').addEventListener('change', (e) => e.matches && setMenu(false));

// ---------- Stín hlavičky při scrollu ----------
const header = document.querySelector('.header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------- Záložky menu ----------
const tabs = document.querySelectorAll('.tab');
tabs.forEach((tab) =>
  tab.addEventListener('click', () => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
  })
);

// ---------- Otevřeno / zavřeno (čas v Praze) ----------
// Otevírací doba poboček: den v týdnu (0 = neděle) → [otevírá, zavírá]
const BRANCHES = {
  harfa: {
    name: 'Harfa', where: 'na Harfě',
    hours: { 0: [10, 18], 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [10, 18] },
  },
  opletalova: {
    name: 'Opletalova', where: 'na Opletalově',
    hours: { 0: [9, 18], 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [9, 18] },
  },
};

function pragueNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: days[get('weekday')], minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function branchState(branch, day, minutes) {
  const [open, close] = branch.hours[day];
  if (minutes >= open * 60 && minutes < close * 60) return { isOpen: true, left: close * 60 - minutes, close };
  if (minutes < open * 60) return { isOpen: false, when: 'dnes', at: open };
  return { isOpen: false, when: 'zítra', at: branch.hours[(day + 1) % 7][0] };
}

function statusText(s) {
  if (s.isOpen) return s.left <= 60 ? `Otevřeno – zavíráme za ${s.left} min` : `Otevřeno · do ${s.close}:00`;
  return `Zavřeno · ${s.when} od ${s.at}:00`;
}

function setStatus(el, isOpen, text) {
  el.classList.toggle('is-open', isOpen);
  el.classList.toggle('is-closed', !isOpen);
  el.querySelector('.status__text').textContent = text;
}

function updateStatus() {
  const { day, minutes } = pragueNow();
  const states = Object.entries(BRANCHES).map(([id, b]) => ({ id, ...b, ...branchState(b, day, minutes) }));

  // Karty poboček v sekci Kontakt
  states.forEach((s) => {
    const card = document.querySelector(`[data-branch="${s.id}"]`);
    if (!card) return;
    setStatus(card.querySelector('.status'), s.isOpen, statusText(s));
    card.querySelectorAll('.hours tr').forEach((tr) =>
      tr.classList.toggle('is-today', tr.dataset.days.split(',').map(Number).includes(day))
    );
  });

  // Souhrn v úvodu stránky
  const open = states.filter((s) => s.isOpen);
  let text;
  if (open.length === states.length) {
    const closes = [...new Set(open.map((s) => s.close))];
    text = closes.length === 1 ? `Obě pobočky otevřené · do ${closes[0]}:00` : 'Obě pobočky právě otevřené';
  } else if (open.length) {
    const closed = states.find((s) => !s.isOpen);
    text = `Otevřeno ${open[0].where} · ${closed.name} ${closed.when === 'dnes' ? 'od' : 'zítra od'} ${closed.at}:00`;
  } else {
    // nejbližší otevření: dnešek má přednost před zítřkem, pak nejdřívější hodina
    const next = states.reduce((a, b) =>
      a.when !== b.when ? (a.when === 'dnes' ? a : b) : a.at <= b.at ? a : b
    );
    // když obě pobočky otevírají ve stejnou dobu, pobočku nejmenujeme
    const sameTime = states.every((s) => s.when === next.when && s.at === next.at);
    text = `Zavřeno · ${next.when} otevíráme v ${next.at}:00${sameTime ? '' : ' ' + next.where}`;
  }
  setStatus(document.getElementById('openStatus'), open.length > 0, text);
}
updateStatus();
setInterval(updateStatus, 60 * 1000);

// ---------- Plynulé zobrazení sekcí ----------
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.12 }
);
document.querySelectorAll('.section__head, .about__text, .feature, .menu-list, .bakery > *, .g, .job, .contact__top, .branch')
  .forEach((el) => {
    el.classList.add('reveal');
    io.observe(el);
  });

document.getElementById('year').textContent = new Date().getFullYear();
