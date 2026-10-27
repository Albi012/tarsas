// Dáma 8x8-as táblán, kötelező ütéssel és "repülő" dámával.
// board[y * 8 + x] = null vagy { owner, king }. A 0. játékos alul kezd és felfelé halad.

const SIZE = 8;
const DIRS = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
const MAX_QUIET_MOVES = 50; // ennyi lépés ütés nélkül → döntetlen

const idx = (x, y) => y * SIZE + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
const forward = (owner) => (owner === 0 ? -1 : 1);

// Ütések egy bábuval. `captured`: a lánc során már leütött (de még a táblán lévő) bábuk.
function jumpsFrom(board, from, captured = []) {
  const piece = board[from];
  const x0 = from % SIZE;
  const y0 = Math.floor(from / SIZE);
  const out = [];
  for (const [dx, dy] of DIRS) {
    let x = x0 + dx;
    let y = y0 + dy;
    if (piece.king) {
      while (inside(x, y) && !board[idx(x, y)]) {
        x += dx;
        y += dy;
      }
    }
    if (!inside(x, y)) continue;
    const over = idx(x, y);
    const target = board[over];
    if (!target || target.owner === piece.owner || captured.includes(over)) continue;
    x += dx;
    y += dy;
    while (inside(x, y) && !board[idx(x, y)]) {
      out.push({ from, to: idx(x, y), over });
      if (!piece.king) break;
      x += dx;
      y += dy;
    }
  }
  return out;
}

function stepsFrom(board, from) {
  const piece = board[from];
  const x0 = from % SIZE;
  const y0 = Math.floor(from / SIZE);
  const out = [];
  for (const [dx, dy] of DIRS) {
    if (!piece.king && dy !== forward(piece.owner)) continue;
    let x = x0 + dx;
    let y = y0 + dy;
    while (inside(x, y) && !board[idx(x, y)]) {
      out.push({ from, to: idx(x, y) });
      if (!piece.king) break;
      x += dx;
      y += dy;
    }
  }
  return out;
}

function legalMoves(state, seat = state.turn) {
  const { board } = state;
  if (state.chain) return jumpsFrom(board, state.chain.pos, state.chain.captured);
  const mine = board.map((p, i) => (p && p.owner === seat ? i : -1)).filter((i) => i !== -1);
  const jumps = mine.flatMap((i) => jumpsFrom(board, i));
  return jumps.length ? jumps : mine.flatMap((i) => stepsFrom(board, i));
}

function createBoard() {
  const board = Array(SIZE * SIZE).fill(null);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if ((x + y) % 2 === 0) continue;
      if (y < 3) board[idx(x, y)] = { owner: 1, king: false };
      if (y > 4) board[idx(x, y)] = { owner: 0, king: false };
    }
  }
  return board;
}

module.exports = {
  id: 'dama',
  name: 'Dáma',
  emoji: '👑',
  description: 'Ugord át és üsd le az ellenfél összes korongját!',
  minPlayers: 2,
  maxPlayers: 2,
  rules: [
    'A korongok átlósan, előre lépnek egyet a sötét mezőkön.',
    'Ütni kötelező: ha az átlósan szomszédos ellenfél-korong mögött üres a mező, átugrod és leütöd (előre és hátra is lehet).',
    'Ha ütés után ugyanazzal a koronggal újra tudsz ütni, folytatnod kell.',
    'Aki beér a túloldali sorba, dámává változik: bármennyit léphet átlósan, előre és hátra is, és távolról is üthet.',
    'Az veszít, akinek elfogynak a korongjai, vagy nem tud lépni.',
  ],

  create() {
    return { board: createBoard(), turn: 0, chain: null, lastMove: null, quietMoves: 0, finished: false, winner: null, reason: null };
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');
    if (state.turn !== seat) throw new Error('Nem te következel');
    if (action.type !== 'move') throw new Error('Ismeretlen lépés');
    const from = Number(action.from);
    const to = Number(action.to);
    const moves = legalMoves(state);
    const move = moves.find((m) => m.from === from && m.to === to);
    if (!move) {
      if (moves.some((m) => m.over !== undefined)) throw new Error('Ütni kötelező!');
      throw new Error('Ide nem léphetsz');
    }

    const { board } = state;
    board[to] = board[from];
    board[from] = null;
    state.lastMove = { from, to };

    if (move.over !== undefined) {
      const captured = state.chain ? [...state.chain.captured, move.over] : [move.over];
      if (jumpsFrom(board, to, captured).length) {
        state.chain = { pos: to, captured }; // folytatnia kell az ütést
        return undefined;
      }
      for (const c of captured) board[c] = null;
      state.chain = null;
      state.quietMoves = 0;
    } else {
      state.quietMoves++;
    }

    const lastRow = seat === 0 ? 0 : SIZE - 1;
    let log;
    if (!board[to].king && Math.floor(to / SIZE) === lastRow) {
      board[to].king = true;
      log = ['👑 Új dáma a táblán!'];
    }

    state.turn = 1 - seat;
    if (!legalMoves(state).length) {
      state.finished = true;
      state.winner = seat;
      state.reason = board.some((p) => p && p.owner === state.turn) ? 'Az ellenfél nem tud lépni.' : 'Az ellenfél összes korongja elfogyott.';
    } else if (state.quietMoves >= MAX_QUIET_MOVES) {
      state.finished = true;
      state.reason = `${MAX_QUIET_MOVES} lépés ütés nélkül – döntetlen.`;
    }
    return { log };
  },

  view(state) {
    return {
      size: SIZE,
      board: state.board,
      moves: state.finished ? [] : legalMoves(state).map(({ from, to, over }) => ({ from, to, capture: over !== undefined })),
      chain: state.chain ? state.chain.pos : null,
      captured: state.chain ? state.chain.captured : [],
      lastMove: state.lastMove,
      counts: [0, 1].map((s) => state.board.filter((p) => p && p.owner === s).length),
      turn: state.finished ? null : state.turn,
      finished: state.finished,
      reason: state.reason,
      winners: state.winner === null ? [] : [state.winner],
    };
  },

  _internal: { legalMoves },
};
