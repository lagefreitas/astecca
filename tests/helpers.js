import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATALOGO } from '../src/engine/scenarios.js';

export function lerCenario(id) {
  const caminho = fileURLToPath(new URL(`../src/scenarios/${id}.json`, import.meta.url));
  const c = JSON.parse(readFileSync(caminho, 'utf8'));
  return { ...c, eventos: [...c.eventos].sort((a, b) => a.t - b.t) };
}

export const todos = () => CATALOGO.map(lerCenario);

// Relógio de teste: converte segundos simulados em milissegundos reais (velocidade 1).
export const T0 = 1_000_000;
export const em = (segundos) => T0 + segundos * 1000;
