// Lufi – saját kitalálású kockáztatós játék.
// Minden körben egy új lufi, aminek titkos a teherbírása. Aki soron van, 1-3-at pumpál
// (minden pumpa 1 pont a kör kasszájába), vagy kiszáll és elteszi a kör pontjait.
// Akinél kidurran, elveszíti a körben gyűjtött pontjait.

const ROUNDS = 5;
const MIN_CAPACITY = 8;
const MAX_CAPACITY = 24;

function startRound(state, starter) {
  const n = state.names.length;
  state.capacity = MIN_CAPACITY + Math.floor(state.rng() * (MAX_CAPACITY - MIN_CAPACITY + 1));
  state.air = 0;
  state.pot = Array(n).fill(0);
  state.inRound = Array(n).fill(true);
  state.turn = starter;
}

function bankAll(state) {
  state.pot.forEach((p, i) => (state.scores[i] += p));
}

function nextActive(state, from) {
  const n = state.names.length;
  for (let k = 1; k <= n; k++) {
    const s = (from + k) % n;
    if (state.inRound[s]) return s;
  }
  return null;
}

function endRound(state, starter) {
  state.history.push({ round: state.round, capacity: state.capacity, burstBy: state.burstBy });
  state.burstBy = null;
  if (state.round === ROUNDS) {
    state.finished = true;
    return;
  }
  state.round++;
  startRound(state, starter);
}

module.exports = {
  id: 'balloon',
  name: 'Lufi',
  emoji: '🎈',
  description: 'Saját találmány! Pumpáld a közös lufit – de ne nálad durranjon ki!',
  original: true,
  minPlayers: 2,
  maxPlayers: 6,
  rules: [
    `${ROUNDS} kör van, minden körben egy új lufi. A teherbírása titkos: ${MIN_CAPACITY} és ${MAX_CAPACITY} pumpa között bármennyi lehet.`,
    'Amikor sorra kerülsz, 1, 2 vagy 3-at pumpálsz – minden pumpa 1 pont a kör kasszádba.',
    'Vagy kiszállhatsz: ekkor a kör pontjaid biztonságban vannak, de ebben a körben többet nem pumpálsz.',
    'Akinél kidurran a lufi, elveszíti az abban a körben gyűjtött pontjait. A többiek megtartják a sajátjukat, és ő kezdi a következő kört.',
    'Ha mindenki kiszállt, a kör véget ér, a lufi nem durran ki.',
    'A végén a legtöbb pontot gyűjtő játékos nyer.',
  ],

  create({ names, rng }) {
    const state = {
      names,
      rng,
      round: 1,
      rounds: ROUNDS,
      scores: names.map(() => 0),
      history: [],
      burstBy: null,
      lastAction: null,
      finished: false,
    };
    startRound(state, 0);
    return state;
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');
    if (state.turn !== seat) throw new Error('Nem te következel');

    if (action.type === 'leave') {
      state.inRound[seat] = false;
      state.lastAction = { seat, text: `kiszállt ${state.pot[seat]} ponttal` };
      const next = nextActive(state, seat);
      if (next === null) {
        bankAll(state);
        const log = [`Mindenki kiszállt – a lufi kibírta volna még ${state.capacity - state.air} pumpát.`];
        endRound(state, (seat + 1) % state.names.length);
        return { log };
      }
      state.turn = next;
      return undefined;
    }

    if (action.type !== 'pump') throw new Error('Ismeretlen lépés');
    const count = Number(action.count);
    if (![1, 2, 3].includes(count)) throw new Error('1, 2 vagy 3-at pumpálhatsz');
    for (let i = 0; i < count; i++) {
      state.air++;
      state.pot[seat]++;
      if (state.air >= state.capacity) {
        const lost = state.pot[seat];
        state.pot[seat] = 0;
        bankAll(state);
        state.burstBy = seat;
        state.lastAction = { seat, text: `kidurrantotta a lufit (−${lost} pont)` };
        const log = [`💥 PUKK! Kidurrant a lufi ${state.capacity} pumpánál – ${state.names[seat]} elvesztett ${lost} pontot.`];
        endRound(state, seat);
        return { log };
      }
    }
    state.lastAction = { seat, text: `pumpált ${['', 'egyet', 'kettőt', 'hármat'][count]}` };
    state.turn = nextActive(state, seat);
    return undefined;
  },

  view(state) {
    const best = Math.max(...state.scores);
    return {
      round: state.round,
      rounds: state.rounds,
      air: state.air,
      minCapacity: MIN_CAPACITY,
      maxCapacity: MAX_CAPACITY,
      pot: state.pot,
      inRound: state.inRound,
      scores: state.scores,
      history: state.history,
      lastAction: state.lastAction,
      turn: state.finished ? null : state.turn,
      finished: state.finished,
      winners: state.finished ? state.scores.map((s, i) => (s === best ? i : -1)).filter((i) => i !== -1) : [],
    };
  },
};
