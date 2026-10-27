const test = require('node:test');
const assert = require('node:assert');
const { games, catalog } = require('../src/games');

const names = (n) => ['Anna', 'Bence', 'Cili', 'Dani', 'Emma', 'Feri'].slice(0, n);

// determinisztikus "véletlen": a megadott kockadobásokat adja vissza sorban, utána 1-eseket
function dice(...values) {
  return () => ((values.length ? values.shift() : 1) - 1) / 6;
}

test('legalább 5 játék van, és mind teljes', () => {
  assert.ok(catalog().length >= 5);
  for (const g of Object.values(games)) {
    for (const key of ['id', 'name', 'emoji', 'description', 'rules', 'minPlayers', 'maxPlayers', 'create', 'act', 'view']) {
      assert.ok(g[key] !== undefined, `${g.id}: hiányzik ${key}`);
    }
  }
  assert.ok(catalog().some((g) => g.original), 'kell saját találmány');
});

test('amőba: 5 egy sorban nyer, foglalt mezőre nem lehet tenni', () => {
  const g = games.amoba;
  const s = g.create({ names: names(2) });
  for (let i = 0; i < 4; i++) {
    g.act(s, 0, { type: 'place', x: i, y: 0 });
    g.act(s, 1, { type: 'place', x: i, y: 1 });
  }
  assert.throws(() => g.act(s, 0, { type: 'place', x: 0, y: 1 }), /foglalt/);
  assert.throws(() => g.act(s, 1, { type: 'place', x: 9, y: 9 }), /Nem te/);
  g.act(s, 0, { type: 'place', x: 4, y: 0 });
  const v = g.view(s);
  assert.strictEqual(v.finished, true);
  assert.deepStrictEqual(v.winners, [0]);
  assert.strictEqual(v.winLine.length, 5);
});

test('négy a sorban: a korong leesik, átlós nyerés', () => {
  const g = games.connect4;
  const s = g.create({ names: names(2) });
  const play = (seat, x) => g.act(s, seat, { type: 'place', x });
  play(0, 0); // 0 a (0,5)-ön
  assert.strictEqual(s.board[5 * 7 + 0], 0);
  play(1, 1); play(0, 1); // 0 a (1,4)-en
  play(1, 2); play(0, 3); play(1, 2); play(0, 2); // 0 a (2,3)-on
  play(1, 3); play(0, 3); play(1, 6); play(0, 3); // 0 a (3,2)-n
  assert.strictEqual(g.view(s).finished, true);
  assert.deepStrictEqual(g.view(s).winners, [0]);
});

test('négy a sorban: teli oszlopba nem lehet dobni', () => {
  const g = games.connect4;
  const s = g.create({ names: names(2) });
  for (let i = 0; i < 6; i++) g.act(s, i % 2, { type: 'place', x: 0 });
  assert.throws(() => g.act(s, 0, { type: 'place', x: 0 }), /megtelt/);
});

test('malom: malom után le kell venni egy bábut', () => {
  const g = games.malom;
  const s = g.create({ names: names(2) });
  g.act(s, 0, { type: 'place', at: 0 });
  g.act(s, 1, { type: 'place', at: 9 });
  g.act(s, 0, { type: 'place', at: 1 });
  g.act(s, 1, { type: 'place', at: 10 });
  const res = g.act(s, 0, { type: 'place', at: 2 });
  assert.match(res.log[0], /malmot/);
  assert.strictEqual(g.view(s).phase, 'remove');
  assert.throws(() => g.act(s, 0, { type: 'place', at: 5 }), /vegyél le/);
  assert.throws(() => g.act(s, 0, { type: 'remove', at: 0 }), /nem veheted/);
  g.act(s, 0, { type: 'remove', at: 9 });
  assert.strictEqual(s.board[9], -1);
  assert.strictEqual(g.view(s).turn, 1);
});

test('malom: mozgatás csak szomszédos pontra, 2 bábunál vége', () => {
  const g = games.malom;
  const s = g.create({ names: names(2) });
  s.toPlace = [0, 0];
  s.board.fill(-1);
  [0, 1, 14, 20].forEach((p) => (s.board[p] = 0));
  [21, 22, 4].forEach((p) => (s.board[p] = 1));
  assert.throws(() => g.act(s, 0, { type: 'move', from: 14, to: 5 }), /szomszédos/);
  // malom → az ellenfélnek 2 bábuja marad → vége
  g.act(s, 0, { type: 'move', from: 14, to: 2 });
  g.act(s, 0, { type: 'remove', at: 4 });
  assert.strictEqual(g.view(s).finished, true);
  assert.deepStrictEqual(g.view(s).winners, [0]);
});

test('kockapóker: pontozás', () => {
  const { score } = games.yahtzee;
  assert.strictEqual(score('threes', [3, 3, 1, 3, 6]), 9);
  assert.strictEqual(score('three', [3, 3, 1, 3, 6]), 16);
  assert.strictEqual(score('four', [3, 3, 1, 3, 6]), 0);
  assert.strictEqual(score('full', [2, 2, 5, 5, 5]), 25);
  assert.strictEqual(score('full', [5, 5, 5, 5, 5]), 0);
  assert.strictEqual(score('small', [1, 2, 3, 4, 6]), 30);
  assert.strictEqual(score('small', [1, 2, 3, 5, 6]), 0);
  assert.strictEqual(score('large', [2, 3, 4, 5, 6]), 40);
  assert.strictEqual(score('yahtzee', [4, 4, 4, 4, 4]), 50);
  assert.strictEqual(score('chance', [1, 2, 3, 4, 6]), 16);
});

test('kockapóker: megtartás, 3 dobás, beírás után a következő jön', () => {
  const g = games.yahtzee;
  const s = g.create({ names: names(2), rng: dice(6, 6, 2, 3, 4, 1, 1, 1, 6, 6, 6) });
  assert.throws(() => g.act(s, 0, { type: 'score', category: 'chance' }), /Előbb dobj/);
  g.act(s, 0, { type: 'roll' });
  assert.deepStrictEqual(s.dice, [6, 6, 2, 3, 4]);
  g.act(s, 0, { type: 'hold', die: 0 });
  g.act(s, 0, { type: 'hold', die: 1 });
  g.act(s, 0, { type: 'roll' });
  assert.deepStrictEqual(s.dice, [6, 6, 1, 1, 1]);
  g.act(s, 0, { type: 'roll' });
  assert.deepStrictEqual(s.dice, [6, 6, 6, 6, 6]);
  assert.throws(() => g.act(s, 0, { type: 'roll' }), /Nincs több/);
  const res = g.act(s, 0, { type: 'score', category: 'yahtzee' });
  assert.match(res.log[0], /KOCKAPÓKER/);
  assert.strictEqual(s.sheets[0].yahtzee, 50);
  assert.strictEqual(g.view(s).turn, 1);
  assert.deepStrictEqual(s.held, [false, false, false, false, false]);
});

test('kockapóker: felső bónusz és a játék vége', () => {
  const g = games.yahtzee;
  const s = g.create({ names: names(1), rng: () => 0.99 }); // mindig hatos
  // a felső rész pont 63
  Object.assign(s.sheets[0], { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
  for (const cat of g.categories.filter((c) => !(c.id in s.sheets[0]))) {
    g.act(s, 0, { type: 'roll' });
    g.act(s, 0, { type: 'score', category: cat.id });
  }
  const v = g.view(s);
  assert.strictEqual(v.finished, true);
  assert.strictEqual(v.totals[0].bonus, 35);
  assert.strictEqual(v.totals[0].total, 63 + 35 + 30 + 30 + 0 + 0 + 0 + 50 + 30);
  assert.deepStrictEqual(v.winners, [0]);
});

test('tolvajok: titkos választás, elfogás, összeveszés, egyedüli rablás', () => {
  const g = games.thieves;
  const s = g.create({ names: names(4), rng: () => 0 }); // minden ház +1/kör
  assert.strictEqual(s.houses.length, 5);
  assert.deepStrictEqual(s.houses, [1, 1, 1, 1, 1]);
  s.houses = [10, 4, 7, 1, 1];
  assert.strictEqual(s.police, 0);

  g.act(s, 1, { type: 'choose', house: 0 });
  // más nem látja, hova ment Bence
  assert.strictEqual(g.view(s, 2).myChoice, null);
  assert.strictEqual(g.view(s, 1).myChoice, 0);
  assert.deepStrictEqual(g.view(s, 2).waiting, [0, 2, 3]);

  g.act(s, 2, { type: 'choose', house: 0 }); // Bence és Cili összevesz a 10-esen
  g.act(s, 3, { type: 'choose', house: 2 }); // Dani egyedül: 7-et visz
  const res = g.act(s, 0, { type: 'choose', house: 1 }); // a rendőr rossz helyen les

  assert.deepStrictEqual(s.coins, [6, 5, 5, 12]);
  assert.ok(res.log.some((l) => /Összevesztek/.test(l)));
  // új kör: a zsákmány gyűlik, a kirabolt ház újrakezdi, új rendőr
  assert.deepStrictEqual(s.houses, [11, 5, 1, 2, 2]);
  assert.strictEqual(s.police, 1);
  assert.strictEqual(s.round, 2);

  // Bence a rendőr, Dani belesétál
  g.act(s, 0, { type: 'choose', house: 0 });
  g.act(s, 2, { type: 'choose', house: 3 });
  g.act(s, 3, { type: 'choose', house: 4 });
  g.act(s, 1, { type: 'choose', house: 4 });
  assert.deepStrictEqual(s.coins, [17, 8, 7, 9]);
});

test('tolvajok: a játék a megadott kör után véget ér', () => {
  const g = games.thieves;
  const s = g.create({ names: names(2), rng: () => 0 });
  for (let r = 0; r < s.rounds; r++) {
    g.act(s, 0, { type: 'choose', house: 0 });
    g.act(s, 1, { type: 'choose', house: 1 });
  }
  const v = g.view(s, 0);
  assert.strictEqual(v.finished, true);
  assert.strictEqual(v.winners.length >= 1, true);
  assert.throws(() => g.act(s, 0, { type: 'choose', house: 0 }), /véget/);
});
