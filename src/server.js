const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { games, catalog } = require('./games');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ROOM_TTL_MS = 1000 * 60 * 60; // üres szoba törlése 1 óra után

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.normalize(path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404).end('Nincs ilyen oldal');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

// code -> { code, gameId, players: [{id, name, ws, seat}], hostId, state, emptySince }
// `state` a futó játék belső állapota (null, ha még nem indult el).
const rooms = new Map();

function newCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(room, msg) {
  for (const p of room.players) send(p.ws, msg);
}

function systemMessage(room, text) {
  broadcast(room, { type: 'chat', system: true, text });
}

function gameOf(room) {
  return games[room.gameId];
}

// Minden játékos a saját nézetét kapja (a titkos információk miatt).
function sync(room) {
  const game = gameOf(room);
  const colors = room.state && game.seatColors ? game.seatColors(room.state) : null;
  const players = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    seat: p.seat,
    color: p.seat === null ? null : colors ? colors[p.seat] : p.seat,
    online: !!p.ws,
  }));
  for (const p of room.players) {
    send(p.ws, {
      type: 'room',
      code: room.code,
      gameId: room.gameId,
      hostId: room.hostId,
      players,
      game: room.state ? game.view(room.state, p.seat) : null,
    });
  }
}

function applyResult(room, result) {
  if (!result) return;
  for (const text of result.log || []) if (text) systemMessage(room, text);
  if (result.advanceAfter) {
    const state = room.state;
    setTimeout(() => {
      if (room.state === state && gameOf(room).advance(state)) sync(room);
    }, result.advanceAfter);
  }
}

function announceEnd(room) {
  const view = gameOf(room).view(room.state, null);
  if (!view.finished) return;
  if (view.resultText) {
    systemMessage(room, view.resultText);
    return;
  }
  const winners = view.winners.map((seat) => room.players.find((p) => p.seat === seat).name);
  systemMessage(room, winners.length ? `🏆 Vége! Nyert: ${winners.join(', ')}` : '🤝 Vége! Döntetlen.');
}

const handlers = {
  create(ws, client, msg) {
    if (!games[msg.gameId]) throw new Error('Nincs ilyen játék');
    const code = newCode();
    rooms.set(code, { code, gameId: msg.gameId, players: [], hostId: client.id, state: null, emptySince: null });
    handlers.join(ws, client, { ...msg, code });
  },

  join(ws, client, msg) {
    const code = String(msg.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) throw new Error('Nincs ilyen szoba');
    const name = String(msg.name || '').trim().slice(0, 20) || 'Névtelen';
    let player = room.players.find((p) => p.id === client.id);
    if (player) {
      player.ws = ws;
      player.name = name;
    } else {
      if (room.state) throw new Error('A játék már elindult');
      if (room.players.length >= 6) throw new Error('A szoba megtelt');
      player = { id: client.id, name, ws, seat: null };
      room.players.push(player);
    }
    client.room = room;
    room.emptySince = null;
    sync(room);
  },

  chooseGame(ws, client, msg) {
    const room = hostRoom(client);
    if (room.state) throw new Error('Most nem lehet játékot váltani');
    if (!games[msg.gameId]) throw new Error('Nincs ilyen játék');
    room.gameId = msg.gameId;
    systemMessage(room, `Kiválasztott játék: ${games[msg.gameId].name}`);
    sync(room);
  },

  start(ws, client) {
    const room = hostRoom(client);
    if (room.state) throw new Error('A játék már fut');
    const game = gameOf(room);
    const n = room.players.length;
    if (n < game.minPlayers) throw new Error(`Ehhez legalább ${game.minPlayers} játékos kell`);
    if (n > game.maxPlayers) throw new Error(`Ehhez legfeljebb ${game.maxPlayers} játékos kell`);
    room.players.forEach((p, i) => (p.seat = i));
    room.state = game.create({ names: room.players.map((p) => p.name), rng: Math.random });
    systemMessage(room, `${game.emoji} ${game.name} – a játék elindult!`);
    sync(room);
  },

  action(ws, client, msg) {
    const room = client.room;
    if (!room || !room.state) throw new Error('Nincs folyamatban játék');
    const player = room.players.find((p) => p.id === client.id);
    if (!player || player.seat === null) throw new Error('Nem vagy játékban');
    const result = gameOf(room).act(room.state, player.seat, msg.action || {});
    applyResult(room, result);
    announceEnd(room);
    sync(room);
  },

  // vissza a szoba várójába (a házigazda új játékot választhat)
  restart(ws, client) {
    const room = hostRoom(client);
    if (room.state && !gameOf(room).view(room.state, null).finished) systemMessage(room, 'A házigazda befejezte a játékot.');
    room.state = null;
    room.players = room.players.filter((p) => p.ws);
    room.players.forEach((p) => (p.seat = null));
    sync(room);
  },

  chat(ws, client, msg) {
    const room = client.room;
    if (!room) return;
    const player = room.players.find((p) => p.id === client.id);
    const text = String(msg.text || '').trim().slice(0, 200);
    if (player && text) broadcast(room, { type: 'chat', name: player.name, id: player.id, text });
  },
};

function hostRoom(client) {
  const room = client.room;
  if (!room) throw new Error('Nem vagy szobában');
  if (room.hostId !== client.id) throw new Error('Ezt csak a házigazda teheti meg');
  return room;
}

function leave(client, ws) {
  const room = client.room;
  if (!room) return;
  const player = room.players.find((p) => p.id === client.id);
  if (player && player.ws === ws) {
    if (room.state) {
      player.ws = null; // a helye megmarad, vissza tud csatlakozni
    } else {
      room.players = room.players.filter((p) => p !== player);
    }
  }
  const host = room.players.find((p) => p.id === room.hostId);
  if (!host || !host.ws) {
    const online = room.players.find((p) => p.ws);
    if (online) room.hostId = online.id;
  }
  if (!room.players.some((p) => p.ws)) room.emptySince = Date.now();
  sync(room);
}

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const client = { id: null, room: null };
  send(ws, { type: 'hello', games: catalog() });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    // a kliens egy tartós azonosítót küld, így újratöltés után is visszakapja a helyét
    if (!client.id) client.id = String(msg.clientId || '').slice(0, 64) || Math.random().toString(36).slice(2);
    const handler = handlers[msg.type];
    if (!handler) return;
    try {
      handler(ws, client, msg);
    } catch (err) {
      send(ws, { type: 'error', message: err.message });
    }
  });

  ws.on('close', () => leave(client, ws));
});

setInterval(() => {
  for (const [code, room] of rooms) {
    if (room.emptySince && Date.now() - room.emptySince > ROOM_TTL_MS) rooms.delete(code);
  }
}, 60 * 1000).unref();

server.listen(PORT, () => {
  console.log(`Társasjáték szerver: http://localhost:${PORT}`);
});
