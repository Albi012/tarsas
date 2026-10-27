// Makaó rajzoló.
(() => {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = { 11: 'B', 12: 'D', 13: 'K', 14: 'A' };
  let pickingSuitFor = null; // a bubi indexe, amihez színt választunk

  function cardEl(card, attrs = {}) {
    const red = card.s === 1 || card.s === 2;
    const label = RANKS[card.r] || String(card.r);
    return UI.el(
      'button',
      { ...attrs, class: `playing-card ${red ? 'red' : ''} ${attrs.class || ''}` },
      UI.el('span', { class: 'corner' }, label, UI.el('br'), SUITS[card.s]),
      UI.el('span', { class: 'center-suit' }, SUITS[card.s]),
    );
  }

  Renderers.makao = {
    render(area, view, ctx) {
      if (!ctx.myTurn || !view.hand[pickingSuitFor] || view.hand[pickingSuitFor].r !== 11) pickingSuitFor = null;
      const rerender = () => Renderers.makao.render(area, view, ctx);

      const opponents = UI.el(
        'div',
        { class: 'opponents' },
        view.handCounts.map((n, seat) =>
          seat === ctx.mySeat
            ? null
            : UI.el(
                'div',
                { class: `opponent ${view.turn === seat ? 'current' : ''}` },
                UI.dot(ctx.color(seat)),
                ` ${ctx.name(seat)} `,
                UI.el('span', { class: 'mini-backs' }, Array.from({ length: Math.min(n, 12) }, () => UI.el('span', { class: 'mini-back' }))),
                UI.el('b', {}, ` ${n}`),
              ),
        ),
      );

      const canDraw = ctx.myTurn;
      const table = UI.el(
        'div',
        { class: 'card-table' },
        UI.el(
          'button',
          { class: 'deck', disabled: !canDraw, onclick: () => ctx.send({ type: 'draw' }), title: 'Húzás' },
          UI.el('span', {}, view.pendingDraw ? `Húzz ${view.pendingDraw}-t` : 'Húzás'),
          UI.el('small', {}, `${view.deckCount} lap`),
        ),
        cardEl(view.top, { class: 'top-card', disabled: true }),
        UI.el(
          'div',
          { class: 'table-info' },
          view.wish !== null ? UI.el('div', { class: `wish ${view.wish === 1 || view.wish === 2 ? 'red' : ''}` }, 'Kért szín: ', UI.el('b', {}, SUITS[view.wish])) : null,
          view.pendingDraw ? UI.el('div', { class: 'pending' }, `+${view.pendingDraw} húzás vár!`) : null,
          view.lastAction ? UI.el('div', { class: 'muted' }, `${ctx.name(view.lastAction.seat)} ${view.lastAction.text}`) : null,
        ),
      );

      const hand = UI.el(
        'div',
        { class: 'hand' },
        view.hand.map((card, i) => {
          const playable = view.playable.includes(i);
          return cardEl(card, {
            class: playable ? 'playable' : '',
            disabled: !playable,
            onclick: () => {
              if (card.r === 11) {
                pickingSuitFor = pickingSuitFor === i ? null : i;
                rerender();
              } else {
                ctx.send({ type: 'play', card: i });
              }
            },
          });
        }),
      );

      const suitPicker =
        pickingSuitFor !== null
          ? UI.el(
              'div',
              { class: 'suit-picker' },
              'Milyen színt kérsz? ',
              SUITS.map((s, si) =>
                UI.el('button', { class: si === 1 || si === 2 ? 'red' : '', onclick: () => ctx.send({ type: 'play', card: pickingSuitFor, suit: si }) }, s),
              ),
            )
          : null;

      let hint = '';
      if (ctx.myTurn) {
        if (view.pendingDraw) hint = view.playable.length ? 'Tegyél rá egy 7-est, vagy húzd fel a lapokat!' : `Nincs 7-esed – húzz ${view.pendingDraw} lapot!`;
        else hint = view.playable.length ? 'Kattints egy kiemelt lapra, vagy húzz!' : 'Nincs rakható lapod – húzz egyet!';
      }

      area.replaceChildren(
        UI.el('div', { class: 'makao' }, opponents, table, UI.el('p', { class: 'hint' }, hint), suitPicker, UI.el('h3', { class: 'hand-title' }, `A lapjaid (${view.hand.length})`), hand),
      );
    },
  };
})();
