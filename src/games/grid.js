// Közös segéd az "N egy sorban" típusú játékokhoz (Amőba, Négy a sorban).
// A tábla egy sorfolytonos tömb: board[y * width + x] = ülőhely vagy -1.

const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

// Visszaadja a nyerő sor mezőit, ha az (x, y)-ra tett korong legalább n hosszú sort zár.
function findLine(board, width, height, x, y, n) {
  const who = board[y * width + x];
  for (const [dx, dy] of DIRECTIONS) {
    const line = [[x, y]];
    for (const sign of [1, -1]) {
      let cx = x + dx * sign;
      let cy = y + dy * sign;
      while (cx >= 0 && cy >= 0 && cx < width && cy < height && board[cy * width + cx] === who) {
        line.push([cx, cy]);
        cx += dx * sign;
        cy += dy * sign;
      }
    }
    if (line.length >= n) return line.map(([lx, ly]) => ly * width + lx);
  }
  return null;
}

// Kétszemélyes, felváltva lépős rácsjáték alapja.
function gridGame({ width, height, inARow, gravity }) {
  return {
    minPlayers: 2,
    maxPlayers: 2,

    create() {
      return { board: Array(width * height).fill(-1), turn: 0, lastMove: null, winLine: null, finished: false, winner: null, moves: 0 };
    },

    act(state, seat, action) {
      if (state.finished) throw new Error('A játék véget ért');
      if (state.turn !== seat) throw new Error('Nem te következel');
      if (action.type !== 'place') throw new Error('Ismeretlen lépés');
      let x = Number(action.x);
      let y = Number(action.y);
      if (!(x >= 0 && x < width)) throw new Error('Érvénytelen mező');
      if (gravity) {
        // a korong leesik az oszlop legalsó üres helyére
        y = -1;
        for (let row = height - 1; row >= 0; row--) {
          if (state.board[row * width + x] === -1) {
            y = row;
            break;
          }
        }
        if (y === -1) throw new Error('Ez az oszlop megtelt');
      } else if (!(y >= 0 && y < height) || state.board[y * width + x] !== -1) {
        throw new Error('Ez a mező foglalt');
      }

      state.board[y * width + x] = seat;
      state.lastMove = y * width + x;
      state.moves++;
      const line = findLine(state.board, width, height, x, y, inARow);
      if (line) {
        state.winLine = line;
        state.finished = true;
        state.winner = seat;
      } else if (state.moves === width * height) {
        state.finished = true; // döntetlen
      } else {
        state.turn = 1 - seat;
      }
    },

    view(state) {
      return {
        width,
        height,
        board: state.board,
        lastMove: state.lastMove,
        winLine: state.winLine,
        turn: state.finished ? null : state.turn,
        finished: state.finished,
        winners: state.winner === null ? [] : [state.winner],
      };
    },
  };
}

module.exports = { findLine, gridGame };
