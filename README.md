# 🎲 Társasozó – online társasjátékok a haverokkal

Böngészőben játszható társasjátékok: mindenki a saját gépéről vagy telefonjáról játszik, egy közös szobában.

## Játékok

| Játék | Létszám | |
|---|---|---|
| 🎲 **Ki nevet a végén?** | 2–4 fő | A klasszikus: vidd haza mind a 4 bábudat, és üsd ki a többieket! |
| 🦹 **Tolvajok éjszakája** ✨ | 2–6 fő | **Saját találmány.** Blöffös tolvajjáték, lásd lent. |
| 🎰 **Kockapóker** | 1–6 fő | Yahtzee: 5 kocka, 3 dobás, 13 kategória. |
| ⚪ **Malom** | 2 fő | Rakj ki hármas sorokat, és vedd le az ellenfél bábuit! |
| ❌ **Amőba** | 2 fő | 5 egy sorban, 15×15-ös táblán. |
| 🔴 **Négy a sorban** | 2 fő | Dobd be a korongokat, és rakj ki négyet egy vonalban! |

A részletes szabályok a játékban, a **Szabályok** résznél olvashatók.

### 🦹 Tolvajok éjszakája (saját találmány)

- Mindenki 5 arannyal kezd. Minden körben egy játékos a **rendőr** (körbe jár), a többiek **tolvajok**.
- A házakban minden körben gyűlik a zsákmány.
- Mindenki **titokban** választ egy házat: a tolvajok oda törnek be, a rendőr ott les. Ha mindenki választott, egyszerre derül ki minden.
- Akit a rendőr elkap, 3 arany bírságot fizet neki. Ha a rendőr senkit nem kap el, 1 arany fizetést kap.
- Aki **egyedül** tört be egy házba, viszi a teljes zsákmányát.
- Ha **többen** törnek be ugyanoda, összevesznek, és senki nem visz semmit – a zsákmány ott marad, és tovább nő.
- A játék végén a leggazdagabb nyer.

A lényeg a fejtörés: a nagy zsákmány mindenkit csábít, ezért oda veszélyes menni. A rendőr is tudja ezt…

## Hogyan működik?

1. Írd be a neved, és kattints egy játékra a főoldalon – ezzel létrejön egy szoba.
2. A **Link másolása** gombbal küldd el a linket a haverjaidnak (vagy csak mondd meg a 4 betűs kódot).
3. Ha mindenki bent van, a házigazda (👑) elindítja a játékot. Indítás előtt, és egy játék után is, a házigazda másik játékot választhat a szobában.

Van beépített chat is, és ha valakinek megszakad a kapcsolata vagy újratölti az oldalt, visszakerül a helyére. Ha valaki végleg kilépett, a házigazda a **Játék befejezése** gombbal visszaléphet a váróba.

## Futtatás a saját gépeden

Kell hozzá [Node.js](https://nodejs.org) (18 vagy újabb).

```bash
npm install
npm start
```

Ezután nyisd meg: http://localhost:3000. Ugyanazon a wifin lévő haverok a géped IP-címével érik el (pl. `http://192.168.1.23:3000`).

Tesztek: `npm test`

## Felrakás az internetre (hogy bárhonnan játszhassatok)

Bármelyik Node.js-t támogató tárhely jó, ami kezeli a WebSocketet, pl. **Render**:

1. [render.com](https://render.com) → *New* → *Web Service* → válaszd ki ezt a GitHub repót.
2. Build command: `npm install`, Start command: `npm start`.
3. Kész – a kapott `https://...onrender.com` linket küldd el a haveroknak.

A szerver a `PORT` környezeti változót használja, ha a tárhely megadja.

> Megjegyzés: a szobák a szerver memóriájában vannak, így a szerver újraindulásakor elvesznek.

## Új játék hozzáadása

1. `src/games/<id>.js`: a játék logikája (`create`, `act`, `view`, lásd a meglévőket), és vedd fel a `src/games/index.js`-be.
2. `public/games/<id>.js`: a rajzoló, ami `Renderers.<id>.render(area, view, ctx)` néven regisztrálja magát. Töltsd be az `index.html`-ben.
