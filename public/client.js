// Kliens: a tábla kirajzolása és üzenetek a szerverrel.

const COLOR_NAMES = ['Piros', 'Kék', 'Zöld', 'Sárga'];
const COLOR_VARS = ['var(--c0)', 'var(--c1)', 'var(--c2)', 'var(--c3)'];
// pöttyök helye a kocka 3x3-as rácsán (0..8)
const DICE_PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];

// A 40 pályamező koordinátái (oszlop, sor) a 11x11-es rácson, a piros start mezőtől körbe.
const TRACK = [
  [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0],
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 5],
  [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10],
  [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 5],
];
const FINISH = [
  [[1, 5], [2, 5], [3, 5], [4, 5]],
  [[5, 1], [5, 2], [5, 3], [5, 4]],
  [[9, 5], [8, 5], [7, 5], [6, 5]],
  [[5, 9], [5, 8], [5, 7], [5, 6]],
];
const BASES = [
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[9, 0], [10, 0], [9, 1], [10, 1]],
  [[9, 9], [10, 9], [9, 10], [10, 10]],
  [[0, 9], [1, 9], [0, 10], [1, 10]],
];

const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

const clientId = loadClientId();
let ws;
let state = null;
let lastDiceKey = null;

function loadClientId() {
  let id;
  try {
    id = localStorage.getItem('clientId');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('clientId', id);
    }
  } catch {
    id = Math.random().toString(36).slice(2);
  }
  return id;
}

function storage(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return null;
  }
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
  if (msg.type === 'room') {
    state = msg;
    history.replaceState(null, '', `?room=${msg.code}`);
    render();
  } else if (msg.type === 'chat') {
    addMessage(msg);
  } else if (msg.type === 'error') {
    toast(msg.message);
    if (!state) history.replaceState(null, '', location.pathname);
  }
}

// ---- Lobby ----

$('name').value = storage('name') || '';
$('code').value = new URLSearchParams(location.search).get('room') || '';

function getName() {
  const name = $('name').value.trim();
  if (!name) {
    toast('Add meg a neved!');
    $('name').focus();
    return null;
  }
  storage('name', name);
  return name;
}

$('create').onclick = () => {
  const name = getName();
  if (name) send({ type: 'create', name });
};

$('join').onclick = () => {
  const name = getName();
  const code = $('code').value.trim().toUpperCase();
  if (!name) return;
  if (code.length !== 4) return toast('A szobakód 4 betű');
  send({ type: 'join', code, name });
};

$('code').addEventListener('keydown', (e) => e.key === 'Enter' && $('join').click());

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
$('restart').onclick = () => send({ type: 'restart' });
$('dice').onclick = () => send({ type: 'roll' });

$('chat-form').onsubmit = (e) => {
  e.preventDefault();
  const text = $('chat-input').value.trim();
  if (text) send({ type: 'chat', text });
  $('chat-input').value = '';
};

// ---- Megjelenítés ----

function me() {
  return state && state.players.find((p) => p.id === clientId);
}

function playerOf(color) {
  return state.players.find((p) => p.color === color);
}

function render() {
  $('lobby').hidden = true;
  $('room').hidden = false;
  $('room-code').textContent = state.code;
  $('room-label').textContent = `Szoba: ${state.code}`;

  const game = state.game;
  const isHost = state.hostId === clientId;

  const list = $('players');
  list.innerHTML = '';
  state.players.forEach((p) => {
    const li = document.createElement('li');
    if (!p.online) li.className = 'offline';
    const dot = document.createElement('span');
    dot.className = 'dot';
    if (p.color !== null) dot.style.background = COLOR_VARS[p.color];
    li.append(dot);
    let label = p.name;
    if (p.id === state.hostId) label += ' 👑';
    if (p.id === clientId) label += ' (te)';
    if (!p.online) label += ' – kilépett';
    li.append(document.createTextNode(label));
    if (game && game.winners.includes(p.color)) {
      li.append(mark(`${game.winners.indexOf(p.color) + 1}. hely`));
    } else if (game && !game.finished && game.turn === p.color) {
      li.append(mark('◀ jön'));
    }
    list.append(li);
  });

  $('start').hidden = !!game || !isHost;
  $('start').disabled = state.players.length < 2;
  $('restart').hidden = !(game && game.finished && isHost);
  $('waiting').textContent = game
    ? ''
    : isHost
      ? state.players.length < 2
        ? 'Várj, amíg legalább még egy játékos csatlakozik (max. 4).'
        : 'Ha mindenki itt van, indíthatod a játékot!'
      : 'Várakozás, hogy a házigazda elindítsa a játékot...';

  $('controls').hidden = !game;
  if (game) renderControls(game);
  drawBoard(game);
}

function mark(text) {
  const span = document.createElement('span');
  span.className = 'turn-mark';
  span.textContent = text;
  return span;
}

function renderControls(game) {
  const myTurn = !game.finished && me() && me().color === game.turn;
  const current = playerOf(game.turn);
  const dice = $('dice');

  drawDice(dice, game.dice);
  dice.disabled = !myTurn || game.rolled;
  const diceKey = JSON.stringify(game.lastEvent);
  if (game.lastEvent && game.lastEvent.type === 'roll' && diceKey !== lastDiceKey) {
    dice.classList.remove('rolling');
    void dice.offsetWidth;
    dice.classList.add('rolling');
  }
  lastDiceKey = diceKey;

  if (game.finished) {
    $('status').textContent = `🏆 ${playerOf(game.winners[0]).name} nevet a végén!`;
    $('hint').textContent = '';
    return;
  }

  $('status').innerHTML = '';
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = COLOR_VARS[game.turn];
  $('status').append(dot, document.createTextNode(myTurn ? ' Te jössz!' : ` ${current.name} következik`));

  let hint = '';
  if (myTurn && !game.rolled) {
    hint = game.dice && game.tries > 0 ? `Nem jött hatos, dobj újra! (${game.tries}/3)` : 'Kattints a kockára!';
  } else if (myTurn && game.movable.length) {
    hint = 'Válassz egy villogó bábut!';
  } else if (game.rolled && !game.movable.length) {
    hint = 'Nincs lehetséges lépés, a kör továbbmegy.';
  }
  $('hint').textContent = hint;
}

function drawDice(button, value) {
  const svg = el('svg', { viewBox: '0 0 3 3' });
  if (value) {
    for (const i of DICE_PIPS[value]) {
      svg.append(el('circle', { cx: (i % 3) + 0.5, cy: Math.floor(i / 3) + 0.5, r: 0.32, class: 'pip' }));
    }
  } else {
    const q = el('text', { x: 1.5, y: 2.05, 'text-anchor': 'middle', class: 'q' });
    q.textContent = '?';
    svg.append(q);
  }
  button.replaceChildren(svg);
}

function el(name, attrs) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function circle(svg, [x, y], r, fill, cls = 'cell') {
  const c = el('circle', { cx: x + 0.5, cy: y + 0.5, r, class: cls });
  if (fill) c.style.fill = fill;
  svg.append(c);
  return c;
}

function tint(color) {
  return `color-mix(in srgb, ${COLOR_VARS[color]} 30%, white)`;
}

function drawBoard(game) {
  const svg = $('board');
  svg.innerHTML = '';

  TRACK.forEach((pos, i) => circle(svg, pos, 0.42, i % 10 === 0 ? tint(i / 10) : null));
  FINISH.forEach((cells, color) => cells.forEach((pos) => circle(svg, pos, 0.42, tint(color))));
  BASES.forEach((cells, color) => cells.forEach((pos) => circle(svg, pos, 0.42, tint(color))));

  if (!game) return;

  const myTurn = me() && me().color === game.turn && !game.finished;
  for (const color of game.colors) {
    game.pieces[color].forEach((p, idx) => {
      let pos;
      if (p === -1) pos = BASES[color][idx];
      else if (p < 40) pos = TRACK[(color * 10 + p) % 40];
      else pos = FINISH[color][p - 40];
      const movable = myTurn && color === game.turn && game.movable.includes(idx);
      const piece = circle(svg, pos, 0.32, COLOR_VARS[color], movable ? 'piece movable' : 'piece');
      if (movable) piece.addEventListener('click', () => send({ type: 'move', piece: idx }));
    });
  }
}

function addMessage(msg) {
  const li = document.createElement('li');
  if (msg.system) {
    li.className = 'system';
    li.textContent = msg.text;
  } else {
    const name = document.createElement('strong');
    name.textContent = `${msg.name}: `;
    if (msg.color !== null) name.style.color = COLOR_VARS[msg.color];
    li.append(name, document.createTextNode(msg.text));
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
