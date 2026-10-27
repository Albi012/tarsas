// Tízes – laprakós játék.
// Számlapokat (1-9) raktok a táblára. Elfoglalod az ellenfél szomszédos lapját, ha
//   - a lerakott lappal együtt pont 10 (pl. 3 mellé 7), vagy
//   - két ellenfél-szomszéd összege pont a lerakott lap (pl. 3 és 4 közé 7).

const HAND = 3;
const COPIES = 5;

function sizeFor(players) {
  return players === 2 ? 5 : 6;
}

function shuffle(cards, rng) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function neighbors(cell, size) {
  const x = cell % size;
  const y = Math.floor(cell / size);
  const out = [];
  if (x > 0) out.push(cell - 1);
  if (x < size - 1) out.push(cell + 1);
  if (y > 0) out.push(cell - size);
  if (y < size - 1) out.push(cell + size);
  return out;
}

module.exports = {
  id: 'tens',
  name: 'Tízes',
  emoji: '🔟',
  description: 'Rakj számokat a táblára, és foglald el a többiek lapjait tízesekkel!',
  minPlayers: 2,
  maxPlayers: 4,
  rules: [
    `Mindenkinek ${HAND} számlapja van (1–9), ezeket csak te látod. Lerakás után húzol egy újat.`,
    'Felváltva raktok le egy lapot egy üres mezőre (2 főnél 5×5, többnél 6×6 a tábla).',
    'Tízes: ha a lerakott lap és egy szomszédos ellenfél-lap összege pont 10, elfoglalod azt a lapot.',
    'Összeg: ha két szomszédos ellenfél-lap összege pont a lerakott lap értéke, mindkettőt elfoglalod.',
    'Szomszéd csak vízszintesen vagy függőlegesen lehet. Az elfoglalt lap a te színedre vált.',
    'Ha betelik a tábla, az nyer, akinek a legtöbb lapja van rajta.',
  ],

  create({ names, rng }) {
    const size = sizeFor(names.length);
    const bag = [];
    for (let v = 1; v <= 9; v++) for (let k = 0; k < COPIES; k++) bag.push(v);
    shuffle(bag, rng);
    return {
      names,
      size,
      bag,
      hands: names.map(() => bag.splice(0, HAND)),
      board: Array(size * size).fill(null), // { value, owner }
      turn: 0,
      lastMove: null,
      finished: false,
    };
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');
    if (state.turn !== seat) throw new Error('Nem te következel');
    if (action.type !== 'place') throw new Error('Ismeretlen lépés');
    const hand = state.hands[seat];
    const tile = Number(action.tile);
    const cell = Number(action.cell);
    if (!(tile >= 0 && tile < hand.length)) throw new Error('Nincs ilyen lapod');
    if (!(cell >= 0 && cell < state.board.length) || state.board[cell]) throw new Error('Ez a mező foglalt');

    const value = hand.splice(tile, 1)[0];
    if (state.bag.length) hand.push(state.bag.pop());
    state.board[cell] = { value, owner: seat };

    const enemies = neighbors(cell, state.size).filter((n) => state.board[n] && state.board[n].owner !== seat);
    const captured = new Set(enemies.filter((n) => state.board[n].value + value === 10));
    for (let a = 0; a < enemies.length; a++) {
      for (let b = a + 1; b < enemies.length; b++) {
        if (state.board[enemies[a]].value + state.board[enemies[b]].value === value) {
          captured.add(enemies[a]);
          captured.add(enemies[b]);
        }
      }
    }
    for (const c of captured) state.board[c].owner = seat;
    state.lastMove = { cell, captured: [...captured] };

    if (state.board.every(Boolean)) state.finished = true;
    else state.turn = (seat + 1) % state.names.length;
    return captured.size ? { log: [`${state.names[seat]} elfoglalt ${captured.size} lapot!`] } : undefined;
  },

  view(state, seat) {
    const counts = state.names.map((_, s) => state.board.filter((t) => t && t.owner === s).length);
    const best = Math.max(...counts);
    return {
      size: state.size,
      board: state.board,
      hand: seat === null ? [] : state.hands[seat],
      bagCount: state.bag.length,
      counts,
      lastMove: state.lastMove,
      turn: state.finished ? null : state.turn,
      finished: state.finished,
      winners: state.finished ? counts.map((c, i) => (c === best ? i : -1)).filter((i) => i !== -1) : [],
    };
  },
};
