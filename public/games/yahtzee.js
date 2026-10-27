// Kockapóker rajzoló: kockák + pontozólap.
(() => {
  let lastDice = null;

  Renderers.yahtzee = {
    render(area, view, ctx) {
      const rolled = view.rollsLeft < 3;
      const diceKey = view.dice.join('');
      const changed = diceKey !== lastDice;
      lastDice = diceKey;

      const dice = UI.el(
        'div',
        { class: 'dice-row' },
        view.dice.map((d, i) =>
          UI.el(
            'button',
            {
              class: `die-btn ${view.held[i] ? 'held' : ''}`,
              disabled: !ctx.myTurn || !rolled,
              onclick: () => ctx.send({ type: 'hold', die: i }),
              title: 'Megtartás',
            },
            UI.dice(d, changed && rolled && !view.held[i] ? 'rolling' : ''),
            UI.el('span', { class: 'held-label' }, view.held[i] ? 'tartva' : ''),
          ),
        ),
      );

      const canRoll = ctx.myTurn && view.rollsLeft > 0;
      const rollBtn = UI.el(
        'button',
        { class: 'big-btn', disabled: !canRoll, onclick: () => ctx.send({ type: 'roll' }) },
        rolled ? `Újradobás (${view.rollsLeft} maradt)` : 'Dobás!',
      );

      let hint = '';
      if (ctx.myTurn) {
        hint = !rolled
          ? 'Dobj a kockákkal!'
          : view.rollsLeft > 0
            ? 'Kattints a kockákra a megtartáshoz, dobj újra, vagy írd be az eredményt a táblázatba!'
            : 'Írd be az eredményt egy üres sorba!';
      }

      const seats = view.sheets.map((_, i) => i);
      const head = UI.el(
        'tr',
        {},
        UI.el('th', {}, ''),
        seats.map((s) => UI.el('th', { class: s === view.turn ? 'current' : '' }, UI.dot(ctx.color(s)), ' ', ctx.name(s))),
      );
      const rows = [];
      view.categories.forEach((cat, idx) => {
        if (idx === 6) {
          rows.push(sumRow('Felső rész', seats, (s) => view.totals[s].upper), sumRow('Bónusz (63+)', seats, (s) => view.totals[s].bonus));
        }
        rows.push(
          UI.el(
            'tr',
            {},
            UI.el('td', { class: 'cat' }, cat.name),
            seats.map((s) => {
              const value = view.sheets[s][cat.id];
              if (value !== undefined) return UI.el('td', { class: 'filled' }, String(value));
              if (s === ctx.mySeat && ctx.myTurn && view.preview) {
                const pts = view.preview[cat.id];
                return UI.el(
                  'td',
                  { class: `option ${pts ? '' : 'zero'}`, onclick: () => ctx.send({ type: 'score', category: cat.id }), title: 'Beírás' },
                  String(pts),
                );
              }
              return UI.el('td', {}, '');
            }),
          ),
        );
      });
      rows.push(sumRow('Összesen', seats, (s) => view.totals[s].total, 'total'));

      area.replaceChildren(
        UI.el(
          'div',
          { class: 'yahtzee' },
          UI.el('div', { class: 'dice-panel' }, dice, rollBtn, UI.el('p', { class: 'muted' }, hint)),
          UI.el('div', { class: 'sheet-wrap' }, UI.el('table', { class: 'sheet' }, UI.el('thead', {}, head), UI.el('tbody', {}, rows))),
        ),
      );
    },
  };

  function sumRow(label, seats, value, cls = 'sum') {
    return UI.el('tr', { class: cls }, UI.el('td', { class: 'cat' }, label), seats.map((s) => UI.el('td', {}, String(value(s)))));
  }
})();
