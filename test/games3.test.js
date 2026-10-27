const test = require('node:test');
const assert = require('node:assert');
const { games } = require('../src/games');

const names = (n) => ['Anna', 'Bence', 'Cili', 'Dani'].slice(0, n);
// a megadott értékeket adja vissza sorban (0..1), utána mindig 0-t
const seq = (...values) => () => (values.length ? values.shift() : 0);

// ---- Lufi ----

test('lufi: pumpálás pontot ér, kidurranáskor elvész a kör pontja', () => {
  const g = games.balloon;
  const s = g.create({ names: names(2), rng: Math.random });
  s.capacity = 6;
  g.act(s, 0, { type: 'pump', count: 3 }); // levegő 3
  assert.throws(() => g.act(s, 0, { type: 'pump', count: 1 }), /Nem te/);
  assert.throws(() => g.act(s, 1, { type: 'pump', count: 4 }), /1, 2 vagy 3/);
  g.act(s, 1, { type: 'pump', count: 2 }); // levegő 5
  const res = g.act(s, 0, { type: 'pump', count: 2 }); // 6-nál kidurran
  assert.match(res.log[0], /PUKK/);
  assert.deepStrictEqual(s.scores, [0, 2]);
  assert.strictEqual(s.round, 2);
  assert.strictEqual(s.turn, 0); // aki kidurrantotta, kezdi a következőt
  assert.strictEqual(s.air, 0);
});

test('lufi: aki kiszáll, megtartja a pontjait; ha mindenki kiszállt, vége a körnek', () => {
  const g = games.balloon;
  const s = g.create({ names: names(3), rng: Math.random });
  s.capacity = 100;
  g.act(s, 0, { type: 'pump', count: 3 });
  g.act(s, 1, { type: 'leave' });
  g.act(s, 2, { type: 'pump', count: 2 });
  assert.strictEqual(s.turn, 0); // Bence kimarad
  g.act(s, 0, { type: 'leave' });
  assert.strictEqual(s.turn, 2);
  g.act(s, 2, { type: 'pump', count: 1 });
  assert.strictEqual(s.turn, 2); // egyedül maradt
  g.act(s, 2, { type: 'leave' });
  assert.deepStrictEqual(s.scores, [3, 0, 3]);
  assert.strictEqual(s.round, 2);
});

test('lufi: 5 kör után vége', () => {
  const g = games.balloon;
  const s = g.create({ names: names(2), rng: Math.random });
  for (let r = 0; r < 5; r++) {
    g.act(s, s.turn, { type: 'leave' });
    g.act(s, s.turn, { type: 'leave' });
  }
  assert.strictEqual(g.view(s).finished, true);
});

// ---- Kincsásók ----

test('kincsásók: a távolságot csak az ásó látja, kincs találás', () => {
  const g = games.digger;
  const s = g.create({ names: names(2), rng: Math.random });
  s.treasures = [0, 80, 40]; // 9x9: (0,0), (8,8), (4,4)
  g.act(s, 0, { type: 'dig', cell: 2 }); // (2,0): legközelebbi (0,0) → 2
  assert.strictEqual(g.view(s, 0).digs[0].distance, 2);
  assert.strictEqual(g.view(s, 1).digs[0].distance, undefined);
  assert.throws(() => g.act(s, 1, { type: 'dig', cell: 2 }), /már ástak/);
  const res = g.act(s, 1, { type: 'dig', cell: 0 });
  assert.match(res.log[0], /kincset/);
  // Anna száma frissül: most a (4,4) a legközelebbi → 2 + 4 = 6
  assert.strictEqual(g.view(s, 0).digs.find((d) => d.cell === 2).distance, 6);
  g.act(s, 0, { type: 'dig', cell: 40 });
  g.act(s, 1, { type: 'dig', cell: 80 });
  const v = g.view(s, 0);
  assert.strictEqual(v.finished, true);
  assert.deepStrictEqual(v.counts, [1, 2]);
  assert.deepStrictEqual(v.winners, [1]);
});

// ---- Tízes ----

test('tízes: tízes és összeg szabály szerinti foglalás', () => {
  const g = games.tens;
  const s = g.create({ names: names(2), rng: Math.random });
  const size = s.size; // 5
  s.board[0] = { value: 3, owner: 1 };
  s.board[2] = { value: 4, owner: 1 };
  s.board[size + 1] = { value: 2, owner: 0 };
  s.hands[0] = [7, 1, 1];
  // a (1,0)-ra tett 7: bal szomszéd 3 → 3+7=10 → elfoglal; 3+4=7 → mindkettőt
  const res = g.act(s, 0, { type: 'place', tile: 0, cell: 1 });
  assert.match(res.log[0], /2 lapot/);
  assert.strictEqual(s.board[0].owner, 0);
  assert.strictEqual(s.board[2].owner, 0);
  assert.strictEqual(s.hands[0].length, 3); // húzott újat
  assert.throws(() => g.act(s, 1, { type: 'place', tile: 0, cell: 1 }), /foglalt/);
});

test('tízes: saját lapot nem foglal, a kezet csak a gazdája látja, tele táblánál vége', () => {
  const g = games.tens;
  const s = g.create({ names: names(2), rng: Math.random });
  s.board[0] = { value: 3, owner: 0 };
  s.hands[0] = [7, 7, 7];
  g.act(s, 0, { type: 'place', tile: 0, cell: 1 });
  assert.strictEqual(s.board[0].owner, 0);
  assert.deepStrictEqual(g.view(s, 1).hand, s.hands[1]);
  assert.ok(!('hands' in g.view(s, 1)));
  while (!s.finished) {
    const cell = s.board.findIndex((c) => !c);
    g.act(s, s.turn, { type: 'place', tile: 0, cell });
  }
  const v = g.view(s, 0);
  assert.strictEqual(v.counts[0] + v.counts[1], 25);
});

// ---- Széffeltörők ----

test('széf: a nyomok mind igazak', () => {
  const { makeClues } = games.safe._internal;
  const code = [3, 1, 6, 3];
  const clues = makeClues(code, Math.random);
  assert.ok(clues.includes('Az első számjegy páratlan.'));
  assert.ok(clues.includes('A harmadik számjegy páros.'));
  assert.ok(clues.includes('Az első számjegy ugyanannyi, mint a negyedik.'));
  assert.ok(clues.includes('A második számjegy kisebb, mint a harmadik.'));
  assert.ok(clues.includes('A számjegyek összege 13.'));
  assert.ok(clues.includes('Van olyan számjegy, ami többször is szerepel.'));
  for (const c of clues) {
    const m = c.match(/^Van benne (\d)/);
    if (m) assert.ok(code.includes(Number(m[1])), c);
    const n = c.match(/^Nincs benne (\d)/);
    if (n) assert.ok(!code.includes(Number(n[1])), c);
  }
});

test('széf: pontozás (● jó helyen, ○ rossz helyen)', () => {
  const { score } = games.safe;
  assert.deepStrictEqual(score([1, 2, 3, 4], [1, 2, 3, 4]), { exact: 4, near: 0 });
  assert.deepStrictEqual(score([1, 2, 3, 4], [4, 3, 2, 1]), { exact: 0, near: 4 });
  assert.deepStrictEqual(score([1, 1, 2, 2], [1, 2, 1, 1]), { exact: 1, near: 2 });
  assert.deepStrictEqual(score([5, 5, 5, 5], [5, 6, 6, 6]), { exact: 1, near: 0 });
});

test('széf: sorban tippelnek, közös győzelem vagy riasztó', () => {
  const g = games.safe;
  const s = g.create({ names: names(3), rng: Math.random });
  assert.strictEqual(g.view(s, 0).myClues.length, 2);
  assert.notDeepStrictEqual(g.view(s, 0).myClues, g.view(s, 1).myClues);
  assert.strictEqual(g.view(s, 0).code, null);
  assert.throws(() => g.act(s, 0, { type: 'guess', code: [1, 2, 7, 1] }), /számjegyet/);
  g.act(s, 0, { type: 'guess', code: [1, 1, 1, 1].map((d, i) => (s.code[i] === 1 ? 2 : 1)) });
  assert.strictEqual(s.turn, 1);
  g.act(s, 1, { type: 'guess', code: s.code });
  const v = g.view(s, 2);
  assert.strictEqual(v.finished, true);
  assert.deepStrictEqual(v.winners, [0, 1, 2]);
  assert.match(v.resultText, /Kinyitottátok/);

  const s2 = g.create({ names: names(1), rng: Math.random });
  assert.strictEqual(s2.clues[0].length, 4);
  const wrong = s2.code.map((d) => (d === 1 ? 2 : 1));
  for (let i = 0; i < 8; i++) g.act(s2, 0, { type: 'guess', code: wrong });
  assert.strictEqual(g.view(s2, 0).finished, true);
  assert.deepStrictEqual(g.view(s2, 0).winners, []);
  assert.match(g.view(s2, 0).resultText, /riasztó/);
});

// ---- Aknapárbaj ----

test('aknapárbaj: az első felfedés biztonságos, pontozás és zászló', () => {
  const g = games.mines;
  const s = g.create({ names: names(2), rng: Math.random });
  g.act(s, 0, { type: 'reveal', cell: 55 });
  assert.strictEqual(s.cells[55].type, 'open');
  assert.strictEqual(s.cells[55].n, 0);
  assert.strictEqual(s.scores[0], 1);
  assert.strictEqual(s.mines.size, 18);
  assert.strictEqual(s.turn, 1);

  const mine = [...s.mines][0];
  g.act(s, 1, { type: 'flag', cell: mine });
  assert.strictEqual(s.scores[1], 3);
  assert.strictEqual(s.turn, 1); // jó zászló → újra jön

  const safe = s.cells.findIndex((c, i) => !c && !s.mines.has(i));
  const res = g.act(s, 1, { type: 'flag', cell: safe });
  assert.match(res.log[0], /rossz helyre/);
  assert.strictEqual(s.scores[1], 1);
  assert.strictEqual(s.cells[safe].type, 'open');

  const mine2 = [...s.mines].find((m) => !s.cells[m]);
  g.act(s, 0, { type: 'reveal', cell: mine2 });
  assert.strictEqual(s.scores[0], -2);
  assert.throws(() => g.act(s, 1, { type: 'reveal', cell: mine2 }), /már ki van nyitva/);
});

test('aknapárbaj: ha minden akna előkerül, vége', () => {
  const g = games.mines;
  const s = g.create({ names: names(2), rng: Math.random });
  g.act(s, 0, { type: 'reveal', cell: 0 });
  for (const m of s.mines) g.act(s, s.turn, { type: 'flag', cell: m });
  const v = g.view(s);
  assert.strictEqual(v.finished, true);
  assert.strictEqual(v.minesLeft, 0);
});
