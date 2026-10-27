# 🎲 Ki nevet a végén? – online

Böngészőben játszható "Ki nevet a végén?" (Ludo), amit a haverjaiddal tudsz játszani, mindenki a saját gépéről/telefonjáról.

## Hogyan működik?

1. Írd be a neved, és kattints az **Új szoba létrehozása** gombra.
2. A **Link másolása** gombbal küldd el a linket a haverjaidnak (vagy csak mondd meg a 4 betűs kódot).
3. Ha mindenki bent van (2–4 fő), a házigazda (👑) elindítja a játékot.

Van beépített chat is, és ha valakinek megszakad a kapcsolata vagy újratölti az oldalt, visszakerül a helyére.

## Szabályok

- Házból csak **hatossal** lehet kijönni. Ha nincs bábud a pályán, **3-szor** dobhatsz.
- **Hatos után újra dobhatsz.**
- Ha ellenfél bábujára lépsz, **kiütöd** – visszamegy a házába.
- Saját bábudra nem léphetsz, és a célegyenesben nem lehet túllépni a végét.
- Az nyer, aki elsőként beviszi mind a 4 bábuját.

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
