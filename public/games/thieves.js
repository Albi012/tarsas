// Tolvajok éjszakája rajzoló.
(() => {
  Renderers.thieves = {
    render(area, view, ctx) {
      const isPolice = ctx.mySeat === view.police;
      const canChoose = !view.finished && ctx.mySeat !== null;

      const houses = UI.el(
        'div',
        { class: 'houses' },
        view.houses.map((loot, i) =>
          UI.el(
            'button',
            {
              class: `house ${view.myChoice === i ? 'chosen' : ''} ${isPolice ? 'police-mode' : ''}`,
              disabled: !canChoose,
              onclick: () => ctx.send({ type: 'choose', house: i }),
            },
            UI.el('span', { class: 'house-icon' }, view.myChoice === i ? (isPolice ? '👮' : '🦹') : '🏠'),
            UI.el('span', { class: 'house-name' }, `${i + 1}. ház`),
            UI.el('span', { class: 'loot' }, `💰 ${loot}`),
          ),
        ),
      );

      let role = '';
      if (view.finished) role = 'Vége a játéknak!';
      else if (isPolice) role = '👮 Te vagy a rendőr! Válaszd ki titokban, melyik háznál lesel.';
      else if (ctx.mySeat !== null) role = `🦹 Tolvaj vagy. Válassz titokban egy házat! A rendőr most: ${ctx.name(view.police)}.`;
      let picked = '';
      if (!view.finished && view.myChoice !== null) picked = 'Választottál – amíg a többiek gondolkodnak, még meggondolhatod magad.';

      const scores = UI.el(
        'div',
        { class: 'coins' },
        view.coins.map((c, s) =>
          UI.el(
            'div',
            { class: `coin-row ${s === view.police && !view.finished ? 'is-police' : ''}` },
            UI.dot(ctx.color(s)),
            UI.el('span', { class: 'coin-name' }, `${ctx.name(s)}${s === view.police && !view.finished ? ' 👮' : ''}`),
            !view.finished && UI.el('span', { class: 'muted' }, view.chosen[s] ? '✓ választott' : '…'),
            UI.el('strong', {}, `${c} 💰`),
          ),
        ),
      );

      const last = view.lastRound;
      const lastBox = last
        ? UI.el(
            'div',
            { class: 'last-round' },
            UI.el('h3', {}, `Az előző kör (${last.round}.) eredménye`),
            UI.el(
              'div',
              { class: 'reveal' },
              last.choices.map((h, s) =>
                UI.el(
                  'span',
                  { class: 'reveal-item' },
                  UI.dot(ctx.color(s)),
                  ` ${ctx.name(s)} ${s === last.police ? '👮' : '🦹'} → ${h + 1}. ház `,
                  UI.el('b', { class: last.gains[s] > 0 ? 'plus' : last.gains[s] < 0 ? 'minus' : '' }, last.gains[s] > 0 ? `+${last.gains[s]}` : String(last.gains[s])),
                ),
              ),
            ),
            UI.el('ul', {}, last.lines.map((l) => UI.el('li', {}, l))),
          )
        : null;

      area.replaceChildren(
        UI.el(
          'div',
          { class: 'thieves' },
          UI.el('div', { class: 'round' }, `🌙 ${Math.min(view.round, view.rounds)}. éjszaka / ${view.rounds}`),
          UI.el('p', { class: 'role' }, role),
          houses,
          UI.el('p', { class: 'muted' }, picked),
          scores,
          lastBox,
        ),
      );
    },
  };
})();
