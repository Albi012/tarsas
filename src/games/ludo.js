// "Ki nevet a végén?" játéklogika.
//
// Bábu pozíció (a saját színhez viszonyítva):
//   -1        : házban (bázis)
//   0..39     : a pályán, ennyi lépésre a saját start mezőtől
//   40..43    : a célegyenesben
// Abszolút pályamező: (szín * 10 + pozíció) % 40
// Az ülőhely (seat) indexe megegyezik a `colors` tömb indexével.

const TRACK_LENGTH = 40;
const FINISH_LENGTH = 4;
const PIECES = 4;
const LAST_POS = TRACK_LENGTH + FINISH_LENGTH - 1;
const MAX_TRIES_WHEN_STUCK = 3;
const PASS_DELAY_MS = 1200;

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
    pendingPass: false,
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
  if (!game.rolled || game.finished || game.pendingPass) return [];
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
  return own.every((p) => {
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

module.exports = {
  id: 'ludo',
  name: 'Ki nevet a végén?',
  emoji: '🎲',
  description: 'A klasszikus: vidd haza mind a 4 bábudat, és üsd ki a többieket!',
  minPlayers: 2,
  maxPlayers: 4,
  rules: [
    'Házból csak hatossal lehet kijönni. Ha nincs bábud a pályán, 3-szor dobhatsz.',
    'Hatos után újra dobhatsz.',
    'Ha ellenfél bábujára lépsz, kiütöd – visszamegy a házába.',
    'Saját bábudra nem léphetsz, és a célegyenesben nem lehet túllépni a végét.',
    'Az nyer, aki elsőként beviszi mind a 4 bábuját.',
  ],

  create({ names, rng }) {
    const game = createGame(names.length, rng);
    game.names = names;
    return game;
  },

  seatColors(game) {
    return game.colors;
  },

  act(game, seat, action) {
    if (game.turn !== seat) throw new Error('Nem te következel');
    if (action.type === 'roll') {
      roll(game);
      return game.pendingPass ? { advanceAfter: PASS_DELAY_MS } : undefined;
    }
    if (action.type === 'move') {
      move(game, Number(action.piece));
      const ev = game.lastEvent;
      if (ev.captured !== null) {
        const victim = game.colors.indexOf(ev.captured);
        return { log: [`${game.names[seat]} kiütötte ${game.names[victim]} bábuját!`] };
      }
      return undefined;
    }
    throw new Error('Ismeretlen lépés');
  },

  advance(game) {
    return passIfNoMoves(game);
  },

  view(game) {
    return {
      colors: game.colors,
      pieces: game.pieces,
      turn: game.finished ? null : game.turn,
      dice: game.dice,
      rolled: game.rolled,
      tries: game.tries,
      pendingPass: game.pendingPass,
      lastEvent: game.lastEvent,
      movable: legalMoves(game),
      finished: game.finished,
      ranking: game.winners.map((c) => game.colors.indexOf(c)),
      winners: game.finished ? [game.colors.indexOf(game.winners[0])] : [],
    };
  },

  // tesztekhez
  _internal: { createGame, currentColor, legalMoves, roll, move, passIfNoMoves },
};
