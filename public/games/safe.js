// Széffeltörők rajzoló.
(() => {
  let draft = [];

  Renderers.safe = {
    render(area, view, ctx) {
      if (!ctx.myTurn) draft = [];
      const rerender = () => Renderers.safe.render(area, view, ctx);

      const clues = UI.el(
        'div',
        { class: 'clue-card' },
        UI.el('h3', {}, '🕵️ A titkos nyomaid'),
        view.myClues.length ? UI.el('ul', {}, view.myClues.map((c) => UI.el('li', {}, c))) : UI.el('p', { class: 'muted' }, 'Nincs nyomod.'),
        UI.el('p', { class: 'muted' }, 'Csak te látod őket – írd meg a chaten a többieknek!'),
      );

      const display = UI.el(
        'div',
        { class: 'code-display' },
        Array.from({ length: view.length }, (_, i) => {
          const d = view.code ? view.code[i] : draft[i];
          return UI.el('span', { class: `code-digit ${d ? '' : 'empty'}` }, d ? String(d) : '·');
        }),
      );

      const pad = ctx.myTurn
        ? UI.el(
            'div',
            { class: 'keypad' },
            Array.from({ length: view.maxDigit }, (_, i) =>
              UI.el(
                'button',
                {
                  disabled: draft.length >= view.length,
                  onclick: () => {
                    draft.push(i + 1);
                    rerender();
                  },
                },
                String(i + 1),
              ),
            ),
            UI.el(
              'button',
              {
                class: 'secondary',
                disabled: !draft.length,
                onclick: () => {
                  draft.pop();
                  rerender();
                },
              },
              '⌫',
            ),
            UI.el(
              'button',
              {
                class: 'try',
                disabled: draft.length !== view.length,
                onclick: () => {
                  const code = draft;
                  draft = [];
                  ctx.send({ type: 'guess', code });
                },
              },
              '🔑 Próba!',
            ),
          )
        : null;

      const left = view.attempts - view.guesses.length;
      const history = UI.el(
        'table',
        { class: 'guess-table' },
        UI.el('tr', {}, UI.el('th', {}, '#'), UI.el('th', {}, 'Ki'), UI.el('th', {}, 'Tipp'), UI.el('th', {}, 'Eredmény')),
        view.guesses.map((g, i) =>
          UI.el(
            'tr',
            {},
            UI.el('td', {}, String(i + 1)),
            UI.el('td', {}, UI.dot(ctx.color(g.seat)), ` ${ctx.name(g.seat)}`),
            UI.el('td', { class: 'mono' }, g.guess.join(' ')),
            UI.el('td', { class: 'pegs' }, '●'.repeat(g.exact), UI.el('span', { class: 'near' }, '○'.repeat(g.near)), g.exact + g.near === 0 ? '–' : ''),
          ),
        ),
      );

      const alarm = UI.el(
        'div',
        { class: 'alarm' },
        Array.from({ length: view.attempts }, (_, i) => UI.el('span', { class: `alarm-light ${i < view.guesses.length ? 'used' : ''}` })),
        UI.el('span', { class: 'muted' }, view.finished ? '' : ` Még ${left} próbálkozás`),
      );

      const hint = ctx.myTurn ? 'Te tippelsz! Írd be a kódot a gombokkal.' : view.finished ? '' : `${ctx.name(view.turn)} tippel – segítsetek neki a chaten!`;

      area.replaceChildren(
        UI.el(
          'div',
          { class: 'safe' },
          UI.el('div', { class: 'safe-top' }, UI.el('div', { class: 'safe-door' }, UI.el('div', { class: 'safe-dial' }, view.finished && view.winners.length ? '🔓' : '🔒'), display, pad, alarm), clues),
          UI.el('p', { class: 'hint' }, hint),
          UI.el('p', { class: 'muted' }, '● = jó számjegy jó helyen · ○ = jó számjegy rossz helyen'),
          view.guesses.length ? history : null,
        ),
      );
    },
  };
})();
