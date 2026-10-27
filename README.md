# 🎲 Társasozó – online társasjátékok a haverokkal

Böngészőben játszható társasjátékok: mindenki a saját gépéről vagy telefonjáról játszik, egy közös szobában.

## Játékok

| Játék | Létszám | |
|---|---|---|
| 🎲 **Ki nevet a végén?** | 2–4 fő | A klasszikus: vidd haza mind a 4 bábudat, és üsd ki a többieket! |
| 🦹 **Tolvajok éjszakája** | 2–6 fő | Blöffös tolvajjáték: rabold ki a legjobb házat, de ne ott, ahol a rendőr les! |
| 🎈 **Lufi** | 2–6 fő | Kockáztatós pumpálós játék. |
| ⛏️ **Kincsásók** | 2–6 fő | Dedukciós kincskeresés titkos nyomokkal. |
| 🔟 **Tízes** | 2–4 fő | Laprakós játék: foglalj tízesekkel! |
| 🔐 **Széffeltörők** | 1–6 fő | Kooperatív kódfejtés. |
| 🚩 **Aknapárbaj** | 2–4 fő | Versengő aknakereső. |
| 🃏 **Makaó** | 2–6 fő | Kártyajáték: szabadulj meg elsőként a lapjaidtól (7-es: húzz kettőt, ász: kimaradsz, bubi: színkérés). |
| 🎰 **Kockapóker** | 1–6 fő | Yahtzee: 5 kocka, 3 dobás, 13 kategória. |
| 🚢 **Torpedó** | 2 fő | Süllyeszd el az ellenfél rejtett flottáját! |
| 🔲 **Pontok és dobozok** | 2–4 fő | Húzz vonalakat, és zárd be a legtöbb dobozt! |
| ⚪ **Malom** | 2 fő | Rakj ki hármas sorokat, és vedd le az ellenfél bábuit! |
| 👑 **Dáma** | 2 fő | Kötelező ütés, többes ütés, repülő dáma. |
| ❌ **Amőba** | 2 fő | 5 egy sorban, 15×15-ös táblán. |
| 🔴 **Négy a sorban** | 2 fő | Dobd be a korongokat, és rakj ki négyet egy vonalban! |

A részletes szabályok a játékban, a **Szabályok** résznél olvashatók.

### 🦹 Tolvajok éjszakája

- Mindenki 5 arannyal kezd. Minden körben egy játékos a **rendőr** (körbe jár), a többiek **tolvajok**.
- A házakban minden körben gyűlik a zsákmány.
- Mindenki **titokban** választ egy házat: a tolvajok oda törnek be, a rendőr ott les. Ha mindenki választott, egyszerre derül ki minden.
- Akit a rendőr elkap, 3 arany bírságot fizet neki. Ha a rendőr senkit nem kap el, 1 arany fizetést kap.
- Aki **egyedül** tört be egy házba, viszi a teljes zsákmányát.
- Ha **többen** törnek be ugyanoda, összevesznek, és senki nem visz semmit – a zsákmány ott marad, és tovább nő.
- A játék végén a leggazdagabb nyer.

A lényeg a fejtörés: a nagy zsákmány mindenkit csábít, ezért oda veszélyes menni. A rendőr is tudja ezt…

### 🎈 Lufi

- 5 kör, minden körben egy új lufi, aminek titkos a teherbírása (8 és 24 pumpa között).
- Amikor sorra kerülsz, 1, 2 vagy 3-at pumpálsz – minden pumpa 1 pont –, vagy kiszállsz, és elteszed a kör pontjaidat.
- Akinél kidurran a lufi, elveszíti az abban a körben gyűjtött pontjait.

### ⛏️ Kincsásók

- Kincsek vannak elrejtve a térképen. Felváltva ástok; ha kincset találsz, a tiéd.
- Ha nem, csak TE látod, hány lépésre van a legközelebbi még el nem vitt kincs.
- A többiek gödreit látod (a számaikat nem) – abból is lehet következtetni, hová érdemes ásni.

### 🔟 Tízes

- Mindenkinek 3 titkos számlapja van (1–9). Felváltva leraktok egyet a táblára.
- **Tízes:** ha a lerakott lap és egy szomszédos ellenfél-lap összege 10, elfoglalod.
- **Összeg:** ha két szomszédos ellenfél-lap összege pont a lerakott lap, mindkettőt elfoglalod.
- Tele táblánál az nyer, akinek a legtöbb lapja van.

### 🔐 Széffeltörők (csapatjáték)

- Egy titkos 4 jegyű kód (1–6 számjegyek). Mindenki kap titkos nyomokat, amiket a chaten megoszthat.
- Sorban tippeltek: ● = jó számjegy jó helyen, ○ = jó számjegy rossz helyen.
- 8 próbálkozásotok van, utána megszólal a riasztó. Vagy mindenki nyer, vagy senki.

### 🚩 Aknapárbaj

- Közös aknamező. Felfedés: +1 pont, aknára lépés: −3.
- Jó zászló egy aknára: +3, és újra jössz. Rossz zászló: −2.
- Az első felfedés mindig biztonságos.

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
