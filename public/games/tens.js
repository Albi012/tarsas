// Tízes rajzoló: előbb egy lapot választasz a kezedből, aztán egy üres mezőt.
(() => {
  let selected = 0;

  Renderers.tens = {
    render(area, view, ctx) {
      const { size } = view;
      if (selected >= view.hand.length) selected = 0;
      const captured = new Set(view.lastMove ? view.lastMove.captured : []);
      const rerender = () => Renderers.tens.render(area, view, ctx);

      const board = UI.el('div', { class: 'tens-board', style: { gridTemplateColumns: `repeat(${size}, 1fr)` } });
      view.board.forEach((tile, i) => {
        const cls = ['tens-cell'];
        if (view.lastMove && view.lastMove.cell === i) cls.push('last');
        if (captured.has(i)) cls.push('captured');
        if (!tile && ctx.myTurn) cls.push('free');
        board.append(
          UI.el(
            'div',
            { class: cls.join(' '), onclick: !tile && ctx.myTurn ? () => ctx.send({ type: 'place', tile: selected, cell: i }) : undefined },
            tile ? UI.el('span', { class: 'tens-tile', style: { background: ctx.color(tile.owner) } }, String(tile.value)) : null,
          ),
        );
      });

      const hand = UI.el(
        'div',
        { class: 'tens-hand' },
        view.hand.map((v, i) =>
          UI.el(
            'button',
            {
              class: `tens-tile hand-tile ${i === selected ? 'selected' : ''}`,
              style: { background: ctx.mySeat === null ? '#999' : ctx.color(ctx.mySeat) },
              onclick: () => {
                selected = i;
                rerender();
              },
            },
            String(v),
          ),
        ),
      );

      const legend = UI.el(
        'div',
        { class: 'legend' },
        view.counts.map((c, s) => UI.el('span', {}, UI.dot(ctx.color(s)), ` ${ctx.name(s)}: `, UI.el('b', {}, String(c)))),
      );
      const hint = ctx.myTurn
        ? `Kiválasztott lap: ${view.hand[selected]}. Kattints egy üres mezőre! (Tízes: összeg 10 · Összeg: két szomszéd együtt = a lapod)`
        : '';

      area.replaceChildren(
        UI.el(
          'div',
          { class: 'tens' },
          legend,
          UI.el('div', { class: 'board-wrap' }, board),
          UI.el('p', { class: 'hint' }, hint),
          UI.el('h3', { class: 'hand-title' }, `A lapjaid (még ${view.bagCount} a zsákban)`),
          hand,
        ),
      );
    },
  };
})();
