// motor.js — lógica pura de la simulación (sin DOM), para poder probarla en Node.

const PLAYERS = [
  { id: 'pc',  name: 'PC',      icon: '💻', color: '#4cc9f0' },
  { id: 'con', name: 'Consola', icon: '🎮', color: '#f9c74f' },
  { id: 'mov', name: 'Móvil',   icon: '📱', color: '#90be6d' },
];

const rand = (a, b) => a + Math.random() * (b - a);
// Reacción humana ~200 ms (promedio de dos uniformes: más realista que una sola)
const reaction = () => (rand(160, 240) + rand(160, 240)) / 2;

// Tiempos de una ronda. t = 0: el servidor publica el ítem.
function newRound(cfg) {
  return PLAYERS.map(p => {
    const oneWay = cfg.ping[p.id] / 2;                                   // ping = ida y vuelta (RTT)
    const down  = Math.max(1, oneWay + rand(-cfg.jitter, cfg.jitter));  // servidor → cliente
    const react = reaction();                                            // el jugador ve el ítem y reacciona
    const up    = Math.max(1, oneWay + rand(-cfg.jitter, cfg.jitter));  // cliente → servidor
    return { id: p.id, down, react, up, see: down, click: down + react, arrive: down + react + up };
  });
}

// El servidor autoritativo decide quién agarra el ítem.
function resolve(round, cfg) {
  const fifo = cfg.mode === 'fifo';
  const first = Math.min(...round.map(r => r.arrive));
  const decideAt = fifo ? first : first + cfg.ventana;          // comp: espera la ventana de equidad
  const valid = round.filter(r => r.arrive <= decideAt);         // fifo: solo el primero; comp: los que llegaron a tiempo
  // fifo ordena por llegada; comp resta el ping medido para estimar CUÁNDO apretó cada jugador
  const key = r => (fifo ? r.arrive : r.arrive - cfg.ping[r.id]);
  const winner = valid.reduce((a, b) => (key(b) < key(a) ? b : a));
  const fastest = round.reduce((a, b) => (b.react < a.react ? b : a)); // el realmente más rápido
  return {
    winner: winner.id, fastest: fastest.id, first, decideAt,
    late: fifo ? [] : round.filter(r => !valid.includes(r)).map(r => r.id),
    fair: winner.id === fastest.id,
  };
}

if (typeof module !== 'undefined') module.exports = { PLAYERS, newRound, resolve };
