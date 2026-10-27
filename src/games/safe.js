// Széffeltörők – kooperatív játék.
// Egy titkos 4 jegyű kód (1-6 számjegyek). Mindenki kap néhány titkos nyomot,
// a chaten megbeszélhetitek. Sorban tippeltek; minden tipp után kiderül, hány számjegy
// van jó helyen (●) és hány jó, de rossz helyen (○). Ha elfogynak a próbálkozások, megszólal a riasztó.

const LENGTH = 4;
const MAX_DIGIT = 6;
const ATTEMPTS = 8;
const ORD = ['az első', 'a második', 'a harmadik', 'a negyedik'];
const SUFFIX = ['', '1-es', '2-es', '3-as', '4-es', '5-ös', '6-os'];

const cap = (s) => s[0].toUpperCase() + s.slice(1);

// Igaz állítások a kódról, véletlen sorrendben.
function makeClues(code, rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const pool = [];
  for (let i = 0; i < LENGTH; i++) {
    pool.push(`${cap(ORD[i])} számjegy ${code[i] % 2 === 0 ? 'páros' : 'páratlan'}.`);
    const other = pick([1, 2, 3, 4, 5, 6].filter((d) => d !== code[i]));
    pool.push(`${cap(ORD[i])} számjegy nem ${other}.`);
    if (code[i] >= 3) pool.push(`${cap(ORD[i])} számjegy legalább ${pick([2, 3].filter((k) => k <= code[i]))}.`);
    if (code[i] <= 4) pool.push(`${cap(ORD[i])} számjegy legfeljebb ${pick([4, 5].filter((k) => k >= code[i]))}.`);
    for (let j = i + 1; j < LENGTH; j++) {
      const rel = code[i] > code[j] ? 'nagyobb, mint' : code[i] < code[j] ? 'kisebb, mint' : 'ugyanannyi, mint';
      pool.push(`${cap(ORD[i])} számjegy ${rel} ${ORD[j]}.`);
      if (rng() < 0.4) pool.push(`${cap(ORD[i])} és ${ORD[j]} számjegy összege ${code[i] + code[j]}.`);
    }
  }
  pool.push(`A számjegyek összege ${code.reduce((a, b) => a + b, 0)}.`);
  const unique = new Set(code).size === LENGTH;
  pool.push(unique ? 'Minden számjegy különböző.' : 'Van olyan számjegy, ami többször is szerepel.');
  for (let d = 1; d <= MAX_DIGIT; d++) {
    if (rng() < 0.5) pool.push(code.includes(d) ? `Van benne ${SUFFIX[d]}.` : `Nincs benne ${SUFFIX[d]}.`);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function score(code, guess) {
  let exact = 0;
  const restCode = [];
  const restGuess = [];
  for (let i = 0; i < LENGTH; i++) {
    if (code[i] === guess[i]) exact++;
    else {
      restCode.push(code[i]);
      restGuess.push(guess[i]);
    }
  }
  let near = 0;
  for (const g of restGuess) {
    const k = restCode.indexOf(g);
    if (k !== -1) {
      near++;
      restCode.splice(k, 1);
    }
  }
  return { exact, near };
}

module.exports = {
  id: 'safe',
  name: 'Széffeltörők',
  emoji: '🔐',
  description: 'Csapatjáték: törjétek fel együtt a széf kódját, mielőtt megszólal a riasztó!',
  minPlayers: 1,
  maxPlayers: 6,
  rules: [
    `Ez egy csapatjáték: vagy mindenki nyer, vagy mindenki veszít. A széf kódja ${LENGTH} számjegyből áll, mindegyik 1 és ${MAX_DIGIT} között (lehet ismétlődés).`,
    'Mindenki kap titkos nyomokat a kódról. Ezeket csak ti látjátok – a chaten megoszthatjátok egymással.',
    'Sorban tippeltek. Tipp után kiderül: ● = jó számjegy jó helyen, ○ = jó számjegy rossz helyen.',
    `Összesen ${ATTEMPTS} próbálkozásotok van. Ha egyik sem nyitja ki a széfet, megszólal a riasztó!`,
  ],
  score,

  create({ names, rng }) {
    const code = Array.from({ length: LENGTH }, () => 1 + Math.floor(rng() * MAX_DIGIT));
    const pool = makeClues(code, rng);
    const per = names.length === 1 ? 4 : 2;
    return {
      names,
      code,
      clues: names.map((_, i) => pool.slice(i * per, i * per + per)),
      guesses: [],
      turn: 0,
      finished: false,
      won: false,
    };
  },

  act(state, seat, action) {
    if (state.finished) throw new Error('A játék véget ért');
    if (state.turn !== seat) throw new Error('Nem te következel');
    if (action.type !== 'guess') throw new Error('Ismeretlen lépés');
    const guess = Array.isArray(action.code) ? action.code.map(Number) : [];
    if (guess.length !== LENGTH || guess.some((d) => !(d >= 1 && d <= MAX_DIGIT && Number.isInteger(d)))) {
      throw new Error(`${LENGTH} számjegyet adj meg, 1 és ${MAX_DIGIT} között`);
    }
    const result = score(state.code, guess);
    state.guesses.push({ seat, guess, ...result });
    if (result.exact === LENGTH) {
      state.finished = true;
      state.won = true;
      return undefined;
    }
    if (state.guesses.length >= ATTEMPTS) {
      state.finished = true;
      return undefined;
    }
    state.turn = (seat + 1) % state.names.length;
    return undefined;
  },

  view(state, seat) {
    return {
      length: LENGTH,
      maxDigit: MAX_DIGIT,
      attempts: ATTEMPTS,
      myClues: seat === null ? [] : state.clues[seat],
      guesses: state.guesses,
      code: state.finished ? state.code : null,
      turn: state.finished ? null : state.turn,
      finished: state.finished,
      winners: state.won ? state.names.map((_, i) => i) : [],
      resultText: state.finished
        ? state.won
          ? `🔓 Kinyitottátok a széfet ${state.guesses.length}. próbálkozásra – mindenki nyert!`
          : `🚨 Megszólalt a riasztó – vesztettetek! A kód ez volt: ${state.code.join('')}`
        : null,
    };
  },

  _internal: { makeClues },
};
