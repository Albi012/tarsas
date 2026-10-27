// Malom (kilenc bábus). A tábla 24 pontja egy 7x7-es rácson:
//
//  0-----------1-----------2
//  |   3-------4-------5   |
//  |   |   6---7---8   |   |
//  9--10--11       12--13--14
//  |   |  15--16--17   |   |
//  |  18------19------20   |
// 21----------22----------23

const POINTS = [
  [0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4],
  [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6],
];

const MILLS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
  [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23],
];

// szomszédos pontok: a malom-vonalakon egymás mellett állók
const ADJACENT = POINTS.map(() => []);
for (const [a, b, c] of MILLS) {
  ADJACENT[a].push(b);
  ADJACENT[b].push(a, c);
  ADJACENT[c].push(b);
}

const PIECES = 9;
const MAX_QUIET_MOVES = 50; // ennyi lépés ütés nélkül → döntetlen

function inMill(board, point) {
  const who = board[point];
  return MILLS.some((mill) => mill.includes(point) && mill.every((p) => board[p] === who));
}

function onBoard(state, seat) {
  return state.board.filter((p) => p === seat).length;
}

function canFly(state, seat) {
  return state.toPlace[seat] === 0 && onBoard(state, seat) === 3;
}

function hasMove(state, seat) {
  if (state.toPlace[seat] > 0) return true;
  if (canFly(state, seat)) return true;
  return state.board.some((p, i) => p === seat && ADJACENT[i].some((n) => state.board[n] === -1));
}

function removable(state, victim) {
  const pieces = state.board.map((p, i) => (p === victim ? i : -1)).filter((i) => i !== -1);
  const free = pieces.filter((i) => !inMill(state.board, i));
  // malomban álló bábut csak akkor lehet levenni, ha minden bábu malomban van
  return free.length ? free : pieces;
}

function endTurn(state, seat) {
  const other = 1 - seat;
  state.turn = other;
  if (state.toPlace[other] === 0 && onBoard(state, other) < 3) {
    finish(state, seat, 'Az ellenfélnek 2 bábuja maradt.');
  } else if (!hasMove(state, other)) {
    finish(state, seat, 'Az ellenfél nem tud lépni.');
  } else if (state.quietMoves >= MAX_QUIET_MOVES) {
    finish(state, null, `${MAX_QUIET_MOVES} lépés ütés nélkül – döntetlen.`);
  }
}

function finish(state, winner, reason) {
  state.finished = true;
  state.winner = winner;
  state.reason = reason;
}

function afterPlacement(state, seat, point) {
  state.lastMove = point;
  if (inMill(state.board, point)) {
    state.mustRemove = true;
    return { log: [`${state.names[seat]} malmot rakott ki!`] };
  }
  endTurn(state, seat);
  return undefined;
}

module.exports = {
  id: 'malom',
  name: 'Malom',
  emoji: '⚪',
  description: 'Rakj ki hármas sorokat, és vedd le az ellenfél bábuit!',
  minPlayers: 2,
  maxPlayers: 2,
  rules: [
    'Mindkét játékosnak 9 bábuja van. Először felváltva lerakjátok őket az üres pontokra.',
    'Ha 3 bábud egy vonalba kerül (malom), levehetsz egy ellenfél-bábut – malomban állót csak akkor, ha nincs más.',
    'Ha minden bábu lent van, a vonalak mentén a szomszédos üres pontra léptek.',
    'Akinek csak 3 bábuja maradt, bárhová ugorhat.',
    'Az veszít, akinek 2 bábuja marad, vagy nem tud lépni.',
  ],

  create({ names }) {
    return {
      names,
      board: Array(POINTS.length).fill(-1),
      toPlace: [PIECES, PIECES],
      turn: 0,
      mustRemove: false,
      lastMove: null,
      quietMoves: 0,
      finished: false,
      winner: null,
      reason: null,
    };
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');
    if (state.turn !== seat) throw new Error('Nem te következel');
    const { board } = state;
    const other = 1 - seat;

    if (state.mustRemove) {
      if (action.type !== 'remove') throw new Error('Előbb vegyél le egy ellenfél-bábut!');
      const at = Number(action.at);
      if (!removable(state, other).includes(at)) throw new Error('Ezt a bábut nem veheted le');
      board[at] = -1;
      state.mustRemove = false;
      state.quietMoves = 0;
      endTurn(state, seat);
      return undefined;
    }

    if (action.type === 'place') {
      if (state.toPlace[seat] === 0) throw new Error('Már minden bábudat leraktad');
      const at = Number(action.at);
      if (board[at] !== -1) throw new Error('Ez a pont foglalt');
      board[at] = seat;
      state.toPlace[seat]--;
      return afterPlacement(state, seat, at);
    }

    if (action.type === 'move') {
      if (state.toPlace[seat] > 0) throw new Error('Előbb rakd le az összes bábudat');
      const from = Number(action.from);
      const to = Number(action.to);
      if (board[from] !== seat) throw new Error('Ez nem a te bábud');
      if (board[to] !== -1) throw new Error('Ez a pont foglalt');
      if (!canFly(state, seat) && !ADJACENT[from].includes(to)) throw new Error('Csak szomszédos pontra léphetsz');
      board[from] = -1;
      board[to] = seat;
      state.quietMoves++;
      return afterPlacement(state, seat, to);
    }

    throw new Error('Ismeretlen lépés');
  },

  view(state) {
    const seat = state.turn;
    return {
      points: POINTS,
      mills: MILLS,
      adjacent: ADJACENT,
      board: state.board,
      toPlace: state.toPlace,
      onBoard: [onBoard(state, 0), onBoard(state, 1)],
      turn: state.finished ? null : seat,
      phase: state.mustRemove ? 'remove' : state.toPlace[seat] > 0 ? 'place' : 'move',
      canFly: canFly(state, seat),
      removable: state.mustRemove ? removable(state, 1 - seat) : [],
      lastMove: state.lastMove,
      finished: state.finished,
      reason: state.reason,
      winners: state.winner === null ? [] : [state.winner],
    };
  },
};
