// Pontok és dobozok rajzoló (SVG).
(() => {
  const PAD = 0.4;
  const HIT = 0.3; // a vonalak kattintható sávjának fél-szélessége

  Renderers.dots = {
    render(area, view, ctx) {
      const { w, h } = view;
      const svg = UI.svg('svg', { viewBox: `${-PAD} ${-PAD} ${w + 2 * PAD} ${h + 2 * PAD}`, class: 'dots-board' });
      const last = view.lastLine;

      view.boxes.forEach((row, y) =>
        row.forEach((owner, x) => {
          if (owner === -1) return;
          svg.append(UI.svg('rect', { x: x + 0.06, y: y + 0.06, width: 0.88, height: 0.88, rx: 0.08, class: 'box', style: { fill: ctx.color(owner) } }));
        }),
      );

      const line = (dir, x, y, owner) => {
        const [x1, y1, x2, y2] = dir === 'h' ? [x, y, x + 1, y] : [x, y, x, y + 1];
        const isLast = last && last.dir === dir && last.x === x && last.y === y;
        if (owner !== -1) {
          svg.append(UI.svg('line', { x1, y1, x2, y2, class: `drawn ${isLast ? 'last' : ''}`, style: { stroke: ctx.color(owner) } }));
          return;
        }
        svg.append(UI.svg('line', { x1, y1, x2, y2, class: 'guide' }));
        if (!ctx.myTurn) return;
        const g = UI.svg('g', { class: 'free-line', onclick: () => ctx.send({ type: 'line', dir, x, y }) });
        g.append(
          UI.svg('rect', dir === 'h'
            ? { x: x + 0.1, y: y - HIT, width: 0.8, height: 2 * HIT, class: 'hit' }
            : { x: x - HIT, y: y + 0.1, width: 2 * HIT, height: 0.8, class: 'hit' }),
          UI.svg('line', { x1, y1, x2, y2, class: 'ghost', style: { stroke: ctx.color(ctx.mySeat) } }),
        );
        svg.append(g);
      };
      view.hLines.forEach((row, y) => row.forEach((owner, x) => line('h', x, y, owner)));
      view.vLines.forEach((row, y) => row.forEach((owner, x) => line('v', x, y, owner)));

      for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) svg.append(UI.svg('circle', { cx: x, cy: y, r: 0.09, class: 'dot-point' }));

      const legend = UI.el(
        'div',
        { class: 'legend' },
        view.scores.map((s, seat) => UI.el('span', {}, UI.dot(ctx.color(seat)), ` ${ctx.name(seat)}: `, UI.el('b', {}, String(s)))),
      );
      const hint = ctx.myTurn ? 'Kattints két szomszédos pont közé egy vonalért!' : '';
      area.replaceChildren(UI.el('div', { class: 'dots' }, legend, UI.el('div', { class: 'board-wrap' }, svg), UI.el('p', { class: 'hint' }, hint)));
    },
  };
})();
