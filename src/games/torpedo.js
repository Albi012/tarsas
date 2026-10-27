// Torpedó (hajós csata), 10x10-es tábla. A hajók nem érhetnek egymáshoz, átlósan sem.

const SIZE = 10;
const SHIPS = [5, 4, 3, 3, 2];

function neighbors(i) {
  const x = i % SIZE;
  const y = Math.floor(i / SIZE);
  const out = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) out.push(ny * SIZE + nx);
    }
  }
  return out;
}

function randomFleet(rng) {
  for (;;) {
    const blocked = new Set();
    const ships = [];
    let ok = true;
    for (const len of SHIPS) {
      let placed = false;
      for (let attempt = 0; attempt < 200 && !placed; attempt++) {
        const horizontal = rng() < 0.5;
        const x = Math.floor(rng() * (horizontal ? SIZE - len + 1 : SIZE));
        const y = Math.floor(rng() * (horizontal ? SIZE : SIZE - len + 1));
        const cells = Array.from({ length: len }, (_, k) => (horizontal ? y * SIZE + x + k : (y + k) * SIZE + x));
        if (cells.some((c) => blocked.has(c))) continue;
        for (const c of cells) {
          blocked.add(c);
          neighbors(c).forEach((n) => blocked.add(n));
        }
        ships.push({ cells, hits: [] });
        placed = true;
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (ok) return ships;
  }
}

function isSunk(ship) {
  return ship.hits.length === ship.cells.length;
}

module.exports = {
  id: 'torpedo',
  name: 'Torpedó',
  emoji: '🚢',
  description: 'Keresd meg és süllyeszd el az ellenfél rejtett flottáját!',
  minPlayers: 2,
  maxPlayers: 2,
  rules: [
    `Mindkét játékosnak van egy rejtett flottája egy ${SIZE}×${SIZE}-es táblán: ${SHIPS.join(', ')} mező hosszú hajók. A hajók nem érnek egymáshoz.`,
    'A játék elején addig sorsolhatod újra a flottád elrendezését, amíg tetszik, aztán nyomd meg a „Kész” gombot.',
    'Felváltva lőtök az ellenfél táblájára. Ha talált, újra lőhetsz.',
    'A teljesen eltalált hajó elsüllyed, és körülötte a mezők automatikusan bejelölődnek (ott nem lehet hajó).',
    'Az nyer, aki elsőként elsüllyeszti az ellenfél összes hajóját.',
  ],

  create({ names, rng }) {
    return {
      names,
      rng,
      fleets: [randomFleet(rng), randomFleet(rng)],
      shots: [{}, {}], // shots[seat][mező] = 'hit' | 'miss' (seat lövései az ellenfél tábláján)
      ready: [false, false],
      phase: 'setup',
      turn: 0,
      lastShot: null,
      finished: false,
      winner: null,
    };
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');

    if (state.phase === 'setup') {
      if (state.ready[seat]) throw new Error('Már kész vagy, várj az ellenfélre');
      if (action.type === 'shuffle') {
        state.fleets[seat] = randomFleet(state.rng);
        return undefined;
      }
      if (action.type === 'ready') {
        state.ready[seat] = true;
        if (state.ready.every(Boolean)) {
          state.phase = 'play';
          return { log: ['⚓ Mindkét flotta kész – kezdődik a csata!'] };
        }
        return undefined;
      }
      throw new Error('Most a flottádat rendezed');
    }

    if (action.type !== 'shoot') throw new Error('Ismeretlen lépés');
    if (state.turn !== seat) throw new Error('Nem te következel');
    const x = Number(action.x);
    const y = Number(action.y);
    if (!(x >= 0 && x < SIZE && y >= 0 && y < SIZE)) throw new Error('Érvénytelen mező');
    const cell = y * SIZE + x;
    const shots = state.shots[seat];
    if (shots[cell]) throw new Error('Ide már lőttél');

    const enemy = state.fleets[1 - seat];
    const ship = enemy.find((s) => s.cells.includes(cell));
    state.lastShot = { seat, cell };
    if (!ship) {
      shots[cell] = 'miss';
      state.turn = 1 - seat;
      return undefined;
    }

    shots[cell] = 'hit';
    ship.hits.push(cell);
    if (!isSunk(ship)) return undefined; // talált → újra lőhet

    // elsüllyedt: a környezete biztosan üres
    for (const c of ship.cells) for (const n of neighbors(c)) if (!shots[n]) shots[n] = 'auto';
    const log = [`💥 ${state.names[seat]} elsüllyesztett egy ${ship.cells.length} hosszú hajót!`];
    if (enemy.every(isSunk)) {
      state.finished = true;
      state.winner = seat;
    }
    return { log };
  },

  view(state, seat) {
    const me = seat === null ? 0 : seat;
    const enemy = 1 - me;
    const sunkEnemy = state.fleets[enemy].filter(isSunk).map((s) => s.cells);
    return {
      size: SIZE,
      phase: state.phase,
      ready: state.ready,
      myShips: seat === null ? [] : state.fleets[me].map((s) => ({ cells: s.cells, sunk: isSunk(s) })),
      incoming: state.shots[enemy], // az ellenfél lövései az én táblámon
      outgoing: state.shots[me],
      sunkEnemy,
      // a játék végén mindenki látja a másik flottáját is
      enemyShips: state.finished ? state.fleets[enemy].map((s) => s.cells) : null,
      shipsLeft: state.fleets.map((f) => f.filter((s) => !isSunk(s)).length),
      lastShot: state.lastShot,
      turn: state.finished || state.phase === 'setup' ? null : state.turn,
      waiting: state.phase === 'setup' ? [0, 1].filter((s) => !state.ready[s]) : [],
      finished: state.finished,
      winners: state.winner === null ? [] : [state.winner],
    };
  },

  _internal: { randomFleet, neighbors, SIZE },
};
