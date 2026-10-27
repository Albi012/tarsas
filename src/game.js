// "Ki nevet a végén?" játéklogika – a szerver ez alapján dönt mindenről.
//
// Bábu pozíció (a saját színhez viszonyítva):
//   -1        : házban (bázis)
//   0..39     : a pályán, ennyi lépésre a saját start mezőtől
//   40..43    : a célegyenesben
// Abszolút pályamező: (szín * 10 + pozíció) % 40

const TRACK_LENGTH = 40;
const FINISH_LENGTH = 4;
const PIECES = 4;
const LAST_POS = TRACK_LENGTH + FINISH_LENGTH - 1;
const MAX_TRIES_WHEN_STUCK = 3;

function absolute(color, pos) {
  return (color * 10 + pos) % TRACK_LENGTH;
}

function colorsFor(playerCount) {
  return playerCount === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, playerCount);
}

function createGame(playerCount, rng = Math.random) {
  if (playerCount < 2 || playerCount > 4) throw new Error('2-4 játékos kell');
  const colors = colorsFor(playerCount);
  return {
    colors,
    pieces: Object.fromEntries(colors.map((c) => [c, Array(PIECES).fill(-1)])),
    turn: 0, // index a colors tömbben
    dice: null,
    rolled: false,
    tries: 0,
    winners: [],
    finished: false,
    lastEvent: null,
    rng,
  };
}

function currentColor(game) {
  return game.colors[game.turn];
}

function pieceAt(game, absPos) {
  for (const color of game.colors) {
    const idx = game.pieces[color].findIndex((p) => p >= 0 && p < TRACK_LENGTH && absolute(color, p) === absPos);
    if (idx !== -1) return { color, idx };
  }
  return null;
}

function targetOf(game, color, idx, dice) {
  const pos = game.pieces[color][idx];
  if (pos === -1) return dice === 6 ? 0 : null;
  const target = pos + dice;
  return target > LAST_POS ? null : target;
}

function legalMoves(game) {
  if (!game.rolled || game.finished) return [];
  const color = currentColor(game);
  const own = game.pieces[color];
  const moves = [];
  for (let idx = 0; idx < PIECES; idx++) {
    const target = targetOf(game, color, idx, game.dice);
    if (target === null) continue;
    // saját bábura nem léphetünk
    const blocked = own.some((p, i) => i !== idx && p === target);
    if (!blocked) moves.push(idx);
  }
  return moves;
}

// Ha nincs bábu a pályán (mind házban vagy a cél végén zárva), 3x lehet dobni.
function isStuck(game, color) {
  const own = game.pieces[color];
  return own.every((p, i) => {
    if (p === -1) return true;
    if (p < TRACK_LENGTH) return false;
    // célban lévő bábu csak akkor "kész", ha nem tud már előrébb lépni
    return own.filter((q) => q > p).length === LAST_POS - p;
  });
}

function nextTurn(game) {
  if (game.finished) return;
  game.rolled = false;
  game.dice = null;
  game.tries = 0;
  for (let i = 1; i <= game.colors.length; i++) {
    const next = (game.turn + i) % game.colors.length;
    if (!game.winners.includes(game.colors[next])) {
      game.turn = next;
      return;
    }
  }
}

function roll(game) {
  if (game.finished) throw new Error('A játék véget ért');
  if (game.rolled) throw new Error('Már dobtál, lépj!');
  const color = currentColor(game);
  game.dice = 1 + Math.floor(game.rng() * 6);
  game.rolled = true;
  game.tries++;
  game.lastEvent = { type: 'roll', color, dice: game.dice };

  if (legalMoves(game).length === 0) {
    if (isStuck(game, color) && game.tries < MAX_TRIES_WHEN_STUCK) {
      game.rolled = false; // újra dobhat
    } else {
      game.pendingPass = true;
    }
  }
  return game.dice;
}

// Ha nincs érvényes lépés, a kliens kijelzi a dobást, aztán a szerver továbbadja a kört.
function passIfNoMoves(game) {
  if (!game.pendingPass) return false;
  game.pendingPass = false;
  nextTurn(game);
  return true;
}

function move(game, idx) {
  if (!game.rolled) throw new Error('Előbb dobj!');
  if (!legalMoves(game).includes(idx)) throw new Error('Ezzel a bábuval nem léphetsz');
  const color = currentColor(game);
  const target = targetOf(game, color, idx, game.dice);
  let captured = null;

  if (target < TRACK_LENGTH) {
    const hit = pieceAt(game, absolute(color, target));
    if (hit && hit.color !== color) {
      game.pieces[hit.color][hit.idx] = -1;
      captured = hit.color;
    }
  }
  game.pieces[color][idx] = target;
  game.lastEvent = { type: 'move', color, idx, to: target, captured };

  if (game.pieces[color].every((p) => p >= TRACK_LENGTH)) {
    game.winners.push(color);
    if (game.winners.length >= game.colors.length - 1) {
      game.finished = true;
      const loser = game.colors.find((c) => !game.winners.includes(c));
      if (loser !== undefined) game.winners.push(loser);
      return;
    }
    nextTurn(game);
    return;
  }

  if (game.dice === 6) {
    // hatos után újra dobhat
    game.rolled = false;
    game.dice = null;
    game.tries = 0;
  } else {
    nextTurn(game);
  }
}

function publicState(game) {
  return {
    colors: game.colors,
    pieces: game.pieces,
    turn: currentColor(game),
    dice: game.dice,
    rolled: game.rolled,
    tries: game.tries,
    winners: game.winners,
    finished: game.finished,
    lastEvent: game.lastEvent,
    movable: legalMoves(game),
  };
}

module.exports = {
  TRACK_LENGTH,
  FINISH_LENGTH,
  createGame,
  currentColor,
  legalMoves,
  roll,
  move,
  passIfNoMoves,
  publicState,
  absolute,
};
