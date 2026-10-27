// Kincsásók rajzoló.
(() => {
  // a kis távolság "forró" (piros), a nagy "hideg" (kék)
  function heat(d) {
    const t = Math.min(d, 10) / 10;
    return `hsl(${t * 210} 80% ${55 + t * 10}%)`;
  }

  Renderers.digger = {
    render(area, view, ctx) {
      const { size } = view;
      const digs = new Map(view.digs.map((d) => [d.cell, d]));
      const found = new Map(view.found.map((f) => [f.cell, f.seat]));
      const hidden = new Set(view.hidden);

      const map = UI.el('div', { class: 'dig-map', style: { gridTemplateColumns: `repeat(${size}, 1fr)` } });
      for (let i = 0; i < size * size; i++) {
        const dig = digs.get(i);
        const cls = ['dig-cell'];
        let content = null;
        let onclick;
        if (found.has(i)) {
          cls.push('treasure');
          content = UI.el('span', { class: 'gem', style: { borderColor: ctx.color(found.get(i)) } }, '💎');
        } else if (dig) {
          cls.push('dug');
          if (dig.distance !== undefined && dig.distance !== null) {
            cls.push(dig.seat === ctx.mySeat ? 'mine' : 'revealed');
            content = UI.el('span', { class: 'dist', style: { background: heat(dig.distance), boxShadow: `inset 0 0 0 3px ${ctx.color(dig.seat)}` } }, String(dig.distance));
          } else {
            content = UI.el('span', { class: 'hole', style: { background: ctx.color(dig.seat) } });
          }
        } else if (hidden.has(i)) {
          cls.push('treasure missed');
          content = '💎';
        } else if (ctx.myTurn) {
          cls.push('diggable');
          onclick = () => ctx.send({ type: 'dig', cell: i });
        }
        if (i === view.lastDig) cls.push('last');
        map.append(UI.el('div', { class: cls.join(' '), onclick }, content));
      }

      const legend = UI.el(
        'div',
        { class: 'legend' },
        view.counts.map((c, s) => UI.el('span', {}, UI.dot(ctx.color(s)), ` ${ctx.name(s)}: ${'💎'.repeat(c) || '–'}`)),
        UI.el('span', { class: 'muted' }, `Még ${view.total - view.found.length} kincs van elrejtve`),
      );
      const hint = ctx.myTurn
        ? 'Kattints egy mezőre, hogy ott áss! A számaid megmutatják, milyen messze van a legközelebbi kincs.'
        : 'A színes pöttyök a többiek gödrei – a számukat nem látod, de abból is lehet következtetni, hová ásnak!';

      area.replaceChildren(UI.el('div', { class: 'digger' }, legend, UI.el('div', { class: 'board-wrap dig-wrap' }, map), UI.el('p', { class: 'muted center' }, hint)));
    },
  };
})();
