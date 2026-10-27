// Lufi rajzoló.
(() => {
  Renderers.balloon = {
    render(area, view, ctx) {
      const fill = view.air / view.maxCapacity; // 0..1
      const r = 18 + fill * 42;
      const danger = view.air >= view.minCapacity;
      const svg = UI.svg('svg', { viewBox: '0 0 140 160', class: `balloon-svg ${danger ? 'danger' : ''}` });
      svg.append(
        UI.svg('path', { d: `M70 ${80 + r} q -6 20 4 40 q 8 16 -2 36`, class: 'balloon-string' }),
        UI.svg('ellipse', { cx: 70, cy: 80, rx: r, ry: r * 1.12, class: 'balloon-body', style: { fill: `hsl(${210 - fill * 210} 75% 58%)` } }),
        UI.svg('ellipse', { cx: 70 - r * 0.35, cy: 80 - r * 0.45, rx: r * 0.18, ry: r * 0.3, class: 'balloon-shine' }),
        UI.svg('path', { d: `M64 ${80 + r * 1.1} l6 7 l6 -7 z`, class: 'balloon-knot', style: { fill: `hsl(${210 - fill * 210} 75% 45%)` } }),
      );

      const canAct = ctx.myTurn;
      const buttons = UI.el(
        'div',
        { class: 'row center balloon-actions' },
        [1, 2, 3].map((n) => UI.el('button', { disabled: !canAct, onclick: () => ctx.send({ type: 'pump', count: n }) }, `🎈 +${n} pumpa`)),
        UI.el('button', { class: 'secondary', disabled: !canAct, onclick: () => ctx.send({ type: 'leave' }) }, '🏃 Kiszállok'),
      );

      const players = UI.el(
        'table',
        { class: 'score-table' },
        UI.el('tr', {}, UI.el('th', {}, ''), UI.el('th', {}, 'Ebben a körben'), UI.el('th', {}, 'Összesen')),
        view.scores.map((total, s) =>
          UI.el(
            'tr',
            { class: s === view.turn ? 'current' : '' },
            UI.el('td', {}, UI.dot(ctx.color(s)), ` ${ctx.name(s)}`, view.inRound[s] ? '' : ' 🏃'),
            UI.el('td', {}, view.inRound[s] ? `🎈 ${view.pot[s]}` : `✅ ${view.pot[s]}`),
            UI.el('td', {}, UI.el('b', {}, String(total))),
          ),
        ),
      );

      const history = view.history.length
        ? UI.el(
            'p',
            { class: 'muted' },
            'Eddigi lufik: ',
            view.history.map((h) => `${h.capacity} pumpa${h.burstBy === null ? ' (nem durrant ki)' : ` (${ctx.name(h.burstBy)})`}`).join(' · '),
          )
        : null;

      const hint = ctx.myTurn ? (view.pot[ctx.mySeat] ? `Ebben a körben ${view.pot[ctx.mySeat]} pontod van a lufiban. Kockáztatsz még?` : 'Pumpálj, vagy szállj ki!') : '';

      area.replaceChildren(
        UI.el(
          'div',
          { class: 'balloon' },
          UI.el('div', { class: 'round' }, `🎈 ${view.round}. lufi / ${view.rounds}`),
          UI.el('div', { class: 'balloon-stage' }, svg, UI.el('div', { class: 'air' }, UI.el('b', {}, `${view.air} pumpa`), UI.el('span', { class: 'muted' }, ` – valahol ${view.minCapacity} és ${view.maxCapacity} között durran`))),
          view.lastAction ? UI.el('p', { class: 'muted center' }, `${ctx.name(view.lastAction.seat)} ${view.lastAction.text}`) : null,
          buttons,
          UI.el('p', { class: 'hint' }, hint),
          players,
          history,
        ),
      );
    },
  };
})();
