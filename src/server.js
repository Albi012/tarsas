const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const Game = require('./game');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PASS_DELAY_MS = 1200;
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

// code -> { code, players: [{id, name, ws, color}], hostId, game, emptySince }
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

function roomState(room) {
  return {
    type: 'room',
    code: room.code,
    hostId: room.hostId,
    players: room.players.map((p) => ({ id: p.id, name: p.name, color: p.color, online: !!p.ws })),
    game: room.game ? Game.publicState(room.game) : null,
  };
}

function sync(room) {
  broadcast(room, roomState(room));
}

function schedulePass(room) {
  if (!room.game || !room.game.pendingPass) return;
  setTimeout(() => {
    if (room.game && Game.passIfNoMoves(room.game)) sync(room);
  }, PASS_DELAY_MS);
}

const handlers = {
  create(ws, client, msg) {
    const code = newCode();
    const room = { code, players: [], hostId: client.id, game: null, emptySince: null };
    rooms.set(code, room);
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
      if (room.game) throw new Error('A játék már elindult');
      if (room.players.length >= 4) throw new Error('A szoba megtelt');
      player = { id: client.id, name, ws, color: null };
      room.players.push(player);
    }
    client.room = room;
    room.emptySince = null;
    sync(room);
  },

  start(ws, client) {
    const room = client.room;
    if (!room) throw new Error('Nem vagy szobában');
    if (room.hostId !== client.id) throw new Error('Csak a házigazda indíthatja a játékot');
    if (room.players.length < 2) throw new Error('Legalább 2 játékos kell');
    room.game = Game.createGame(room.players.length);
    room.players.forEach((p, i) => (p.color = room.game.colors[i]));
    broadcast(room, { type: 'chat', system: true, text: 'A játék elindult!' });
    sync(room);
  },

  roll(ws, client) {
    const { room } = activePlayer(client);
    Game.roll(room.game);
    sync(room);
    schedulePass(room);
  },

  move(ws, client, msg) {
    const { room } = activePlayer(client);
    Game.move(room.game, Number(msg.piece));
    const ev = room.game.lastEvent;
    if (ev.captured !== null) {
      const victim = room.players.find((p) => p.color === ev.captured);
      const hunter = room.players.find((p) => p.color === ev.color);
      broadcast(room, { type: 'chat', system: true, text: `${hunter.name} kiütötte ${victim.name} bábuját!` });
    }
    if (room.game.finished) {
      const names = room.game.winners.map((c, i) => `${i + 1}. ${room.players.find((p) => p.color === c).name}`);
      broadcast(room, { type: 'chat', system: true, text: `Vége! ${names.join(', ')}` });
    }
    sync(room);
  },

  restart(ws, client) {
    const room = client.room;
    if (!room || room.hostId !== client.id) throw new Error('Csak a házigazda kezdhet új játékot');
    room.game = null;
    room.players = room.players.filter((p) => p.ws);
    room.players.forEach((p) => (p.color = null));
    sync(room);
  },

  chat(ws, client, msg) {
    const room = client.room;
    if (!room) return;
    const player = room.players.find((p) => p.id === client.id);
    const text = String(msg.text || '').trim().slice(0, 200);
    if (text) broadcast(room, { type: 'chat', name: player.name, color: player.color, text });
  },
};

function activePlayer(client) {
  const room = client.room;
  if (!room || !room.game) throw new Error('Nincs folyamatban játék');
  const player = room.players.find((p) => p.id === client.id);
  if (Game.currentColor(room.game) !== player.color) throw new Error('Nem te következel');
  return { room, player };
}

function leave(client, ws) {
  const room = client.room;
  if (!room) return;
  const player = room.players.find((p) => p.id === client.id);
  if (player && player.ws === ws) {
    if (room.game) {
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
  console.log(`Ki nevet a végén? szerver: http://localhost:${PORT}`);
});
