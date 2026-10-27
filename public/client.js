// Kliens alap: főoldal, szoba, chat. Az egyes játékok rajzolói a games/ mappában vannak,
// és a `Renderers` objektumba regisztrálják magukat.

const PALETTE = ['var(--c0)', 'var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)'];
const SVG_NS = 'http://www.w3.org/2000/svg';
// pöttyök helye a kocka 3x3-as rácsán (0..8)
const DICE_PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];

const Renderers = {};

// Apró DOM segédek, a játék-rajzolók is ezeket használják.
const UI = {
  el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'style') Object.assign(node.style, v);
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v === true) node.setAttribute(k, '');
      else if (v !== false && v !== null && v !== undefined) node.setAttribute(k, v);
    }
    node.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
    return node;
  },

  svg(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style') Object.assign(node.style, v);
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    return node;
  },

  dot(color) {
    return UI.el('span', { class: 'dot', style: { background: color ?? '#bbb' } });
  },

  // kocka SVG-ként; value 0 = még nem dobott
  dice(value, extraClass = '') {
    const svg = UI.svg('svg', { viewBox: '0 0 3 3', class: `die ${extraClass}` });
    svg.append(UI.svg('rect', { x: 0.05, y: 0.05, width: 2.9, height: 2.9, rx: 0.45, class: 'die-bg' }));
    if (value) {
      for (const i of DICE_PIPS[value]) {
        svg.append(UI.svg('circle', { cx: (i % 3) + 0.5, cy: Math.floor(i / 3) + 0.5, r: 0.3, class: 'pip' }));
      }
    } else {
      const q = UI.svg('text', { x: 1.5, y: 2.05, 'text-anchor': 'middle', class: 'die-q' });
      q.textContent = '?';
      svg.append(q);
    }
    return svg;
  },
};

const $ = (id) => document.getElementById(id);

const clientId = loadClientId();
let ws;
let catalog = [];
let state = null;

function storage(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    return null;
  }
  return null;
}

function loadClientId() {
  let id = storage('clientId');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    storage('clientId', id);
  }
  return id;
}

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);
  ws.onopen = () => {
    // újratöltéskor / megosztott linkkel automatikusan be a szobába
    const code = new URLSearchParams(location.search).get('room');
    const name = storage('name');
    if (code && name) send({ type: 'join', code, name });
  };
  ws.onmessage = (e) => handle(JSON.parse(e.data));
  ws.onclose = () => setTimeout(connect, 1000);
}

function send(msg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ...msg, clientId }));
  else toast('Nincs kapcsolat a szerverrel...');
}

function handle(msg) {
  if (msg.type === 'hello') {
    catalog = msg.games;
    renderHome();
  } else if (msg.type === 'room') {
    state = msg;
    history.replaceState(null, '', `?room=${msg.code}`);
    renderRoom();
  } else if (msg.type === 'chat') {
    addMessage(msg);
  } else if (msg.type === 'error') {
    toast(msg.message);
    if (!state) history.replaceState(null, '', location.pathname);
  }
}

// ---- Főoldal ----

$('name').value = storage('name') || '';
$('code').value = new URLSearchParams(location.search).get('room') || '';

function getName() {
  const name = $('name').value.trim();
  if (!name) {
    toast('Előbb add meg a neved!');
    $('name').focus();
    return null;
  }
  storage('name', name);
  return name;
}

function playersText(g) {
  return g.minPlayers === g.maxPlayers ? `${g.minPlayers} fő` : `${g.minPlayers}–${g.maxPlayers} fő`;
}

function renderHome() {
  $('game-list').replaceChildren(
    ...catalog.map((g) =>
      UI.el(
        'button',
        {
          class: 'game-card',
          onclick: () => {
            const name = getName();
            if (name) send({ type: 'create', name, gameId: g.id });
          },
        },
        g.original ? UI.el('span', { class: 'badge' }, '✨ Saját találmány') : null,
        UI.el('span', { class: 'emoji' }, g.emoji),
        UI.el('strong', {}, g.name),
        UI.el('span', { class: 'players' }, playersText(g)),
        UI.el('span', { class: 'desc' }, g.description),
      ),
    ),
  );
}

$('join').onclick = () => {
  const name = getName();
  const code = $('code').value.trim().toUpperCase();
  if (!name) return;
  if (code.length !== 4) return toast('A szobakód 4 betű');
  send({ type: 'join', code, name });
};

$('code').addEventListener('keydown', (e) => e.key === 'Enter' && $('join').click());

// ---- Szoba ----

$('copy-link').onclick = async () => {
  const link = `${location.origin}${location.pathname}?room=${state.code}`;
  try {
    await navigator.clipboard.writeText(link);
    toast('Link kimásolva, küldd el a haverjaidnak!');
  } catch {
    prompt('Másold ki ezt a linket:', link);
  }
};

$('start').onclick = () => send({ type: 'start' });
$('restart').onclick = () => {
  if (state.game && !state.game.finished && !confirm('Biztosan befejezed a játékot mindenkinek?')) return;
  send({ type: 'restart' });
};
$('game-select').onchange = (e) => send({ type: 'chooseGame', gameId: e.target.value });

$('chat-form').onsubmit = (e) => {
  e.preventDefault();
  const text = $('chat-input').value.trim();
  if (text) send({ type: 'chat', text });
  $('chat-input').value = '';
};

function me() {
  return state.players.find((p) => p.id === clientId);
}

function bySeat(seat) {
  return state.players.find((p) => p.seat === seat);
}

function colorOf(seat) {
  const p = bySeat(seat);
  return p && p.color !== null ? PALETTE[p.color] : '#bbb';
}

function renderRoom() {
  $('home').hidden = true;
  $('room').hidden = false;
  $('room-code').textContent = state.code;
  $('room-label').textContent = `Szoba: ${state.code}`;

  const info = catalog.find((g) => g.id === state.gameId);
  const view = state.game;
  const isHost = state.hostId === clientId;
  const n = state.players.length;

  $('game-title').replaceChildren(UI.el('span', { class: 'emoji' }, info.emoji), ` ${info.name}`, UI.el('span', { class: 'muted' }, ` (${playersText(info)})`));
  $('rules-list').replaceChildren(...info.rules.map((r) => UI.el('li', {}, r)));

  const select = $('game-select');
  select.hidden = !isHost || !!view;
  if (!select.hidden) {
    select.replaceChildren(...catalog.map((g) => UI.el('option', { value: g.id, selected: g.id === state.gameId }, `${g.emoji} ${g.name} (${playersText(g)})`)));
  }

  $('players').replaceChildren(
    ...state.players.map((p) => {
      let label = p.name;
      if (p.id === state.hostId) label += ' 👑';
      if (p.id === clientId) label += ' (te)';
      if (!p.online) label += ' – kilépett';
      let mark = null;
      if (view && view.finished && view.winners.includes(p.seat)) mark = '🏆';
      else if (view && !view.finished && view.turn === p.seat) mark = '◀ jön';
      else if (view && view.waiting && view.waiting.includes(p.seat)) mark = 'gondolkodik…';
      return UI.el(
        'li',
        { class: p.online ? '' : 'offline' },
        UI.dot(p.color === null ? null : PALETTE[p.color]),
        label,
        mark && UI.el('span', { class: 'turn-mark' }, mark),
      );
    }),
  );

  const fits = n >= info.minPlayers && n <= info.maxPlayers;
  $('start').hidden = !!view || !isHost;
  $('start').disabled = !fits;
  // a házigazda bármikor visszaléphet a váróba (pl. ha valaki végleg kilépett)
  $('restart').hidden = !(view && isHost);
  $('restart').textContent = view && view.finished ? 'Új játék / másik játék' : 'Játék befejezése';
  let waiting = '';
  if (!view) {
    if (!isHost) waiting = 'Várakozás, hogy a házigazda elindítsa a játékot...';
    else if (n < info.minPlayers) waiting = `Még ${info.minPlayers - n} játékos kell. Küldd el nekik a linket!`;
    else if (n > info.maxPlayers) waiting = `Ehhez a játékhoz legfeljebb ${info.maxPlayers} játékos kell – válassz másikat!`;
    else waiting = 'Ha mindenki itt van, indíthatod!';
  }
  $('waiting').textContent = waiting;

  renderStatus(view);
  const area = $('game-area');
  if (!view) {
    area.replaceChildren(
      UI.el('div', { class: 'placeholder' }, UI.el('div', { class: 'emoji big' }, info.emoji), UI.el('h2', {}, info.name), UI.el('p', { class: 'muted' }, info.description)),
    );
    area.dataset.game = '';
    return;
  }
  if (area.dataset.game !== state.gameId) {
    area.replaceChildren();
    area.dataset.game = state.gameId;
  }
  const mine = me();
  Renderers[state.gameId].render(area, view, {
    mySeat: mine ? mine.seat : null,
    myTurn: !!(mine && mine.seat !== null && view.turn === mine.seat && !view.finished),
    name: (seat) => (bySeat(seat) || { name: '?' }).name,
    color: colorOf,
    send: (action) => send({ type: 'action', action }),
  });
}

function renderStatus(view) {
  const status = $('status');
  status.classList.remove('mine');
  if (!view) {
    status.replaceChildren('Várakozás a játékosokra...');
  } else if (view.finished) {
    const names = view.winners.map((s) => bySeat(s).name);
    status.replaceChildren(names.length ? `🏆 ${names.join(', ')} nyert!` : '🤝 Döntetlen!');
  } else if (view.turn !== null && view.turn !== undefined) {
    const mine = me();
    const myTurn = mine && mine.seat === view.turn;
    status.replaceChildren(UI.dot(colorOf(view.turn)), myTurn ? ' Te jössz!' : ` ${bySeat(view.turn).name} következik`);
    status.classList.toggle('mine', !!myTurn);
  } else if (view.waiting && view.waiting.length) {
    // egyszerre lépős játék: kire várunk még
    const mine = me();
    const iMustAct = mine && view.waiting.includes(mine.seat);
    const others = view.waiting.filter((s) => !mine || s !== mine.seat).map((s) => bySeat(s).name);
    let text = `Még rájuk várunk: ${others.join(', ')}`;
    if (iMustAct) text = others.length ? `Te is válassz! ${text}` : 'Már csak rád várnak, válassz!';
    status.replaceChildren(text);
    status.classList.toggle('mine', !!iMustAct);
  } else {
    status.replaceChildren('');
  }
}

function addMessage(msg) {
  let li;
  if (msg.system) {
    li = UI.el('li', { class: 'system' }, msg.text);
  } else {
    const p = state && state.players.find((x) => x.id === msg.id);
    const color = p && p.color !== null ? PALETTE[p.color] : null;
    li = UI.el('li', {}, UI.el('strong', { style: { color } }, `${msg.name}: `), msg.text);
  }
  const list = $('messages');
  list.append(li);
  list.scrollTop = list.scrollHeight;
}

let toastTimer;
function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 3000);
}

connect();
