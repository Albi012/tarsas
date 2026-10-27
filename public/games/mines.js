// Aknapárbaj rajzoló. Felfedés / zászló mód között lehet váltani (jobb klikk = zászló).
(() => {
  let mode = 'reveal';
  const NUM_COLORS = ['', '#1d5fd6', '#2e8b3a', '#d23a3a', '#5a2ca0', '#8a3b12', '#138a8a', '#222', '#666'];

  Renderers.mines = {
    render(area, view, ctx) {
      const { size } = view;
      const leftover = new Set(view.mines);
      const rerender = () => Renderers.mines.render(area, view, ctx);

      const grid = UI.el('div', { class: 'mine-grid', style: { gridTemplateColumns: `repeat(${size}, 1fr)` } });
      view.cells.forEach((cell, i) => {
        const cls = ['mine-cell'];
        let content = null;
        let onclick;
        let oncontextmenu;
        if (!cell) {
          cls.push('closed');
          if (leftover.has(i)) content = '💣';
          if (ctx.myTurn) {
            cls.push('active');
            onclick = () => ctx.send({ type: mode, cell: i });
            oncontextmenu = (e) => {
              e.preventDefault();
              ctx.send({ type: 'flag', cell: i });
            };
          }
        } else if (cell.type === 'open') {
          cls.push('open');
          if (cell.n) content = UI.el('b', { style: { color: NUM_COLORS[cell.n] } }, String(cell.n));
        } else if (cell.type === 'flag') {
          cls.push('flagged');
          content = UI.el('span', { class: 'flag', style: { background: ctx.color(cell.seat) } }, '🚩');
        } else if (cell.type === 'boom') {
          cls.push('boom');
          content = UI.el('span', { class: 'flag', style: { background: ctx.color(cell.seat) } }, '💥');
        }
        if (view.last && view.last.cell === i) cls.push('last');
        grid.append(UI.el('div', { class: cls.join(' '), onclick, oncontextmenu }, content));
      });

      const modes = UI.el(
        'div',
        { class: 'row center mode-switch' },
        UI.el('button', { class: mode === 'reveal' ? '' : 'secondary', onclick: () => ((mode = 'reveal'), rerender()) }, '⛏️ Felfedés'),
        UI.el('button', { class: mode === 'flag' ? '' : 'secondary', onclick: () => ((mode = 'flag'), rerender()) }, '🚩 Zászló'),
      );

      const legend = UI.el(
        'div',
        { class: 'legend' },
        view.scores.map((sc, s) => UI.el('span', {}, UI.dot(ctx.color(s)), ` ${ctx.name(s)}: `, UI.el('b', {}, String(sc)))),
        UI.el('span', { class: 'muted' }, `💣 ${view.minesLeft} akna maradt`),
      );
      const hint = ctx.myTurn
        ? mode === 'reveal'
          ? 'Fedj fel egy mezőt (+1), vagy válts zászlóra! (Jobb klikk = zászló)'
          : 'Jelölj meg egy aknát: ha eltalálod +3 és újra jössz, ha nem −2.'
        : '';

      area.replaceChildren(UI.el('div', { class: 'mines' }, legend, ctx.myTurn ? modes : null, UI.el('div', { class: 'board-wrap' }, grid), UI.el('p', { class: 'hint' }, hint)));
    },
  };
})();
