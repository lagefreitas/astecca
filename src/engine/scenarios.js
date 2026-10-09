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

// ---------- Cenários gerados por IA ----------

/** Regras da SCCT aplicadas a todo cenário gerado, para que a avaliação fique coerente com a teoria. */
export const REGRAS_POR_CLUSTER = {
  vitima: { adequadas: ['negar'], aceitaveis: ['reforcar'], portaVoz: { recomendado: ['rp', 'ceo'], aceitavel: [] } },
  acidental: { adequadas: ['diminuir'], aceitaveis: ['reconstruir'], portaVoz: { recomendado: ['rp', 'ceo'], aceitavel: [] } },
  evitavel: { adequadas: ['reconstruir'], aceitaveis: ['diminuir'], portaVoz: { recomendado: ['ceo'], aceitavel: ['rp'] } }
};

const limitarNum = (v, min, max, padrao) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : padrao;
};
const texto = (v, padrao = '') => (typeof v === 'string' ? v.trim() : padrao);
const post = (p) => ({ autor: texto(p?.autor, '@publico').slice(0, 40), perfil: texto(p?.perfil, 'Público').slice(0, 40), texto: texto(p?.texto).slice(0, 280) });

/**
 * Ajusta o cenário devolvido pela IA ao formato do Astecca. A IA escreve o conteúdo,
 * enquanto as regras teóricas (estratégias e porta-vozes por grupo SCCT) e os limites
 * numéricos são definidos aqui. Lança erro se o resultado continuar inválido.
 */
export function normalizarCenarioGerado(bruto, { cluster, agora = Date.now() } = {}) {
  const c = cluster in REGRAS_POR_CLUSTER ? cluster : (bruto?.cluster_scct in REGRAS_POR_CLUSTER ? bruto.cluster_scct : 'acidental');
  const regras = REGRAS_POR_CLUSTER[c];
  const pre = bruto?.pre_crise || {};
  const idsPre = ['monitorar', 'comite', 'preventivo'];
  const opcoes = (Array.isArray(pre.opcoes) ? pre.opcoes : []).slice(0, 3).map((o, i) => ({
    id: idsPre[i],
    texto: texto(o?.texto, idsPre[i]),
    efeito_sentimento: limitarNum(o?.efeito_sentimento, 0, 15, i === 1 ? 0 : 8),
    feedback: texto(o?.feedback)
  }));
  if (opcoes[1]) opcoes[1].efeito_sentimento = 0; // reunir o comitê é a opção recomendada

  const eventos = (Array.isArray(bruto?.eventos) ? bruto.eventos : [])
    .filter((e) => e && ['post', 'imprensa', 'boato', 'jornalista'].includes(e.tipo) && texto(e.texto))
    .slice(0, 8)
    .map((e) => ({
      tipo: e.tipo,
      t: limitarNum(e.t, 0, 1000, 0),
      autor: texto(e.autor, '@perfil').slice(0, 40),
      perfil: texto(e.perfil, 'Público').slice(0, 50),
      texto: texto(e.texto).slice(0, 400),
      ...(texto(e.alcance) ? { alcance: texto(e.alcance).slice(0, 80) } : {}),
      ...(e.tipo === 'jornalista' ? { prazo_s: limitarNum(e.prazo_s, 180, 480, 300) } : {}),
      impacto: limitarNum(e.impacto, 3, 15, 8)
    }))
    .sort((a, b) => a.t - b.t)
    .map((e, i) => ({ id: `e${i + 1}`, ...e }));
  if (eventos.length) eventos[0].t = 0; // a crise começa com o primeiro evento

  const reacoes = {};
  for (const d of ['boa', 'mista', 'ruim']) {
    reacoes[d] = (Array.isArray(bruto?.reacoes?.[d]) ? bruto.reacoes[d] : []).slice(0, 3).map(post).filter((p) => p.texto);
  }

  const cenario = {
    id: `ia-${agora.toString(36)}`,
    origem: 'ia',
    criadoEm: new Date(agora).toISOString(),
    titulo: texto(bruto?.titulo, 'Crise gerada por IA').slice(0, 90),
    resumo: texto(bruto?.resumo).slice(0, 220),
    cluster_scct: c,
    dificuldade: ['Fácil', 'Médio', 'Difícil'].includes(bruto?.dificuldade) ? bruto.dificuldade : 'Médio',
    duracao_min: limitarNum(bruto?.duracao_min, 10, 25, 15),
    rascunho: false,
    empresa: {
      nome: texto(bruto?.empresa?.nome, 'Empresa fictícia').slice(0, 60),
      setor: texto(bruto?.empresa?.setor).slice(0, 60),
      descricao: texto(bruto?.empresa?.descricao).slice(0, 220)
    },
    papel: texto(bruto?.papel).slice(0, 300),
    fatos: (Array.isArray(bruto?.fatos) ? bruto.fatos : []).map((f) => texto(f)).filter(Boolean).slice(0, 6),
    sentimento_inicial: limitarNum(bruto?.sentimento_inicial, 15, 45, 30),
    pre_crise: {
      sinais: (Array.isArray(pre.sinais) ? pre.sinais : []).slice(0, 4).map((s) => ({
        icone: ['forum', 'email', 'grafico'].includes(s?.icone) ? s.icone : 'forum',
        texto: texto(s?.texto)
      })).filter((s) => s.texto),
      opcoes,
      opcao_recomendada: 'comite'
    },
    estrategias_adequadas: regras.adequadas,
    estrategias_aceitaveis: regras.aceitaveis,
    porta_voz: regras.portaVoz,
    tempo_ideal_s: limitarNum(bruto?.tempo_ideal_s, 480, 900, 600),
    encerramento_s: limitarNum(bruto?.encerramento_s, 1000, 1500, 1200),
    eventos,
    reacoes
  };
  const erros = validarCenario(cenario);
  if (!eventos.some((e) => e.tipo === 'jornalista')) erros.push('o cenário precisa de ao menos uma pergunta de jornalista');
  if (erros.length) throw new Error(`A IA gerou um cenário incompleto (${erros.slice(0, 3).join('; ')}). Tente de novo.`);
  return cenario;
}
