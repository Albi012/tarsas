const test = require('node:test');
const assert = require('node:assert');
const Game = require('../src/games/ludo')._internal;

// determinisztikus kocka: a megadott dobásokat adja vissza sorban
function dice(...values) {
  return () => (values.shift() - 1) / 6;
}

test('2 játékosnál egymással szemben ülnek', () => {
  assert.deepStrictEqual(Game.createGame(2).colors, [0, 2]);
  assert.deepStrictEqual(Game.createGame(4).colors, [0, 1, 2, 3]);
});

test('házból csak hatossal lehet kijönni, és háromszor lehet próbálkozni', () => {
  const g = Game.createGame(2, dice(1, 2, 3));
  Game.roll(g);
  assert.strictEqual(g.rolled, false); // dobhat újra
  Game.roll(g);
  Game.roll(g);
  assert.strictEqual(g.pendingPass, true);
  Game.passIfNoMoves(g);
  assert.strictEqual(Game.currentColor(g), 2);
});

test('hatos után kijön a bábu és újra dobhat', () => {
  const g = Game.createGame(2, dice(6, 4));
  Game.roll(g);
  assert.deepStrictEqual(Game.legalMoves(g), [0, 1, 2, 3]);
  Game.move(g, 0);
  assert.strictEqual(g.pieces[0][0], 0);
  assert.strictEqual(Game.currentColor(g), 0);
  Game.roll(g);
  Game.move(g, 0);
  assert.strictEqual(g.pieces[0][0], 4);
  assert.strictEqual(Game.currentColor(g), 2);
});

test('ütés: az ellenfél bábuja visszakerül a házba', () => {
  const g = Game.createGame(2, dice(3));
  g.pieces[0][0] = 17; // abszolút 17
  g.pieces[2][0] = 0; // zöld start = abszolút 20
  Game.roll(g);
  Game.move(g, 0);
  assert.strictEqual(g.pieces[0][0], 20);
  assert.strictEqual(g.pieces[2][0], -1);
  assert.strictEqual(g.lastEvent.captured, 2);
});

test('saját bábura nem lehet lépni, a célon túl sem', () => {
  const g = Game.createGame(2, dice(2));
  g.pieces[0] = [5, 7, 42, -1];
  Game.roll(g);
  assert.deepStrictEqual(Game.legalMoves(g), [1]);
});

test('aki mind a 4 bábut beviszi, nyer; 2 játékosnál vége a játéknak', () => {
  const g = Game.createGame(2, dice(1));
  g.pieces[0] = [43, 42, 41, 39];
  Game.roll(g);
  Game.move(g, 3);
  assert.strictEqual(g.finished, true);
  assert.deepStrictEqual(g.winners, [0, 2]);
});

test('célban beragadt bábuk mellett is 3-szor dobhat', () => {
  const g = Game.createGame(2, dice(1));
  g.pieces[0] = [43, -1, -1, -1];
  Game.roll(g);
  assert.strictEqual(g.rolled, false);
});
