// Kockapóker (Yahtzee): 5 kocka, fordulónként 3 dobás, 13 kategória.

const CATEGORIES = [
  { id: 'ones', name: 'Egyesek', upper: 1 },
  { id: 'twos', name: 'Kettesek', upper: 2 },
  { id: 'threes', name: 'Hármasok', upper: 3 },
  { id: 'fours', name: 'Négyesek', upper: 4 },
  { id: 'fives', name: 'Ötösök', upper: 5 },
  { id: 'sixes', name: 'Hatosok', upper: 6 },
  { id: 'three', name: 'Drill (3 egyforma)' },
  { id: 'four', name: 'Póker (4 egyforma)' },
  { id: 'full', name: 'Full (3+2)' },
  { id: 'small', name: 'Kis sor (4 egymás után)' },
  { id: 'large', name: 'Nagy sor (5 egymás után)' },
  { id: 'yahtzee', name: 'Kockapóker (5 egyforma)' },
  { id: 'chance', name: 'Esély (bármi)' },
];
const UPPER_BONUS_LIMIT = 63;
const UPPER_BONUS = 35;
const ROLLS_PER_TURN = 3;

function score(category, dice) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  const sum = dice.reduce((a, b) => a + b, 0);
  const max = Math.max(...counts);
  const hasRun = (len) => {
    let run = 0;
    for (let v = 1; v <= 6; v++) {
      run = counts[v] ? run + 1 : 0;
      if (run >= len) return true;
    }
    return false;
  };
  const cat = CATEGORIES.find((c) => c.id === category);
  if (cat.upper) return counts[cat.upper] * cat.upper;
  switch (category) {
    case 'three': return max >= 3 ? sum : 0;
    case 'four': return max >= 4 ? sum : 0;
    case 'full': return counts.includes(3) && counts.includes(2) ? 25 : 0;
    case 'small': return hasRun(4) ? 30 : 0;
    case 'large': return hasRun(5) ? 40 : 0;
    case 'yahtzee': return max === 5 ? 50 : 0;
    case 'chance': return sum;
    default: return 0;
  }
}

function totals(sheet) {
  const upper = CATEGORIES.filter((c) => c.upper).reduce((a, c) => a + (sheet[c.id] ?? 0), 0);
  const bonus = upper >= UPPER_BONUS_LIMIT ? UPPER_BONUS : 0;
  const all = CATEGORIES.reduce((a, c) => a + (sheet[c.id] ?? 0), 0);
  return { upper, bonus, total: all + bonus };
}

module.exports = {
  id: 'yahtzee',
  name: 'Kockapóker',
  emoji: '🎰',
  description: 'Dobj ötször kockával, tartsd meg a jókat, és gyűjtsd a pontokat (Yahtzee)!',
  minPlayers: 1,
  maxPlayers: 6,
  rules: [
    'A köröd alatt legfeljebb 3-szor dobhatsz. Dobások között a kockákra kattintva megtarthatod őket.',
    'A kör végén az eredményt be kell írnod egy még üres kategóriába – ha nem illik sehová, 0 ponttal is beírhatod.',
    `Ha a felső részben (egyesek–hatosok) legalább ${UPPER_BONUS_LIMIT} pontod van, +${UPPER_BONUS} bónuszt kapsz.`,
    'A 13. kör után a legtöbb pontot gyűjtő játékos nyer.',
  ],
  categories: CATEGORIES,
  score,

  create({ names, rng }) {
    return {
      names,
      rng,
      sheets: names.map(() => ({})),
      turn: 0,
      dice: [0, 0, 0, 0, 0],
      held: [false, false, false, false, false],
      rollsLeft: ROLLS_PER_TURN,
      finished: false,
    };
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');
    if (state.turn !== seat) throw new Error('Nem te következel');

    if (action.type === 'roll') {
      if (state.rollsLeft === 0) throw new Error('Nincs több dobásod, írd be valahová!');
      state.dice = state.dice.map((d, i) => (state.held[i] ? d : 1 + Math.floor(state.rng() * 6)));
      state.rollsLeft--;
      return undefined;
    }

    if (action.type === 'hold') {
      const i = Number(action.die);
      if (state.rollsLeft === ROLLS_PER_TURN) throw new Error('Előbb dobj!');
      if (!(i >= 0 && i < 5)) throw new Error('Nincs ilyen kocka');
      state.held[i] = !state.held[i];
      return undefined;
    }

    if (action.type === 'score') {
      if (state.rollsLeft === ROLLS_PER_TURN) throw new Error('Előbb dobj!');
      const sheet = state.sheets[seat];
      if (!CATEGORIES.some((c) => c.id === action.category)) throw new Error('Nincs ilyen kategória');
      if (action.category in sheet) throw new Error('Ezt a kategóriát már kitöltötted');
      const points = score(action.category, state.dice);
      sheet[action.category] = points;
      const log = points === 50 && action.category === 'yahtzee' ? [`🎉 ${state.names[seat]} KOCKAPÓKERT dobott!`] : undefined;

      state.turn = (seat + 1) % state.names.length;
      state.dice = [0, 0, 0, 0, 0];
      state.held = [false, false, false, false, false];
      state.rollsLeft = ROLLS_PER_TURN;
      if (state.sheets.every((s) => Object.keys(s).length === CATEGORIES.length)) state.finished = true;
      return { log };
    }

    throw new Error('Ismeretlen lépés');
  },

  view(state) {
    const scores = state.sheets.map((s) => totals(s).total);
    const best = Math.max(...scores);
    return {
      categories: CATEGORIES.map(({ id, name, upper }) => ({ id, name, upper: !!upper })),
      sheets: state.sheets,
      totals: state.sheets.map(totals),
      dice: state.dice,
      held: state.held,
      rollsLeft: state.rollsLeft,
      // mennyit érne a jelenlegi dobás az egyes kategóriákban
      preview: state.rollsLeft < ROLLS_PER_TURN ? Object.fromEntries(CATEGORIES.map((c) => [c.id, score(c.id, state.dice)])) : null,
      turn: state.finished ? null : state.turn,
      finished: state.finished,
      winners: state.finished ? scores.map((s, i) => (s === best ? i : -1)).filter((i) => i !== -1) : [],
    };
  },
};
