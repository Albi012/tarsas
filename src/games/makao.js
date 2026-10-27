// Makaó: francia kártyával, 2-6 játékosnak.
// Lap: { s: szín 0-3 (♠ ♥ ♦ ♣), r: érték 2-14 (11 = bubi, 12 = dáma, 13 = király, 14 = ász) }

const HAND_SIZE = 5;
const SUITS = ['♠', '♥', '♦', '♣'];
const SEVEN = 7;
const JACK = 11;
const ACE = 14;

function newDeck(rng) {
  const deck = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) deck.push({ s, r });
  return shuffle(deck, rng);
}

function shuffle(cards, rng) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function top(state) {
  return state.discard[state.discard.length - 1];
}

function draw(state, seat, count) {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    if (!state.deck.length) {
      // a dobott lapokat (a legfelső kivételével) megkeverjük
      const keep = state.discard.pop();
      state.deck = shuffle(state.discard, state.rng);
      state.discard = [keep];
      if (!state.deck.length) break;
    }
    state.hands[seat].push(state.deck.pop());
    drawn++;
  }
  return drawn;
}

function canPlay(state, card) {
  if (state.pendingDraw > 0) return card.r === SEVEN;
  if (card.r === JACK) return true;
  if (state.wish !== null) return card.s === state.wish;
  const t = top(state);
  return card.s === t.s || card.r === t.r;
}

function nextSeat(state, from, steps = 1) {
  return (from + steps) % state.names.length;
}

function cardName(card) {
  const names = { 11: 'B', 12: 'D', 13: 'K', 14: 'A' };
  return `${SUITS[card.s]}${names[card.r] || card.r}`;
}

module.exports = {
  id: 'makao',
  name: 'Makaó',
  emoji: '🃏',
  description: 'A klasszikus kártyajáték: szabadulj meg elsőként az összes lapodtól!',
  minPlayers: 2,
  maxPlayers: 6,
  rules: [
    `Mindenki ${HAND_SIZE} lapot kap. Sorban egy-egy lapot tesztek a dobott lapra: azonos színűt (♠♥♦♣) vagy azonos értékűt.`,
    'Ha nem tudsz vagy nem akarsz rakni, húzol egy lapot, és a következő jön.',
    '7-es: a következő játékosnak 2 lapot kell húznia – hacsak ő is nem tesz rá 7-est, mert akkor tovább nő a húzás.',
    'Ász: a következő játékos kimarad.',
    'Bubi: bármire rakható, és kívánhatsz egy színt, amit a következőnek raknia kell.',
    'Aki elsőként elfogy a lapjaiból, nyer!',
  ],

  create({ names, rng }) {
    const state = {
      names,
      rng,
      deck: newDeck(rng),
      discard: [],
      hands: names.map(() => []),
      turn: 0,
      pendingDraw: 0,
      wish: null,
      lastAction: null,
      finished: false,
      winner: null,
    };
    names.forEach((_, seat) => draw(state, seat, HAND_SIZE));
    state.discard.push(state.deck.pop());
    return state;
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');
    if (state.turn !== seat) throw new Error('Nem te következel');
    const hand = state.hands[seat];
    const name = state.names[seat];
    const log = [];

    if (action.type === 'draw') {
      if (state.pendingDraw > 0) {
        const n = draw(state, seat, state.pendingDraw);
        log.push(`${name} felhúzott ${n} lapot.`);
        state.lastAction = { seat, text: `felhúzott ${n} lapot` };
        state.pendingDraw = 0;
      } else {
        draw(state, seat, 1);
        state.lastAction = { seat, text: 'húzott egy lapot' };
      }
      state.turn = nextSeat(state, seat);
      return { log };
    }

    if (action.type !== 'play') throw new Error('Ismeretlen lépés');
    const idx = Number(action.card);
    const card = hand[idx];
    if (!card) throw new Error('Nincs ilyen lapod');
    if (!canPlay(state, card)) throw new Error('Ezt a lapot most nem rakhatod le');
    if (card.r === JACK && !(Number(action.suit) >= 0 && Number(action.suit) < 4)) throw new Error('Válassz színt!');

    hand.splice(idx, 1);
    state.discard.push(card);
    state.wish = card.r === JACK ? Number(action.suit) : null;
    let steps = 1;
    let text = `lerakta: ${cardName(card)}`;
    if (card.r === SEVEN) {
      state.pendingDraw += 2;
      text += ` – a következő húz ${state.pendingDraw}-t, ha nem tesz rá 7-est`;
    } else if (card.r === ACE) {
      steps = 2;
      log.push(`${state.names[nextSeat(state, seat)]} kimarad.`);
    } else if (card.r === JACK) {
      text += ` és ${SUITS[state.wish]} színt kér`;
    }
    state.lastAction = { seat, text };

    if (hand.length === 0) {
      state.finished = true;
      state.winner = seat;
      return { log };
    }
    if (hand.length === 1) log.push(`${name}: Makaó! 🃏`);
    state.turn = nextSeat(state, seat, steps);
    return { log };
  },

  view(state, seat) {
    const hand = seat === null ? [] : state.hands[seat];
    const myTurn = seat === state.turn && !state.finished;
    return {
      hand,
      playable: myTurn ? hand.map((c, i) => (canPlay(state, c) ? i : -1)).filter((i) => i !== -1) : [],
      handCounts: state.hands.map((h) => h.length),
      top: top(state),
      wish: state.wish,
      pendingDraw: state.pendingDraw,
      deckCount: state.deck.length,
      lastAction: state.lastAction,
      turn: state.finished ? null : state.turn,
      finished: state.finished,
      winners: state.winner === null ? [] : [state.winner],
    };
  },

  _internal: { canPlay },
};
