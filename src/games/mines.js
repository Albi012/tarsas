// Aknapárbaj – saját kitalálású versengő aknakereső.
// Közös aknamező; felváltva felfedtek egy mezőt vagy megjelöltök egy aknát.

const SAFE_POINTS = 1;
const MINE_PENALTY = 3;
const FLAG_POINTS = 3;
const WRONG_FLAG = 2;

function setup(players) {
  return players === 2 ? { size: 10, mines: 18 } : { size: 12, mines: 26 };
}

function neighbors(cell, size) {
  const x = cell % size;
  const y = Math.floor(cell / size);
  const out = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < size && ny < size) out.push(ny * size + nx);
    }
  }
  return out;
}

// Az aknák csak az első felfedéskor kerülnek le, így az első mező és környéke biztosan üres.
function placeMines(state, first) {
  const banned = new Set([first, ...neighbors(first, state.size)]);
  const total = state.size * state.size;
  while (state.mines.size < state.mineCount) {
    const c = Math.floor(state.rng() * total);
    if (!banned.has(c)) state.mines.add(c);
  }
}

function countAround(state, cell) {
  return neighbors(cell, state.size).filter((n) => state.mines.has(n)).length;
}

// Felfedi a mezőt; ha 0 akna van körülötte, a szomszédokat is (mint az aknakeresőben).
function reveal(state, cell) {
  const stack = [cell];
  while (stack.length) {
    const c = stack.pop();
    if (state.cells[c]) continue;
    const n = countAround(state, c);
    state.cells[c] = { type: 'open', n };
    if (n === 0) stack.push(...neighbors(c, state.size).filter((x) => !state.cells[x]));
  }
}

function safeLeft(state) {
  return state.size * state.size - state.mineCount - state.cells.filter((c) => c && c.type === 'open').length;
}

module.exports = {
  id: 'mines',
  name: 'Aknapárbaj',
  emoji: '🚩',
  description: 'Saját találmány! Versengő aknakereső: fedj fel, jelölj aknát, és ne lépj bele!',
  original: true,
  minPlayers: 2,
  maxPlayers: 4,
  rules: [
    'Közös aknamezőn játszotok. Amikor sorra kerülsz, vagy felfedsz egy mezőt, vagy megjelölsz egy aknát.',
    `Biztonságos mező felfedése: +${SAFE_POINTS} pont. A szám azt mutatja, hány akna van körülötte (ha 0, a környéke is felfedődik).`,
    `Ha aknára lépsz: −${MINE_PENALTY} pont.`,
    `Jól megjelölt akna: +${FLAG_POINTS} pont, és újra jössz! Rossz jelölés: −${WRONG_FLAG} pont, és a mező felfedődik.`,
    'Az első felfedés mindig biztonságos.',
    'Ha minden biztonságos mező felfedődött, vagy minden akna előkerült, a legtöbb pontot gyűjtő nyer.',
  ],

  create({ names, rng }) {
    const { size, mines } = setup(names.length);
    return {
      names,
      rng,
      size,
      mineCount: mines,
      mines: new Set(),
      cells: Array(size * size).fill(null), // null | {type:'open', n} | {type:'boom', seat} | {type:'flag', seat}
      scores: names.map(() => 0),
      turn: 0,
      last: null,
      finished: false,
    };
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');
    if (state.turn !== seat) throw new Error('Nem te következel');
    const cell = Number(action.cell);
    if (!(cell >= 0 && cell < state.cells.length)) throw new Error('Nincs ilyen mező');
    if (state.cells[cell]) throw new Error('Ez a mező már ki van nyitva');
    if (!state.mines.size) placeMines(state, cell);
    const name = state.names[seat];
    let again = false;
    let log;

    if (action.type === 'reveal') {
      if (state.mines.has(cell)) {
        state.cells[cell] = { type: 'boom', seat };
        state.scores[seat] -= MINE_PENALTY;
        log = [`💥 ${name} aknára lépett! (−${MINE_PENALTY})`];
      } else {
        reveal(state, cell);
        state.scores[seat] += SAFE_POINTS;
      }
    } else if (action.type === 'flag') {
      if (state.mines.has(cell)) {
        state.cells[cell] = { type: 'flag', seat };
        state.scores[seat] += FLAG_POINTS;
        again = true;
      } else {
        reveal(state, cell);
        state.scores[seat] -= WRONG_FLAG;
        log = [`❌ ${name} rossz helyre tett zászlót (−${WRONG_FLAG})`];
      }
    } else {
      throw new Error('Ismeretlen lépés');
    }
    state.last = { cell, seat, type: action.type };

    const minesLeft = [...state.mines].filter((m) => !state.cells[m]).length;
    if (safeLeft(state) === 0 || minesLeft === 0) {
      state.finished = true;
    } else if (!again) {
      state.turn = (seat + 1) % state.names.length;
    }
    return { log };
  },

  view(state) {
    const best = Math.max(...state.scores);
    return {
      size: state.size,
      mineCount: state.mineCount,
      cells: state.cells,
      // a játék végén a maradék aknák is látszanak
      mines: state.finished ? [...state.mines] : [],
      minesLeft: state.mines.size ? [...state.mines].filter((m) => !state.cells[m]).length : state.mineCount,
      scores: state.scores,
      last: state.last,
      turn: state.finished ? null : state.turn,
      finished: state.finished,
      winners: state.finished ? state.scores.map((s, i) => (s === best ? i : -1)).filter((i) => i !== -1) : [],
    };
  },
};
