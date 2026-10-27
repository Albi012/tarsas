// Az összes elérhető játék. Új játékot ide kell felvenni (és a public/games mappába a rajzolóját).
const list = [
  require('./ludo'),
  require('./thieves'),
  require('./balloon'),
  require('./digger'),
  require('./tens'),
  require('./safe'),
  require('./mines'),
  require('./makao'),
  require('./yahtzee'),
  require('./torpedo'),
  require('./dots'),
  require('./malom'),
  require('./dama'),
  require('./amoba'),
  require('./connect4'),
];

const games = Object.fromEntries(list.map((g) => [g.id, g]));

function catalog() {
  return list.map(({ id, name, emoji, description, minPlayers, maxPlayers, rules }) => ({
    id,
    name,
    emoji,
    description,
    minPlayers,
    maxPlayers,
    rules,
  }));
}

module.exports = { games, catalog };
