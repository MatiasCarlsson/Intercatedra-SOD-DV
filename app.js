// app.js — interfaz: sliders, animación en canvas, estadísticas. Usa PLAYERS/newRound/resolve de motor.js.

const $ = id => document.getElementById(id);
const BY = Object.fromEntries(PLAYERS.map(p => [p.id, p]));
const sc = $('scene').getContext('2d');
const tl = $('timeline').getContext('2d');

// ---------- Estado ----------
const SERVER = { x: 450, y: 160 };
const POS = { pc: { x: 110, y: 70 }, con: { x: 110, y: 250 }, mov: { x: 790, y: 160 } };
const PHASE = { down: '#5aa9e6', react: '#f4a259', up: '#7bd88f' };
const stats = { rounds: 0, wins: { pc: 0, con: 0, mov: 0 }, late: 0, verdict: 0, fair: 0 };
let running = false, cfg, round, res;
let t = 0, endT = 0, scaleT = 500, last = 0, holdUntil = 0; // t = reloj virtual de la ronda (ms)

// ---------- Configuración desde los sliders ----------
const val = id => +$(id).value;
const readCfg = () => ({
  ping: { pc: val('ping-pc'), con: val('ping-con'), mov: val('ping-mov') },
  jitter: val('jitter'),
  ventana: val('ventana'),
  mode: document.querySelector('input[name=mode]:checked').value,
});

// ---------- Utilidades de dibujo ----------
const lerp = (a, b, f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
function txt(c, s, x, y, font = '13px system-ui', color = '#e8ecf8', align = 'center') {
  c.font = font; c.fillStyle = color; c.textAlign = align; c.fillText(s, x, y);
}
function dot(pt, color) {
  sc.beginPath(); sc.arc(pt.x, pt.y, 7, 0, Math.PI * 2); sc.fillStyle = color; sc.fill();
}

// ---------- Escena: servidor, clientes y paquetes ----------
function drawScene() {
  const c = cfg || readCfg(), on = !!round;
  sc.clearRect(0, 0, 900, 350);

  // enlaces con su ping
  PLAYERS.forEach(p => {
    const P = POS[p.id], m = lerp(SERVER, P, 0.5);
    sc.strokeStyle = '#33415c'; sc.lineWidth = 2; sc.setLineDash([6, 6]);
    sc.beginPath(); sc.moveTo(SERVER.x, SERVER.y); sc.lineTo(P.x, P.y); sc.stroke(); sc.setLineDash([]);
    txt(sc, `ping ${c.ping[p.id]} ms`, m.x, m.y - 10, '12px system-ui', '#9aa7c7');
  });

  // servidor
  sc.fillStyle = '#16213e'; sc.strokeStyle = '#7b61ff'; sc.lineWidth = 2;
  sc.beginPath(); sc.roundRect(SERVER.x - 85, SERVER.y - 40, 170, 80, 12); sc.fill(); sc.stroke();
  let status = 'En espera';
  if (on) status = t < res.first ? '⭐ Ítem publicado' : t < res.decideAt ? '⏱️ Ventana abierta' : '⚖️ Veredicto emitido';
  txt(sc, '🖥️ Servidor autoritativo', SERVER.x, SERVER.y - 10, 'bold 13px system-ui');
  txt(sc, status, SERVER.x, SERVER.y + 10, '12px system-ui', '#9aa7c7');
  if (on && c.mode === 'comp' && t > res.first) { // barra de la ventana de equidad
    const f = c.ventana ? Math.min(1, (t - res.first) / c.ventana) : 1;
    sc.fillStyle = '#ffd166'; sc.fillRect(SERVER.x - 70, SERVER.y + 22, 140 * f, 8);
  }

  // clientes
  PLAYERS.forEach(p => {
    const P = POS[p.id], r = on && round.find(x => x.id === p.id);
    let state = '⏳ Esperando', col = '#9aa7c7', star = false;
    if (on) {
      const got = res.decideAt + c.ping[p.id] / 2; // cuándo le llega el veredicto
      if (t >= got) {
        [state, col] = p.id === res.winner ? ['🏆 ¡Ganó!', '#ffd166']
          : res.late.includes(p.id) ? ['⌛ Llegó tarde', '#ef476f'] : ['❌ Perdió', '#ef476f'];
      } else if (t >= r.click) state = '📤 Acción enviada';
      else if (t >= r.see) state = '👀 ¡Reacciona!';
      star = t >= r.see && t < got;
    }
    sc.beginPath(); sc.arc(P.x, P.y, 34, 0, Math.PI * 2); sc.fillStyle = '#16213e'; sc.fill();
    sc.strokeStyle = p.color; sc.lineWidth = 3; sc.stroke();
    txt(sc, p.icon, P.x, P.y + 11, '32px system-ui');
    txt(sc, p.name, P.x, P.y + 56, 'bold 14px system-ui', p.color);
    txt(sc, state, P.x, P.y + 74, '13px system-ui', col);
    if (star) txt(sc, '⭐', P.x + 40, P.y - 22, '24px system-ui');
  });

  // paquetes en tránsito (posición = progreso del tiempo virtual sobre el enlace)
  if (on) round.forEach(r => {
    const P = POS[r.id], back = c.ping[r.id] / 2;
    if (t < r.down) dot(lerp(SERVER, P, t / r.down), '#ffffff');                               // ítem
    if (t >= r.click && t < r.arrive) dot(lerp(P, SERVER, (t - r.click) / r.up), BY[r.id].color); // acción
    if (t >= res.decideAt && t < res.decideAt + back)                                           // veredicto
      dot(lerp(SERVER, P, (t - res.decideAt) / back), r.id === res.winner ? '#ffd166' : '#ef476f');
  });
}

// ---------- Línea de tiempo: dónde se va el tiempo de cada jugador ----------
function drawTimeline() {
  tl.clearRect(0, 0, 900, 225);
  [['bajada (servidor → cliente)', PHASE.down], ['reacción humana', PHASE.react], ['subida (cliente → servidor)', PHASE.up]]
    .forEach(([s, col], i) => {
      tl.fillStyle = col; tl.fillRect(100 + i * 230, 8, 12, 12);
      txt(tl, s, 118 + i * 230, 18, '12px system-ui', '#e8ecf8', 'left');
    });
  if (!round) return txt(tl, 'Pulsa Iniciar para ver la línea de tiempo de cada ronda', 450, 110, '14px system-ui', '#9aa7c7');

  const X0 = 100, X1 = 880, x = ms => X0 + (X1 - X0) * ms / scaleT;
  for (let ms = 0; ms <= scaleT; ms += 100) { // grilla
    tl.strokeStyle = '#1f2a48'; tl.lineWidth = 1; tl.beginPath(); tl.moveTo(x(ms), 40); tl.lineTo(x(ms), 200); tl.stroke();
    txt(tl, ms + ' ms', x(ms), 216, '11px system-ui', '#9aa7c7');
  }
  if (cfg.mode === 'comp' && t > res.first) { // ventana de equidad sombreada
    tl.fillStyle = 'rgba(255,209,102,.15)';
    tl.fillRect(x(res.first), 40, x(Math.min(t, res.decideAt)) - x(res.first), 160);
  }
  const seg = (y, a, b, color) => { // tramo [a,b] recortado al tiempo actual
    if (t > a) { tl.fillStyle = color; tl.fillRect(x(a), y, x(Math.min(b, t)) - x(a), 24); }
  };
  PLAYERS.forEach((p, i) => {
    const y = 52 + i * 50, r = round.find(q => q.id === p.id);
    txt(tl, `${p.icon} ${p.name}`, X0 - 10, y + 17, '13px system-ui', p.color, 'right');
    seg(y, 0, r.see, PHASE.down); seg(y, r.see, r.click, PHASE.react); seg(y, r.click, r.arrive, PHASE.up);
    if (t >= r.arrive) {
      if (res.late.includes(p.id)) txt(tl, '⌛', x(r.arrive) + 14, y + 18, '16px system-ui');
      else if (t >= res.decideAt && p.id === res.winner) txt(tl, '🏆', x(r.arrive) + 14, y + 18, '18px system-ui');
    }
  });
  if (t >= res.decideAt) { // línea de veredicto
    tl.strokeStyle = '#ffd166'; tl.lineWidth = 2; tl.setLineDash([5, 4]);
    tl.beginPath(); tl.moveTo(x(res.decideAt), 40); tl.lineTo(x(res.decideAt), 200); tl.stroke(); tl.setLineDash([]);
    txt(tl, 'veredicto', x(res.decideAt), 36, '11px system-ui', '#ffd166');
  }
}

// ---------- Estadísticas y bitácora ----------
function record(r) {
  stats.rounds++; stats.wins[r.winner]++; stats.late += r.late.length; stats.verdict += r.decideAt; stats.fair += +r.fair;
}

function renderStats() {
  const n = stats.rounds;
  $('stats').innerHTML = PLAYERS.map(p => {
    const pct = n ? stats.wins[p.id] / n * 100 : 0;
    return `<div class="row"><span>${p.icon} ${p.name}</span>
      <div class="track"><div class="fill" style="width:${pct}%;background:${p.color}"></div><i class="fair"></i></div>
      <b>${pct.toFixed(1)}%</b></div>`;
  }).join('') + `<p class="sum">Rondas: <b>${n}</b> · Paquetes tardíos: <b>${stats.late}</b> ·
    Veredicto promedio: <b>${n ? (stats.verdict / n).toFixed(0) : 0} ms</b> ·
    Justicia (ganó quien reaccionó primero): <b>${n ? (stats.fair / n * 100).toFixed(1) : 0}%</b></p>`;
}

function finishRound() {
  record(res);
  const w = BY[res.winner], best = BY[res.fastest], r = round.find(q => q.id === res.winner);
  const li = document.createElement('li');
  li.textContent = `#${stats.rounds} ${w.icon} ${w.name} agarra el ítem (llegó a los ${r.arrive.toFixed(0)} ms)` +
    (res.fair ? ' · ✅ justo' : ` · ⚠️ injusto: ${best.icon} ${best.name} reaccionó primero`) +
    (res.late.length ? ` · ⌛ tarde: ${res.late.map(i => BY[i].icon).join(' ')}` : '');
  $('log').prepend(li);
  while ($('log').children.length > 8) $('log').lastChild.remove();
  renderStats();
}

function resetStats() {
  Object.assign(stats, { rounds: 0, late: 0, verdict: 0, fair: 0, wins: { pc: 0, con: 0, mov: 0 } });
  $('log').replaceChildren();
  renderStats();
}

function batch(n = 1000) { // mismas funciones del motor, sin animación
  resetStats();
  const c = readCfg();
  for (let i = 0; i < n; i++) record(resolve(newRound(c), c));
  renderStats();
}

// ---------- Rondas y bucle de animación ----------
function startRound() {
  cfg = readCfg(); round = newRound(cfg); res = resolve(round, cfg); t = 0;
  endT = Math.max(...round.map(r => res.decideAt + cfg.ping[r.id] / 2)) + 150;
  scaleT = Math.max(500, Math.ceil((Math.max(res.decideAt, ...round.map(r => r.arrive)) + 40) / 100) * 100);
}

function frame(now) {
  const dt = Math.min(now - last, 50); last = now;
  if (running) {
    if (!round || (t >= endT && now >= holdUntil)) startRound();
    else if (t < endT) {
      t = Math.min(endT, t + dt * $('speed').value);
      if (t >= endT) { finishRound(); holdUntil = now + 1200; }
    }
  }
  drawScene(); drawTimeline();
  requestAnimationFrame(frame);
}

// ---------- Eventos ----------
const syncMode = () => { $('ventana').disabled = readCfg().mode === 'fifo'; };

document.querySelectorAll('input[type=range]').forEach(i => {
  const show = () => { i.parentElement.querySelector('output').textContent = i.value + ' ' + i.dataset.unit; };
  i.addEventListener('input', show); show();
});
document.querySelectorAll('input[name=mode]').forEach(r => r.addEventListener('change', syncMode));
$('btnStart').onclick = () => { running = !running; $('btnStart').textContent = running ? '⏸ Pausar' : '▶ Iniciar'; };
$('btnBatch').onclick = () => batch(1000);
$('btnReset').onclick = resetStats;

syncMode(); renderStats(); requestAnimationFrame(frame);
