// Pontok és dobozok. A vonalak: hLines[y][x] vízszintes (y: 0..H, x: 0..W-1),
// vLines[y][x] függőleges (y: 0..H-1, x: 0..W). boxes[y][x] = tulajdonos vagy -1.

function sizeFor(players) {
  return players <= 2 ? { w: 5, h: 5 } : { w: 6, h: 6 };
}

const grid = (rows, cols, value) => Array.from({ length: rows }, () => Array(cols).fill(value));

function boxDone(state, x, y) {
  return state.hLines[y][x] !== -1 && state.hLines[y + 1][x] !== -1 && state.vLines[y][x] !== -1 && state.vLines[y][x + 1] !== -1;
}

module.exports = {
  id: 'dots',
  name: 'Pontok és dobozok',
  emoji: '🔲',
  description: 'Húzz vonalakat a pontok között, és zárd be a legtöbb dobozt!',
  minPlayers: 2,
  maxPlayers: 4,
  rules: [
    'Felváltva húztok be egy-egy vonalat két szomszédos pont közé.',
    'Aki egy doboz negyedik oldalát húzza be, az övé a doboz, és újra jöhet.',
    'Vigyázz: ha egy doboz harmadik oldalát húzod be, a következő játékos bezárhatja!',
    'Ha minden doboz gazdát talált, az nyer, akinek a legtöbb van.',
  ],

  create({ names }) {
    const { w, h } = sizeFor(names.length);
    return {
      w,
      h,
      players: names.length,
      hLines: grid(h + 1, w, -1),
      vLines: grid(h, w + 1, -1),
      boxes: grid(h, w, -1),
      turn: 0,
      lastLine: null,
      finished: false,
    };
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');
    if (state.turn !== seat) throw new Error('Nem te következel');
    if (action.type !== 'line') throw new Error('Ismeretlen lépés');
    const x = Number(action.x);
    const y = Number(action.y);
    const lines = action.dir === 'h' ? state.hLines : action.dir === 'v' ? state.vLines : null;
    if (!lines || !lines[y] || lines[y][x] === undefined) throw new Error('Nincs ilyen vonal');
    if (lines[y][x] !== -1) throw new Error('Ez a vonal már be van húzva');
    lines[y][x] = seat;
    state.lastLine = { dir: action.dir, x, y };

    // melyik dobozokat érinti a vonal
    const touched = action.dir === 'h' ? [[x, y - 1], [x, y]] : [[x - 1, y], [x, y]];
    let closed = 0;
    for (const [bx, by] of touched) {
      if (bx < 0 || by < 0 || bx >= state.w || by >= state.h) continue;
      if (state.boxes[by][bx] === -1 && boxDone(state, bx, by)) {
        state.boxes[by][bx] = seat;
        closed++;
      }
    }
    if (state.boxes.every((row) => row.every((b) => b !== -1))) state.finished = true;
    else if (!closed) state.turn = (seat + 1) % state.players;
  },

  view(state) {
    const scores = Array(state.players).fill(0);
    state.boxes.forEach((row) => row.forEach((b) => b !== -1 && scores[b]++));
    const best = Math.max(...scores);
    return {
      w: state.w,
      h: state.h,
      hLines: state.hLines,
      vLines: state.vLines,
      boxes: state.boxes,
      scores,
      lastLine: state.lastLine,
      turn: state.finished ? null : state.turn,
      finished: state.finished,
      winners: state.finished ? scores.map((s, i) => (s === best ? i : -1)).filter((i) => i !== -1) : [],
    };
  },
};
