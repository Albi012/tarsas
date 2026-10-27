// Malom rajzoló. Lépésnél előbb a saját bábura, aztán a cél pontra kell kattintani.
(() => {
  let selected = null;

  Renderers.malom = {
    render(area, view, ctx) {
      if (!ctx.myTurn || view.phase !== 'move' || view.board[selected] !== ctx.mySeat) selected = null;

      const svg = UI.svg('svg', { viewBox: '-0.6 -0.6 7.2 7.2', class: 'malom-board' });
      for (const [a, , c] of view.mills) {
        const [x1, y1] = view.points[a];
        const [x2, y2] = view.points[c];
        svg.append(UI.svg('line', { x1, y1, x2, y2, class: 'malom-line' }));
      }

      const targets = new Set();
      if (selected !== null) {
        view.board.forEach((p, i) => {
          if (p === -1 && (view.canFly || view.adjacent[selected].includes(i))) targets.add(i);
        });
      }

      view.points.forEach(([x, y], i) => {
        const who = view.board[i];
        let onclick;
        let cls = 'malom-point';
        if (ctx.myTurn) {
          if (view.phase === 'remove' && view.removable.includes(i)) {
            cls += ' removable';
            onclick = () => ctx.send({ type: 'remove', at: i });
          } else if (view.phase === 'place' && who === -1) {
            cls += ' target';
            onclick = () => ctx.send({ type: 'place', at: i });
          } else if (view.phase === 'move' && who === ctx.mySeat) {
            cls += ' own';
            onclick = () => {
              selected = selected === i ? null : i;
              Renderers.malom.render(area, view, ctx);
            };
          } else if (targets.has(i)) {
            cls += ' target';
            onclick = () => ctx.send({ type: 'move', from: selected, to: i });
          }
        }
        if (who === -1) {
          svg.append(UI.svg('circle', { cx: x, cy: y, r: 0.13, class: `${cls} empty`, onclick }));
        } else {
          if (i === selected) cls += ' selected';
          if (i === view.lastMove) cls += ' last';
          svg.append(UI.svg('circle', { cx: x, cy: y, r: 0.3, class: `${cls} stone`, style: { fill: ctx.color(who) }, onclick }));
        }
      });

      let hint = '';
      if (ctx.myTurn) {
        if (view.phase === 'remove') hint = 'Malom! Kattints egy ellenfél-bábura, hogy levedd.';
        else if (view.phase === 'place') hint = `Rakj le egy bábut egy üres pontra! (még ${view.toPlace[ctx.mySeat]} db)`;
        else if (selected === null) hint = view.canFly ? 'Már csak 3 bábud van: bárhová ugorhatsz! Válassz bábut.' : 'Válaszd ki, melyik bábuddal lépsz!';
        else hint = 'Most kattints a cél pontra!';
      } else if (view.finished && view.reason) {
        hint = view.reason;
      }

      const info = UI.el(
        'div',
        { class: 'legend' },
        [0, 1].map((seat) =>
          UI.el('span', {}, UI.dot(ctx.color(seat)), ` ${ctx.name(seat)}: ${view.onBoard[seat]} a táblán, ${view.toPlace[seat]} kézben`),
        ),
      );
      area.replaceChildren(UI.el('div', { class: 'malom' }, info, UI.el('div', { class: 'board-wrap' }, svg), UI.el('p', { class: 'hint' }, hint)));
    },
  };
})();
