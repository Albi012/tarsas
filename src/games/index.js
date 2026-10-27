// Az összes elérhető játék. Új játékot ide kell felvenni (és a public/games mappába a rajzolóját).
const list = [
  require('./ludo'),
  require('./thieves'),
  require('./yahtzee'),
  require('./malom'),
  require('./amoba'),
  require('./connect4'),
];

const games = Object.fromEntries(list.map((g) => [g.id, g]));

function catalog() {
  return list.map(({ id, name, emoji, description, minPlayers, maxPlayers, rules, original }) => ({
    id,
    name,
    emoji,
    description,
    minPlayers,
    maxPlayers,
    rules,
    original: !!original,
  }));
}

module.exports = { games, catalog };
