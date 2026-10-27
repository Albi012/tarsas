// Amőba és Négy a sorban rajzoló.
(() => {
  function renderGrid(area, view, ctx, { gravity, marks }) {
    const { width, height } = view;
    const win = new Set(view.winLine || []);
    const board = UI.el('div', {
      class: `grid-board ${gravity ? 'c4' : 'amoba'}`,
      style: { gridTemplateColumns: `repeat(${width}, 1fr)` },
    });

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const who = view.board[i];
        const free = gravity ? view.board[x] === -1 : who === -1;
        const classes = ['grid-cell'];
        if (i === view.lastMove) classes.push('last');
        if (win.has(i)) classes.push('win');
        if (ctx.myTurn && free) classes.push('playable');
        const content =
          who === -1
            ? null
            : marks
              ? UI.el('span', { class: 'mark', style: { color: ctx.color(who) } }, marks[who])
              : UI.el('span', { class: 'disc', style: { background: ctx.color(who) } });
        board.append(
          UI.el(
            'div',
            { class: classes.join(' '), onclick: ctx.myTurn && free ? () => ctx.send({ type: 'place', x, y }) : undefined },
            content,
          ),
        );
      }
    }

    const legend = UI.el(
      'div',
      { class: 'legend' },
      [0, 1].map((seat) =>
        UI.el(
          'span',
          {},
          marks ? UI.el('b', { style: { color: ctx.color(seat) } }, marks[seat]) : UI.dot(ctx.color(seat)),
          ` ${ctx.name(seat)}`,
        ),
      ),
    );
    area.replaceChildren(UI.el('div', { class: 'grid-game' }, legend, board));
  }

  Renderers.amoba = {
    render: (area, view, ctx) => renderGrid(area, view, ctx, { gravity: false, marks: ['✕', '◯'] }),
  };
  Renderers.connect4 = {
    render: (area, view, ctx) => renderGrid(area, view, ctx, { gravity: true }),
  };
})();
