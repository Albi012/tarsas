// "Ki nevet a végén?" rajzoló.
(() => {
  // A 40 pályamező koordinátái (oszlop, sor) a 11x11-es rácson, a piros start mezőtől körbe.
  const TRACK = [
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0],
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 5],
    [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10],
    [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 5],
  ];
  const FINISH = [
    [[1, 5], [2, 5], [3, 5], [4, 5]],
    [[5, 1], [5, 2], [5, 3], [5, 4]],
    [[9, 5], [8, 5], [7, 5], [6, 5]],
    [[5, 9], [5, 8], [5, 7], [5, 6]],
  ];
  const BASES = [
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[9, 0], [10, 0], [9, 1], [10, 1]],
    [[9, 9], [10, 9], [9, 10], [10, 10]],
    [[0, 9], [1, 9], [0, 10], [1, 10]],
  ];

  let lastRollKey = null;

  function tint(color) {
    return `color-mix(in srgb, ${PALETTE[color]} 30%, white)`;
  }

  function cell(svg, [x, y], fill) {
    svg.append(UI.svg('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.42, class: 'cell', style: fill ? { fill } : {} }));
  }

  Renderers.ludo = {
    render(area, view, ctx) {
      const svg = UI.svg('svg', { viewBox: '0 0 11 11', class: 'ludo-board' });
      TRACK.forEach((pos, i) => cell(svg, pos, i % 10 === 0 ? tint(i / 10) : null));
      FINISH.forEach((cells, color) => cells.forEach((pos) => cell(svg, pos, tint(color))));
      BASES.forEach((cells, color) => cells.forEach((pos) => cell(svg, pos, tint(color))));

      view.colors.forEach((color, seat) => {
        view.pieces[color].forEach((p, idx) => {
          let pos;
          if (p === -1) pos = BASES[color][idx];
          else if (p < 40) pos = TRACK[(color * 10 + p) % 40];
          else pos = FINISH[color][p - 40];
          const movable = ctx.myTurn && seat === view.turn && view.movable.includes(idx);
          svg.append(
            UI.svg('circle', {
              cx: pos[0] + 0.5,
              cy: pos[1] + 0.5,
              r: 0.32,
              class: movable ? 'piece movable' : 'piece',
              style: { fill: PALETTE[color] },
              onclick: movable ? () => ctx.send({ type: 'move', piece: idx }) : undefined,
            }),
          );
        });
      });

      let hint = '';
      if (ctx.myTurn && !view.rolled) {
        hint = view.dice && view.tries > 0 ? `Nem jött hatos, dobj újra! (${view.tries}/3)` : 'Kattints a kockára!';
      } else if (ctx.myTurn && view.movable.length) {
        hint = 'Válassz egy villogó bábut!';
      } else if (view.pendingPass) {
        hint = 'Nincs lehetséges lépés, a kör továbbmegy.';
      }

      // a kocka csak friss dobásnál rázkódjon
      const rollKey = view.lastEvent && view.lastEvent.type === 'roll' ? JSON.stringify(view.lastEvent) + view.tries : null;
      const shake = rollKey && rollKey !== lastRollKey;
      lastRollKey = rollKey;

      const canRoll = ctx.myTurn && !view.rolled;
      const dice = UI.el(
        'button',
        { class: `dice-btn ${canRoll ? 'active' : ''}`, disabled: !canRoll, onclick: () => ctx.send({ type: 'roll' }), 'aria-label': 'Dobás' },
        UI.dice(view.dice || 0, shake ? 'rolling' : ''),
      );

      area.replaceChildren(
        UI.el('div', { class: 'ludo' }, UI.el('div', { class: 'board-wrap' }, svg), UI.el('div', { class: 'side-panel' }, dice, UI.el('p', { class: 'muted' }, hint))),
      );
    },
  };
})();
