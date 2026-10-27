const { gridGame } = require('./grid');

module.exports = {
  id: 'amoba',
  name: 'Amőba',
  emoji: '❌',
  description: 'Rakj ki 5 jelet egy sorban, mielőtt az ellenfeled teszi!',
  rules: [
    'Felváltva tesztek egy-egy jelet a 15×15-ös táblára.',
    'Az nyer, akinek először lesz 5 jele egy sorban – vízszintesen, függőlegesen vagy átlósan.',
    'Ha betelik a tábla, döntetlen.',
  ],
  ...gridGame({ width: 15, height: 15, inARow: 5, gravity: false }),
};
