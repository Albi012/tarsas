// Dáma rajzoló. Mindenki a saját korongjait látja alul.
(() => {
  let selected = null;

  Renderers.dama = {
    render(area, view, ctx) {
      const { size } = view;
      const flip = ctx.mySeat === 1;
      const myMoves = ctx.myTurn ? view.moves : [];
      if (view.chain !== null && ctx.myTurn) selected = view.chain;
      if (!myMoves.some((m) => m.from === selected)) selected = null;
      const fromSet = new Set(myMoves.map((m) => m.from));
      const targets = new Map(myMoves.filter((m) => m.from === selected).map((m) => [m.to, m]));
      const captured = new Set(view.captured);
      const last = view.lastMove;

      const board = UI.el('div', { class: 'dama-board' });
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          const x = flip ? size - 1 - col : col;
          const y = flip ? size - 1 - row : row;
          const i = y * size + x;
          const dark = (x + y) % 2 === 1;
          const piece = view.board[i];
          const cls = ['dama-cell', dark ? 'dark' : 'light'];
          if (last && (last.from === i || last.to === i)) cls.push('last');
          let onclick;
          if (targets.has(i)) {
            cls.push('target');
            onclick = () => ctx.send({ type: 'move', from: selected, to: i });
          } else if (fromSet.has(i) && view.chain === null) {
            cls.push('can-move');
            onclick = () => {
              selected = selected === i ? null : i;
              Renderers.dama.render(area, view, ctx);
            };
          }
          board.append(
            UI.el(
              'div',
              { class: cls.join(' '), onclick },
              piece
                ? UI.el(
                    'span',
                    {
                      class: `dama-piece ${i === selected ? 'selected' : ''} ${captured.has(i) ? 'captured' : ''}`,
                      style: { background: ctx.color(piece.owner) },
                    },
                    piece.king ? '👑' : '',
                  )
                : null,
            ),
          );
        }
      }

      let hint = '';
      if (ctx.myTurn) {
        const mustCapture = myMoves.some((m) => m.capture);
        if (view.chain !== null) hint = 'Folytasd az ütést!';
        else if (selected === null) hint = mustCapture ? 'Ütni kötelező! Válaszd ki, melyik koronggal ütsz.' : 'Válaszd ki, melyik koronggal lépsz!';
        else hint = 'Kattints a cél mezőre!';
      } else if (view.finished && view.reason) {
        hint = view.reason;
      }

      const legend = UI.el(
        'div',
        { class: 'legend' },
        [0, 1].map((s) => UI.el('span', {}, UI.dot(ctx.color(s)), ` ${ctx.name(s)}: ${view.counts[s]} korong`)),
      );
      area.replaceChildren(UI.el('div', { class: 'dama' }, legend, board, UI.el('p', { class: 'hint' }, hint)));
    },
  };
})();
