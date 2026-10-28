// Autotest del motor: node test-motor.js
const assert = require('assert');
const { newRound, resolve } = require('./motor.js');

const base = { ping: { pc: 20, con: 60, mov: 130 }, jitter: 15, ventana: 180 };

function run(mode, n = 5000) {
  const c = { ...base, mode }, wins = { pc: 0, con: 0, mov: 0 };
  let fair = 0, late = 0;
  for (let i = 0; i < n; i++) {
    const s = resolve(newRound(c), c);
    wins[s.winner]++; fair += s.fair; late += s.late.length;
  }
  const pct = k => +(wins[k] / n * 100).toFixed(1);
  return { pc: pct('pc'), con: pct('con'), mov: pct('mov'), justicia: +(fair / n * 100).toFixed(1), tardios: late };
}

const fifo = run('fifo'), comp = run('comp');
console.log('FIFO ', fifo);
console.log('COMP ', comp);

assert(fifo.pc > fifo.mov, 'FIFO debe favorecer al de menor ping');
assert(comp.justicia > fifo.justicia + 20, 'la ventana debe mejorar claramente la justicia');
assert(comp.mov > fifo.mov, 'la ventana debe ayudar al de mayor ping');
console.log('OK');
