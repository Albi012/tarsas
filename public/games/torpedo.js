// Torpedó rajzoló: saját flotta + az ellenfél vizei.
(() => {
  const COLS = 'ABCDEFGHIJ';

  function board(view, cellFn) {
    const size = view.size;
    const grid = UI.el('div', { class: 'sea', style: { gridTemplateColumns: `repeat(${size + 1}, 1fr)` } });
    grid.append(UI.el('div', { class: 'sea-label' }));
    for (let x = 0; x < size; x++) grid.append(UI.el('div', { class: 'sea-label' }, COLS[x]));
    for (let y = 0; y < size; y++) {
      grid.append(UI.el('div', { class: 'sea-label' }, String(y + 1)));
      for (let x = 0; x < size; x++) grid.append(cellFn(y * size + x, x, y));
    }
    return grid;
  }

  Renderers.torpedo = {
    render(area, view, ctx) {
      const myCells = new Map();
      view.myShips.forEach((s) => s.cells.forEach((c) => myCells.set(c, s.sunk)));
      const sunkEnemy = new Set(view.sunkEnemy.flat());
      const enemyShips = new Set((view.enemyShips || []).flat());
      const last = view.lastShot;

      const own = board(view, (i) => {
        const shot = view.incoming[i];
        const cls = ['sea-cell'];
        if (myCells.has(i)) cls.push(myCells.get(i) ? 'ship sunk' : 'ship');
        if (shot === 'hit') cls.push('hit');
        if (shot === 'miss') cls.push('miss');
        if (last && last.seat !== ctx.mySeat && last.cell === i) cls.push('last');
        return UI.el('div', { class: cls.join(' ') });
      });

      if (view.phase === 'setup') {
        const ready = view.ready[ctx.mySeat];
        area.replaceChildren(
          UI.el(
            'div',
            { class: 'torpedo setup' },
            UI.el('h3', {}, 'A flottád'),
            UI.el('p', { class: 'muted' }, ready ? 'Kész vagy! Várakozás az ellenfélre…' : 'Ha nem tetszik az elrendezés, sorsold újra. Ha jó, nyomd meg a Kész gombot!'),
            UI.el('div', { class: 'sea-wrap' }, own),
            UI.el(
              'div',
              { class: 'row center' },
              UI.el('button', { disabled: ready, onclick: () => ctx.send({ type: 'shuffle' }) }, '🔀 Újrasorsolás'),
              UI.el('button', { disabled: ready, onclick: () => ctx.send({ type: 'ready' }) }, '✅ Kész!'),
            ),
          ),
        );
        return;
      }

      const enemy = board(view, (i, x, y) => {
        const shot = view.outgoing[i];
        const cls = ['sea-cell', 'enemy'];
        if (shot === 'hit') cls.push(sunkEnemy.has(i) ? 'hit sunk' : 'hit');
        if (shot === 'miss') cls.push('miss');
        if (shot === 'auto') cls.push('auto');
        if (!shot && enemyShips.has(i)) cls.push('ship revealed');
        if (last && last.seat === ctx.mySeat && last.cell === i) cls.push('last');
        const canShoot = ctx.myTurn && !shot;
        if (canShoot) cls.push('aim');
        return UI.el('div', { class: cls.join(' '), onclick: canShoot ? () => ctx.send({ type: 'shoot', x, y }) : undefined });
      });

      const other = 1 - ctx.mySeat;
      area.replaceChildren(
        UI.el(
          'div',
          { class: 'torpedo' },
          UI.el('p', { class: 'hint' }, ctx.myTurn ? '🎯 Lőj az ellenfél vizeire! Ha talált, újra lőhetsz.' : view.finished ? '' : `${ctx.name(other)} céloz…`),
          UI.el(
            'div',
            { class: 'seas' },
            UI.el('div', {}, UI.el('h3', {}, `🎯 ${ctx.name(other)} vizei – ${view.shipsLeft[other]} hajó maradt`), enemy),
            UI.el('div', {}, UI.el('h3', {}, `🚢 A flottád – ${view.shipsLeft[ctx.mySeat]} hajó maradt`), own),
          ),
        ),
      );
    },
  };
})();
