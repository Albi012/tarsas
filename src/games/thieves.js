// Tolvajok éjszakája – saját kitalálású blöffjáték.
//
// Minden körben az egyik játékos a rendőr (körbe jár), a többiek tolvajok.
// Mindenki titokban választ egy házat: a tolvajok, hogy hol törnek be, a rendőr,
// hogy hol les. Ha mindenki választott, egyszerre derül ki minden:
//   - akit a rendőr házában kapnak el, bírságot fizet a rendőrnek;
//   - aki egyedül tört be egy házba, viszi az összes zsákmányát;
//   - ha többen törnek be ugyanoda, összevesznek, és senki nem visz semmit.
// A ki nem rabolt házakban gyűlik a zsákmány, így egyre csábítóbbak (és veszélyesebbek).

const START_COINS = 5;
const FINE = 3;
const POLICE_SALARY = 1; // ha senkit nem kap el

function roundsFor(players) {
  return players <= 3 ? players * 3 : players * 2;
}

function houseCount(players) {
  return Math.max(3, players + 1);
}

// névelővel: "az 1. háznál", "a 2. háznál" (1-7 házig elég az egy és az öt)
function atHouse(house) {
  const n = house + 1;
  return `${n === 1 || n === 5 ? 'az' : 'a'} ${n}. háznál`;
}

function addLoot(state) {
  state.houses = state.houses.map((h) => h + 1 + Math.floor(state.rng() * 3));
}

function resolve(state) {
  const n = state.names.length;
  const police = state.police;
  const policeHouse = state.choices[police];
  const coinsBefore = [...state.coins];
  const lines = [];

  // a rendőr házában lévő tolvajok fizetnek
  const caught = [];
  for (let seat = 0; seat < n; seat++) {
    if (seat !== police && state.choices[seat] === policeHouse) caught.push(seat);
  }
  for (const seat of caught) {
    const fine = Math.min(FINE, state.coins[seat]);
    state.coins[seat] -= fine;
    state.coins[police] += fine;
    lines.push(`🚨 Elkapták ${atHouse(policeHouse)}: ${state.names[seat]} (−${fine})`);
  }
  if (!caught.length) {
    state.coins[police] += POLICE_SALARY;
    lines.push(`👮 ${state.names[police]} hiába lesett ${atHouse(policeHouse)} (+${POLICE_SALARY} fizetés)`);
  }

  // a többi ház kiosztása
  for (let house = 0; house < state.houses.length; house++) {
    if (house === policeHouse) continue;
    const thieves = [];
    for (let seat = 0; seat < n; seat++) {
      if (seat !== police && state.choices[seat] === house) thieves.push(seat);
    }
    if (thieves.length === 1) {
      const loot = state.houses[house];
      state.coins[thieves[0]] += loot;
      state.houses[house] = 0;
      lines.push(`💰 ${state.names[thieves[0]]} betört ${atHouse(house).replace('nál', 'ba')} (+${loot})`);
    } else if (thieves.length > 1) {
      lines.push(`🤼 Összevesztek ${atHouse(house)}: ${thieves.map((s) => state.names[s]).join(', ')} – senki nem visz semmit`);
    }
  }

  state.lastRound = {
    round: state.round,
    police,
    choices: [...state.choices],
    gains: state.coins.map((c, i) => c - coinsBefore[i]),
    lines,
  };
}

function startRound(state) {
  state.police = (state.round - 1) % state.names.length;
  state.choices = state.names.map(() => null);
  addLoot(state);
}

module.exports = {
  id: 'thieves',
  name: 'Tolvajok éjszakája',
  emoji: '🦹',
  description: 'Saját találmány! Blöffös tolvajjáték: rabold ki a legjobb házat, de ne ott, ahol a rendőr les!',
  original: true,
  minPlayers: 2,
  maxPlayers: 6,
  rules: [
    `Mindenki ${START_COINS} arannyal kezd. Minden körben egy játékos a rendőr (körbe jár), a többiek tolvajok.`,
    'Minden körben új zsákmány kerül minden házba. Ami nincs kirabolva, ott marad és gyűlik.',
    'Mindenki titokban választ egy házat: a tolvajok oda törnek be, a rendőr ott les.',
    `Akit a rendőr elkap, ${FINE} arany bírságot fizet neki. Ha a rendőr senkit nem kap el, ${POLICE_SALARY} arany fizetést kap.`,
    'Aki egyedül tört be egy házba, viszi a teljes zsákmányát.',
    'Ha többen törnek be ugyanoda, összevesznek, és senki nem visz semmit – a zsákmány marad.',
    'Mindenki többször is rendőr lesz. A játék végén a leggazdagabb nyer.',
  ],

  create({ names, rng }) {
    const state = {
      names,
      rng,
      coins: names.map(() => START_COINS),
      houses: Array(houseCount(names.length)).fill(0),
      round: 1,
      rounds: roundsFor(names.length),
      police: 0,
      choices: [],
      lastRound: null,
      finished: false,
    };
    startRound(state);
    return state;
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');
    if (action.type !== 'choose') throw new Error('Ismeretlen lépés');
    const house = Number(action.house);
    if (!(house >= 0 && house < state.houses.length)) throw new Error('Nincs ilyen ház');
    state.choices[seat] = house; // a döntés a felfedésig megváltoztatható

    if (state.choices.every((c) => c !== null)) {
      resolve(state);
      if (state.round === state.rounds) {
        state.finished = true;
      } else {
        state.round++;
        startRound(state);
      }
      return { log: [`— ${state.lastRound.round}. kör —`, ...state.lastRound.lines] };
    }
    return undefined;
  },

  // mindenki csak a saját választását látja
  view(state, seat) {
    const best = Math.max(...state.coins);
    return {
      round: state.round,
      rounds: state.rounds,
      houses: state.houses,
      coins: state.coins,
      police: state.police,
      myChoice: seat === null ? null : state.choices[seat],
      chosen: state.choices.map((c) => c !== null),
      waiting: state.finished ? [] : state.choices.map((c, i) => (c === null ? i : -1)).filter((i) => i !== -1),
      lastRound: state.lastRound,
      turn: null,
      finished: state.finished,
      winners: state.finished ? state.coins.map((c, i) => (c === best ? i : -1)).filter((i) => i !== -1) : [],
    };
  },
};
