// Catálogo e validação dos cenários. Os cenários ficam em src/scenarios/*.json
// para que a equipe de conteúdo possa editá-los sem mexer no código.

import { CLUSTERS, ESTRATEGIAS, PORTA_VOZES } from './constants.js';

export const CATALOGO = ['vazamento-dados-smartwatch', 'falha-pagamentos', 'boato-ia'];

const TIPOS_EVENTO = ['post', 'imprensa', 'boato', 'jornalista'];

/** Devolve a lista de problemas encontrados no cenário (vazia quando está tudo certo). */
export function validarCenario(c) {
  const erros = [];
  const exigir = (cond, msg) => { if (!cond) erros.push(msg); };

  exigir(typeof c.id === 'string' && c.id.length > 0, 'id ausente');
  exigir(typeof c.titulo === 'string', 'titulo ausente');
  exigir(c.cluster_scct in CLUSTERS, `cluster_scct inválido: ${c.cluster_scct}`);
  exigir(c.empresa && typeof c.empresa.nome === 'string', 'empresa.nome ausente');
  exigir(typeof c.papel === 'string', 'papel ausente');
  exigir(Array.isArray(c.fatos), 'fatos deve ser uma lista');
  exigir(Number.isFinite(c.sentimento_inicial), 'sentimento_inicial ausente');
  exigir(Number.isFinite(c.tempo_ideal_s) && c.tempo_ideal_s > 0, 'tempo_ideal_s inválido');
  exigir(Number.isFinite(c.encerramento_s) && c.encerramento_s > 0, 'encerramento_s inválido');

  const pre = c.pre_crise || {};
  exigir(Array.isArray(pre.sinais) && pre.sinais.length > 0, 'pre_crise.sinais vazio');
  exigir(Array.isArray(pre.opcoes) && pre.opcoes.length >= 2, 'pre_crise.opcoes precisa de 2 ou mais opções');
  exigir((pre.opcoes || []).some((o) => o.id === pre.opcao_recomendada), 'pre_crise.opcao_recomendada não existe nas opções');

  for (const lista of ['estrategias_adequadas', 'estrategias_aceitaveis']) {
    exigir(Array.isArray(c[lista]), `${lista} deve ser uma lista`);
    for (const e of c[lista] || []) exigir(e in ESTRATEGIAS, `${lista}: estratégia inválida "${e}"`);
  }
  exigir((c.estrategias_adequadas || []).length > 0, 'estrategias_adequadas vazio');

  for (const lista of ['recomendado', 'aceitavel']) {
    for (const p of (c.porta_voz || {})[lista] || []) exigir(p in PORTA_VOZES, `porta_voz.${lista}: porta-voz inválido "${p}"`);
  }

  const ids = new Set();
  for (const e of c.eventos || []) {
    exigir(!ids.has(e.id), `evento duplicado: ${e.id}`);
    ids.add(e.id);
    exigir(TIPOS_EVENTO.includes(e.tipo), `evento ${e.id}: tipo inválido "${e.tipo}"`);
    exigir(Number.isFinite(e.t) && e.t >= 0, `evento ${e.id}: t inválido`);
    exigir(typeof e.texto === 'string' && e.texto.length > 0, `evento ${e.id}: texto ausente`);
    if (e.tipo === 'jornalista') exigir(Number.isFinite(e.prazo_s) && e.prazo_s > 0, `evento ${e.id}: prazo_s ausente`);
  }
  exigir(ids.size > 0, 'cenário sem eventos');

  for (const d of ['boa', 'mista', 'ruim']) {
    exigir(Array.isArray((c.reacoes || {})[d]) && c.reacoes[d].length > 0, `reacoes.${d} vazio`);
  }
  return erros;
}

/** Carrega um cenário pelo id (no navegador ou na extensão). */
export async function carregarCenario(id) {
  if (!CATALOGO.includes(id)) throw new Error(`Cenário desconhecido: ${id}`);
  const url = new URL(`../scenarios/${id}.json`, import.meta.url);
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`Não foi possível carregar o cenário ${id}.`);
  const cenario = await resposta.json();
  const erros = validarCenario(cenario);
  if (erros.length) throw new Error(`Cenário ${id} inválido: ${erros.join('; ')}`);
  return { ...cenario, eventos: [...cenario.eventos].sort((a, b) => a.t - b.t) };
}

export async function carregarCatalogo() {
  return Promise.all(CATALOGO.map(carregarCenario));
}
