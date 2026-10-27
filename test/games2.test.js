const test = require('node:test');
const assert = require('node:assert');
const { games, catalog } = require('../src/games');

const names = (n) => ['Anna', 'Bence', 'Cili', 'Dani'].slice(0, n);

test('15 játék van, ebből 6 saját', () => {
  assert.strictEqual(catalog().length, 15);
  assert.strictEqual(catalog().filter((g) => g.original).length, 6);
});

// ---- Makaó ----

function makao(n, hands, topCard) {
  const g = games.makao;
  const s = g.create({ names: names(n), rng: Math.random });
  s.hands = hands;
  s.discard = [topCard];
  return { g, s };
}
const c = (s, r) => ({ s, r });

test('makaó: színre vagy értékre lehet rakni', () => {
  const { g, s } = makao(2, [[c(0, 5), c(1, 9), c(2, 3)], [c(3, 4)]], c(1, 5));
  assert.deepStrictEqual(g.view(s, 0).playable, [0, 1]);
  assert.throws(() => g.act(s, 0, { type: 'play', card: 2 }), /nem rakhatod/);
  g.act(s, 0, { type: 'play', card: 1 });
  assert.strictEqual(g.view(s, 0).turn, 1);
});

test('makaó: 7-es halmozódik, aki nem tud rátenni, húz', () => {
  const { g, s } = makao(3, [[c(0, 7), c(0, 2)], [c(1, 7), c(1, 2)], [c(2, 3), c(2, 4)]], c(0, 5));
  g.act(s, 0, { type: 'play', card: 0 });
  assert.deepStrictEqual(g.view(s, 1).playable, [0]); // csak 7-est rakhat
  g.act(s, 1, { type: 'play', card: 0 });
  assert.strictEqual(s.pendingDraw, 4);
  assert.deepStrictEqual(g.view(s, 2).playable, []);
  g.act(s, 2, { type: 'draw' });
  assert.strictEqual(s.hands[2].length, 6);
  assert.strictEqual(s.pendingDraw, 0);
  assert.strictEqual(s.turn, 0);
});

test('makaó: ász kihagy, bubi színt kér, kifogyás nyer', () => {
  const { g, s } = makao(3, [[c(0, 14), c(3, 6), c(0, 2)], [c(0, 3)], [c(0, 11), c(2, 2)]], c(0, 5));
  const res = g.act(s, 0, { type: 'play', card: 0 });
  assert.match(res.log[0], /Bence kimarad/);
  assert.strictEqual(s.turn, 2);
  assert.throws(() => g.act(s, 2, { type: 'play', card: 0 }), /Válassz színt/);
  g.act(s, 2, { type: 'play', card: 0, suit: 3 });
  assert.deepStrictEqual(g.view(s, 0).playable, [0]); // csak a ♣
  const r2 = g.act(s, 0, { type: 'play', card: 0 });
  assert.match(r2.log[0], /Makaó/);
  // Bence nem tud rakni a ♣6-ra, húz
  g.act(s, 1, { type: 'draw' });
  g.act(s, 2, { type: 'draw' });
  s.discard.push(c(0, 9));
  g.act(s, 0, { type: 'play', card: 0 });
  assert.strictEqual(g.view(s, 0).finished, true);
  assert.deepStrictEqual(g.view(s, 0).winners, [0]);
});

test('makaó: mások lapjait nem látod', () => {
  const g = games.makao;
  const s = g.create({ names: names(3), rng: Math.random });
  const v = g.view(s, 1);
  assert.deepStrictEqual(v.hand, s.hands[1]);
  assert.deepStrictEqual(v.handCounts, [5, 5, 5]);
  assert.ok(!JSON.stringify(v).includes(JSON.stringify(s.hands[0])));
});

// ---- Torpedó ----

test('torpedó: a véletlen flották szabályosak', () => {
  const { randomFleet, neighbors } = games.torpedo._internal;
  for (let i = 0; i < 50; i++) {
    const ships = randomFleet(Math.random);
    assert.deepStrictEqual(ships.map((s) => s.cells.length), [5, 4, 3, 3, 2]);
    ships.forEach((ship, a) => {
      ships.forEach((other, b) => {
        if (a === b) return;
        for (const cell of ship.cells) {
          assert.ok(!other.cells.includes(cell) && !neighbors(cell).some((n) => other.cells.includes(n)), 'hajók összeérnek');
        }
      });
    });
  }
});

test('torpedó: felkészülés, találat után újra lő, elsüllyesztés, győzelem', () => {
  const g = games.torpedo;
  const s = g.create({ names: names(2), rng: Math.random });
  assert.throws(() => g.act(s, 0, { type: 'shoot', x: 0, y: 0 }), /flottádat/);
  g.act(s, 0, { type: 'ready' });
  assert.deepStrictEqual(g.view(s, 0).waiting, [1]);
  g.act(s, 1, { type: 'shuffle' });
  g.act(s, 1, { type: 'ready' });
  assert.strictEqual(g.view(s, 0).phase, 'play');

  // a másik fél flottáját nem látod
  assert.strictEqual(g.view(s, 0).enemyShips, null);

  const enemyCells = s.fleets[1].flatMap((sh) => sh.cells);
  const water = [...Array(100).keys()].find((i) => !enemyCells.includes(i) && !enemyCells.some((e) => games.torpedo._internal.neighbors(e).includes(i)));
  g.act(s, 0, { type: 'shoot', x: water % 10, y: Math.floor(water / 10) });
  assert.strictEqual(s.turn, 1);
  assert.throws(() => g.act(s, 0, { type: 'shoot', x: 0, y: 0 }), /Nem te/);

  // Bence mindent eltalál
  const targets = s.fleets[0].flatMap((sh) => sh.cells);
  let sunkLogs = 0;
  for (const cell of targets) {
    const res = g.act(s, 1, { type: 'shoot', x: cell % 10, y: Math.floor(cell / 10) });
    if (res) sunkLogs++;
    if (!s.finished) assert.strictEqual(s.turn, 1);
  }
  assert.strictEqual(sunkLogs, 5);
  assert.deepStrictEqual(g.view(s, 0).winners, [1]);
  assert.ok(g.view(s, 0).enemyShips);
});

// ---- Dáma ----

function dama(pieces, turn = 0) {
  const g = games.dama;
  const s = g.create({ names: names(2) });
  s.board.fill(null);
  for (const [x, y, owner, king] of pieces) s.board[y * 8 + x] = { owner, king: !!king };
  s.turn = turn;
  return { g, s, at: (x, y) => y * 8 + x };
}

test('dáma: kezdőállás, csak előre lép', () => {
  const g = games.dama;
  const s = g.create({ names: names(2) });
  assert.deepStrictEqual(g.view(s).counts, [12, 12]);
  assert.strictEqual(g.view(s).moves.length, 7);
  assert.ok(g.view(s).moves.every((m) => m.to < m.from));
});

test('dáma: ütni kötelező, többes ütés folytatódik', () => {
  const { g, s, at } = dama([[1, 7, 0], [7, 7, 0], [2, 6, 1], [4, 4, 1], [6, 0, 1]]);
  assert.throws(() => g.act(s, 0, { type: 'move', from: at(7, 7), to: at(6, 6) }), /kötelező/);
  g.act(s, 0, { type: 'move', from: at(1, 7), to: at(3, 5) });
  assert.strictEqual(s.turn, 0); // folytatnia kell
  assert.ok(s.board[at(2, 6)]); // a leütött bábu a lánc végéig a táblán marad
  g.act(s, 0, { type: 'move', from: at(3, 5), to: at(5, 3) });
  assert.strictEqual(s.board[at(2, 6)], null);
  assert.strictEqual(s.board[at(4, 4)], null);
  assert.strictEqual(s.turn, 1);
});

test('dáma: beérve dáma lesz, a dáma távolról üt', () => {
  const { g, s, at } = dama([[1, 1, 0], [5, 5, 1], [7, 3, 1]]);
  const res = g.act(s, 0, { type: 'move', from: at(1, 1), to: at(0, 0) });
  assert.match(res.log[0], /dáma/);
  assert.strictEqual(s.board[at(0, 0)].king, true);
  g.act(s, 1, { type: 'move', from: at(7, 3), to: at(6, 4) });
  // a dáma az átló túlsó végéről üti le az (5,5)-öt
  const caps = g.view(s).moves.filter((m) => m.capture).map((m) => m.to);
  assert.deepStrictEqual(caps.sort(), [at(6, 6), at(7, 7)].sort());
  g.act(s, 0, { type: 'move', from: at(0, 0), to: at(7, 7) });
  assert.strictEqual(s.board[at(5, 5)], null);
});

test('dáma: aki nem tud lépni, veszít', () => {
  const { g, s, at } = dama([[5, 5, 0], [0, 7, 1]]);
  g.act(s, 0, { type: 'move', from: at(5, 5), to: at(4, 4) });
  const v = g.view(s);
  assert.strictEqual(v.finished, true);
  assert.deepStrictEqual(v.winners, [0]);
  assert.match(v.reason, /nem tud lépni/);
});

// ---- Pontok és dobozok ----

test('dobozok: bezárt doboz pontot ér és újra jöhet', () => {
  const g = games.dots;
  const s = g.create({ names: names(3) });
  assert.strictEqual(s.w, 6);
  g.act(s, 0, { type: 'line', dir: 'h', x: 0, y: 0 });
  g.act(s, 1, { type: 'line', dir: 'v', x: 0, y: 0 });
  g.act(s, 2, { type: 'line', dir: 'v', x: 1, y: 0 });
  assert.throws(() => g.act(s, 0, { type: 'line', dir: 'v', x: 1, y: 0 }), /már be van/);
  g.act(s, 0, { type: 'line', dir: 'h', x: 0, y: 1 });
  assert.strictEqual(s.boxes[0][0], 0);
  assert.strictEqual(s.turn, 0);
  assert.deepStrictEqual(g.view(s).scores, [1, 0, 0]);
});

test('dobozok: a játék végén a legtöbb doboz nyer', () => {
  const g = games.dots;
  const s = g.create({ names: names(2) });
  let guard = 0;
  while (!s.finished && guard++ < 1000) {
    const seat = s.turn;
    const h = s.hLines.flatMap((row, y) => row.map((v, x) => (v === -1 ? { dir: 'h', x, y } : null))).filter(Boolean);
    const v = s.vLines.flatMap((row, y) => row.map((val, x) => (val === -1 ? { dir: 'v', x, y } : null))).filter(Boolean);
    g.act(s, seat, { type: 'line', ...[...h, ...v][0] });
  }
  const view = g.view(s);
  assert.strictEqual(view.finished, true);
  assert.strictEqual(view.scores[0] + view.scores[1], 25);
  assert.ok(view.winners.length >= 1);
});
