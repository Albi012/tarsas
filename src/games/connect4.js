const { gridGame } = require('./grid');

module.exports = {
  id: 'connect4',
  name: 'Négy a sorban',
  emoji: '🔴',
  description: 'Dobd be a korongjaidat, és rakj ki négyet egy vonalban!',
  rules: [
    'Felváltva dobtok be egy-egy korongot a 7 oszlop valamelyikébe – a korong leesik a legalsó üres helyre.',
    'Az nyer, akinek először lesz 4 korongja egy vonalban – vízszintesen, függőlegesen vagy átlósan.',
    'Ha betelik a tábla, döntetlen.',
  ],
  ...gridGame({ width: 7, height: 6, inARow: 4, gravity: true }),
};
