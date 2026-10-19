import './style.css';
import { GAMES, Game, findGame, sandboxFor } from './games';
import { DailyTimer, formatMinutes } from './timer';
import { Bridge, connectGame, getHighScore } from './bridge';

// ---------- tiện ích DOM ----------
type Attrs = Record<string, string | boolean | ((e: Event) => void)>;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: (Node | string | null)[]) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false) el.setAttribute(k, v);
  }
  for (const kid of kids) if (kid != null) el.append(kid);
  return el;
}
function svg(markup: string): Node {
  const t = document.createElement('template');
  t.innerHTML = markup.trim(); // chỉ dùng cho icon tĩnh viết sẵn trong code
  return t.content.firstChild!;
}

const ICON = {
  logo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="5"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".6"/><circle cx="17.5" cy="13.5" r=".6"/></svg>',
  search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  clock: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  full: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  moon: '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
};

// ---------- bộ đếm ----------
const timer = new DailyTimer();
setInterval(() => timer.tick(), 1000);
window.addEventListener('storage', (e) => {
  if (e.key === 'grc.playtime.v1') timer.syncFromOtherTab();
});
document.addEventListener('visibilitychange', () => {
  if (!bridge) return;
  bridge.send(document.visibilityState === 'visible' ? 'resume' : 'pause');
});

// ---------- khung trang ----------
const app = document.getElementById('app')!;
const timeText = h('span', { class: 'timer-value' });
const timeBar = h('span', { class: 'timer-bar-fill' });
const timerPill = h('div', { class: 'timer', role: 'status', 'aria-live': 'polite' },
  svg(ICON.clock),
  h('div', { class: 'timer-body' },
    h('div', { class: 'timer-row' }, h('span', {}, 'Hôm nay còn'), timeText),
    h('span', { class: 'timer-bar' }, timeBar),
  ),
);
const searchInput = h('input', { id: 'q', type: 'search', placeholder: 'Tìm game…', autocomplete: 'off' }) as HTMLInputElement;
const searchBox = h('div', { class: 'search' },
  svg(ICON.search),
  h('label', { for: 'q', class: 'sr-only' }, 'Tìm game'),
  searchInput,
);
const header = h('header', { class: 'topbar' },
  h('a', { href: '#/', class: 'logo' }, h('span', { class: 'logo-mark' }, svg(ICON.logo)), h('span', { class: 'logo-text' }, 'Giờ Ra Chơi')),
  searchBox,
  timerPill,
);
const view = h('main', { class: 'view' });
const toastBox = h('div', { class: 'toasts', 'aria-live': 'assertive' });
app.append(header, view, toastBox);

function renderTimer(remaining = timer.remaining()) {
  timeText.textContent = remaining > 0 ? formatMinutes(remaining) : 'Hết giờ';
  const pct = (remaining / timer.limitSeconds) * 100;
  timeBar.style.width = `${pct}%`;
  timerPill.dataset.level = remaining <= 300 ? 'danger' : remaining <= 600 ? 'warn' : 'ok';
}
renderTimer();

function toast(text: string, tone: 'info' | 'warn' = 'info') {
  const t = h('div', { class: `toast toast-${tone}` }, text);
  toastBox.append(t);
  setTimeout(() => t.classList.add('out'), 3600);
  setTimeout(() => t.remove(), 4000);
}

let bridge: Bridge | null = null;

timer.on((e) => {
  if (e.type === 'change') renderTimer(e.remaining);
  if (e.type === 'warning') toast(`Còn ${e.minutesLeft} phút chơi hôm nay. Chuẩn bị nghỉ nhé!`, 'warn');
  if (e.type === 'timeUp') {
    renderTimer(0);
    if (bridge) {
      bridge.send('timeUp'); // cho game cơ hội lưu lại
      setTimeout(() => route(), 400);
    }
  }
});

// ---------- màn hình hết giờ ----------
function timeUpScreen(): HTMLElement {
  return h('section', { class: 'timeup' },
    h('div', { class: 'timeup-card' },
      h('span', { class: 'timeup-icon' }, svg(ICON.moon)),
      h('h1', {}, 'Hết giờ chơi hôm nay rồi!'),
      h('p', {}, 'Bạn đã chơi đủ 45 phút. Nghỉ mắt, vận động một chút, hẹn gặp lại vào ngày mai nhé.'),
      h('a', { href: '#/', class: 'btn' }, 'Về trang chủ'),
    ),
  );
}

// ---------- trang chủ ----------
function tile(g: Game, i: number): HTMLElement {
  const ready = g.status === 'ready';
  const shapes = ['50%', '18px', '50% 50% 8px 50%', '8px'];
  const a = h('a', {
    href: ready ? `#/choi/${g.id}` : '#/',
    class: `tile${g.big ? ' tile-big' : ''}${ready ? '' : ' tile-soon'}`,
    'aria-label': ready ? g.name : `${g.name} (sắp có)`,
    onClick: (e: Event) => {
      if (!ready) {
        e.preventDefault();
        toast(`"${g.name}" đang được làm, quay lại sau nhé!`);
      }
    },
  },
    g.thumb
      ? h('img', { class: 'thumb', src: `${import.meta.env.BASE_URL}thumbs/${g.id}.jpg`, alt: '', loading: 'lazy', decoding: 'async' })
      : null,
    g.thumb ? null : h('span', { class: 'shape shape-a', 'aria-hidden': 'true' }),
    g.thumb ? null : h('span', { class: 'shape shape-b', 'aria-hidden': 'true' }),
    h('span', { class: 'tile-name' }, g.name),
    h('span', { class: 'badges' },
      g.isNew ? h('span', { class: 'badge' }, 'Mới') : h('span'),
      ready ? null : h('span', { class: 'badge badge-soon' }, 'Sắp có'),
    ),
  );
  a.style.setProperty('--bg', g.color);
  a.style.setProperty('--r1', shapes[i % 4]);
  a.style.setProperty('--r2', shapes[(i + 1) % 4]);
  return a;
}

function homeView() {
  searchBox.hidden = false;
  const grid = h('div', { class: 'grid' });
  const empty = h('p', { class: 'empty', hidden: true }, 'Không tìm thấy game nào.');
  const draw = () => {
    const q = normalize(searchInput.value);
    const list = GAMES.filter((g) => !q || normalize(g.name).includes(q));
    // game chơi được xếp trước, game "sắp có" xếp sau
    list.sort((a, b) => (a.status === b.status ? 0 : a.status === 'ready' ? -1 : 1));
    grid.replaceChildren(...list.map((g) => tile(g, GAMES.indexOf(g))));
    empty.hidden = list.length > 0;
  };
  searchInput.oninput = draw;
  draw();
  view.replaceChildren(grid, empty, footer());
}

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').trim();
}

function footer() {
  return h('footer', { class: 'footer' },
    h('span', {}, 'Mỗi ngày chơi tối đa 45 phút. Không quảng cáo, không thu thập dữ liệu cá nhân.'),
    h('a', { href: '#/gioi-thieu' }, 'Giới thiệu & nguồn game'),
  );
}

// ---------- trang chơi game ----------
function playView(g: Game) {
  searchBox.hidden = true;
  if (timer.isTimeUp()) {
    view.replaceChildren(timeUpScreen());
    return;
  }
  const src = g.kind === 'local' ? `${import.meta.env.BASE_URL}${g.src}` : g.src!;
  const frame = h('iframe', {
    src,
    title: g.name,
    sandbox: sandboxFor(g),
    allow: 'fullscreen; autoplay',
    referrerpolicy: 'no-referrer',
  }) as HTMLIFrameElement;
  const loading = h('div', { class: 'stage-loading', role: 'status' },
    h('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Đang tải game…');
  const stage = h('div', { class: 'stage' }, frame, loading);
  frame.addEventListener('load', () => {
    loading.remove();
    frame.focus(); // để bàn phím điều khiển được game ngay
  });
  const best = getHighScore(g.id);
  const bestText = h('span', { class: 'best' }, best ? `Kỷ lục: ${best}` : '');

  bridge = connectGame(frame, g.id, {
    onNewHighScore: (s) => {
      bestText.textContent = `Kỷ lục: ${s}`;
      toast(`Kỷ lục mới: ${s} điểm!`);
    },
  });
  timer.setPlaying(true);

  const bar = h('div', { class: 'playbar' },
    h('a', { href: '#/', class: 'icon-btn', 'aria-label': 'Về trang chủ' }, svg(ICON.back)),
    h('h1', { class: 'play-title' }, g.name),
    bestText,
    h('button', {
      class: 'icon-btn', type: 'button', 'aria-label': 'Toàn màn hình',
      onClick: () => stage.requestFullscreen?.().catch(() => {}),
    }, svg(ICON.full)),
  );
  const credit = g.credit.url
    ? h('p', { class: 'credit' },
      `Tác giả: ${g.credit.author} · Giấy phép: ${g.credit.license} · `,
      h('a', { href: g.credit.url, target: '_blank', rel: 'noopener' }, 'Mã nguồn'),
      g.credit.notes ? ` · ${g.credit.notes} ` : ' ',
      g.credit.licenseFile ? h('a', { href: '#/gioi-thieu' }, 'Giấy phép chi tiết') : null,
    )
    : null;
  const howTo = g.howTo?.length
    ? h('section', { class: 'howto', 'aria-label': 'Cách chơi' },
      h('h2', {}, 'Cách chơi'),
      h('ul', {}, ...g.howTo.map((t) => h('li', {}, t))))
    : null;
  view.replaceChildren(bar, stage, howTo ?? '', credit ?? '');
}

// ---------- trang giới thiệu ----------
function aboutView() {
  searchBox.hidden = true;
  const rows = GAMES.map((g) =>
    h('tr', {},
      h('td', {}, g.name),
      h('td', {}, g.credit.author),
      h('td', {}, g.credit.license),
      h('td', {}, g.credit.url ? h('a', { href: g.credit.url, target: '_blank', rel: 'noopener' }, 'Xem') : '—'),
    ),
  );
  const licensed = GAMES.filter((g) => g.credit.licenseFile);
  view.replaceChildren(
    h('article', { class: 'about' },
      h('h1', {}, 'Giới thiệu'),
      h('p', {}, 'Giờ Ra Chơi là sân chơi game HTML5 miễn phí cho học sinh tiểu học đến trung học. Mỗi ngày chơi tối đa 45 phút. Site không có quảng cáo, không mua trong game, không chat và không thu thập dữ liệu cá nhân. Thời gian chơi và điểm cao chỉ lưu trên trình duyệt của bạn. Site hoạt động phi thương mại.'),
      h('h2', {}, 'Nguồn game và giấy phép'),
      h('div', { class: 'table-wrap' },
        h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Game'), h('th', {}, 'Tác giả'), h('th', {}, 'Giấy phép'), h('th', {}, 'Nguồn'))),
          h('tbody', {}, ...rows),
        ),
      ),
      h('h2', {}, 'Giấy phép chi tiết'),
      ...licensed.map((g) => h('div', { class: 'license-item' },
        g.credit.notes ? h('p', { class: 'license-note' }, `${g.name}: ${g.credit.notes}`) : null,
        licenseBlock(g),
      )),
      h('h2', {}, 'Font chữ'),
      h('p', {}, 'Baloo 2 và Be Vietnam Pro, giấy phép SIL Open Font License 1.1, được lưu trên chính site này.'),
      h('p', {}, h('a', { href: '#/' }, '← Về trang chủ')),
    ),
  );
}

// Nội dung file giấy phép chỉ tải khi người đọc mở mục đó.
function licenseBlock(g: Game): HTMLElement {
  const pre = h('pre', { class: 'license-text' }, 'Đang tải…');
  const d = h('details', { class: 'license' }, h('summary', {}, `Giấy phép của ${g.name}`), pre) as HTMLDetailsElement;
  let loaded = false;
  d.addEventListener('toggle', () => {
    if (!d.open || loaded) return;
    loaded = true;
    fetch(`${import.meta.env.BASE_URL}${g.credit.licenseFile}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => { pre.textContent = t; })
      .catch(() => { pre.textContent = 'Không tải được file giấy phép.'; });
  });
  return d;
}

// ---------- router ----------
function route() {
  bridge?.dispose();
  bridge = null;
  timer.setPlaying(false);
  const hash = location.hash.replace(/^#\/?/, '');
  const [page, id] = hash.split('/');
  if (page === 'choi' && id) {
    const g = findGame(id);
    if (g && g.status === 'ready') return playView(g);
  }
  if (page === 'gioi-thieu') return aboutView();
  homeView();
}
window.addEventListener('hashchange', () => {
  route();
  window.scrollTo(0, 0);
});
route();
