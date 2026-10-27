// Kincsásók – dedukciós verseny.
// A térképen elrejtett kincsek vannak. Aki ás, csak ő tudja meg, milyen messze van
// a legközelebbi még meg nem talált kincs (lépésben, átló nélkül). A gödröket mindenki látja.

function setup(players) {
  return players <= 3 ? { size: 9, treasures: 3 } : { size: 10, treasures: 5 };
}

function distance(a, b, size) {
  return Math.abs((a % size) - (b % size)) + Math.abs(Math.floor(a / size) - Math.floor(b / size));
}

function nearest(state, cell) {
  const left = state.treasures.filter((t) => !state.found.some((f) => f.cell === t));
  if (!left.length) return null;
  return Math.min(...left.map((t) => distance(cell, t, state.size)));
}

module.exports = {
  id: 'digger',
  name: 'Kincsásók',
  emoji: '⛏️',
  description: 'Ásd ki a rejtett kincseket – a nyomokat csak te látod, a gödreidet mindenki.',
  minPlayers: 2,
  maxPlayers: 6,
  rules: [
    '2–3 játékosnál 3, 4–6 játékosnál 5 kincs van elrejtve a térképen.',
    'Felváltva ástok egy-egy mezőn. Ha kincset találsz, az a tiéd.',
    'Ha nem, csak TE látod, hány lépésre van onnan a legközelebbi még el nem vitt kincs (vízszintesen + függőlegesen számolva).',
    'A számaid mindig frissülnek: ha valaki elvisz egy kincset, a következő legközelebbihez mérnek.',
    'A többiek gödreit látod, de a számukat nem – figyeld, hová ásnak!',
    'Ha minden kincs gazdára talált, az nyer, akinek a legtöbb van.',
  ],

  create({ names, rng }) {
    const { size, treasures } = setup(names.length);
    const cells = [];
    while (cells.length < treasures) {
      const c = Math.floor(rng() * size * size);
      if (!cells.includes(c)) cells.push(c);
    }
    return { names, size, treasures: cells, found: [], digs: {}, turn: 0, lastDig: null, finished: false };
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');
    if (state.turn !== seat) throw new Error('Nem te következel');
    if (action.type !== 'dig') throw new Error('Ismeretlen lépés');
    const cell = Number(action.cell);
    if (!(cell >= 0 && cell < state.size * state.size)) throw new Error('Nincs ilyen mező');
    if (state.digs[cell] !== undefined) throw new Error('Itt már ástak');
    state.digs[cell] = seat;
    state.lastDig = cell;

    if (state.treasures.includes(cell)) {
      state.found.push({ cell, seat });
      const log = [`💎 ${state.names[seat]} kincset talált! (${state.found.length}/${state.treasures.length})`];
      if (state.found.length === state.treasures.length) {
        state.finished = true;
        return { log };
      }
      state.turn = (seat + 1) % state.names.length;
      return { log };
    }
    state.turn = (seat + 1) % state.names.length;
    return undefined;
  },

  view(state, seat) {
    const counts = state.names.map((_, s) => state.found.filter((f) => f.seat === s).length);
    const best = Math.max(...counts);
    const digs = Object.entries(state.digs).map(([cell, who]) => {
      const c = Number(cell);
      const mine = who === seat;
      return { cell: c, seat: who, distance: mine || state.finished ? nearest(state, c) : undefined };
    });
    return {
      size: state.size,
      total: state.treasures.length,
      digs,
      found: state.found,
      hidden: state.finished ? state.treasures : [],
      counts,
      lastDig: state.lastDig,
      turn: state.finished ? null : state.turn,
      finished: state.finished,
      winners: state.finished ? counts.map((c, i) => (c === best ? i : -1)).filter((i) => i !== -1) : [],
    };
  },

  _internal: { nearest },
};
