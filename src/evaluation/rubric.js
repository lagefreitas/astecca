// Rubrica de avaliação. Critérios objetivos usam regras fixas, enquanto a qualidade
// do texto é avaliada pela IA (ou pelas heurísticas, quando a IA não está disponível).

import { ESTRATEGIAS, PORTA_VOZES, CLUSTERS } from '../engine/constants.js';
import { boatosVisiveis, eventosVisiveis, formatarTempo } from '../engine/simulation.js';
import { notaSinceridade, notaEmpatia, notaEppm, notaDesinformacao } from './heuristics.js';

export const CRITERIOS = [
  { id: 'estrategia', nome: 'Estratégia adequada ao tipo de crise', fonte: 'SCCT (Coombs)', origem: 'regra' },
  { id: 'tempo', nome: 'Tempo de resposta', fonte: 'Nuortimo, Harkonen e Breznik (2026)', origem: 'regra' },
  { id: 'sinceridade', nome: 'Sinceridade e responsabilidade', fonte: 'Brown-Devlin, Lim e Tao (2022)', origem: 'texto' },
  { id: 'empatia', nome: 'Empatia e voz humana', fonte: 'Olbermann e Nagl (2025)', origem: 'texto' },
  { id: 'eppm', nome: 'Ameaça + eficácia', fonte: 'EPPM (Witte)', origem: 'texto' },
  { id: 'porta_voz', nome: 'Escolha do porta-voz', fonte: 'Olbermann e Nagl (2025)', origem: 'regra' },
  { id: 'distribuicao', nome: 'Forma de distribuição', fonte: 'Brown-Devlin, Lim e Tao (2022)', origem: 'regra' },
  { id: 'desinformacao', nome: 'Combate à desinformação', fonte: 'Karinshak e Jin', origem: 'texto' }
];

const limitar = (n) => Math.min(5, Math.max(1, Math.round(n)));

function notaEstrategia(cenario, estado) {
  const est = estado.decisoes?.estrategia;
  const cluster = CLUSTERS[cenario.cluster_scct].nome.toLowerCase();
  if (!est) return { nota: 1, justificativa: 'Nenhuma estratégia de resposta foi escolhida.' };
  const nome = ESTRATEGIAS[est].nome.toLowerCase();
  const adequadas = cenario.estrategias_adequadas.map((e) => ESTRATEGIAS[e].nome.toLowerCase()).join(' ou ');
  if (cenario.estrategias_adequadas.includes(est)) {
    return { nota: 5, justificativa: `Em crise ${cluster}, a SCCT recomenda ${adequadas}. Você escolheu ${nome}.` };
  }
  if (cenario.estrategias_aceitaveis.includes(est)) {
    return { nota: 3, justificativa: `${capitalizar(nome)} é aceitável em crise ${cluster}, mas a SCCT recomenda ${adequadas}.` };
  }
  if (est === 'negar') {
    return { nota: 1, justificativa: `Negar em crise ${cluster} contradiz os fatos e pode ser desmentido rapidamente nas redes. A SCCT recomenda ${adequadas}.` };
  }
  return { nota: 2, justificativa: `${capitalizar(nome)} não responde à responsabilidade atribuída numa crise ${cluster}. A SCCT recomenda ${adequadas}.` };
}

function notaTempo(cenario, estado) {
  const partes = [];
  let nota = 5;
  if (!estado.comunicado) {
    nota = 1;
    partes.push('O comunicado não foi publicado.');
  } else {
    const t = estado.comunicado.tSim;
    partes.push(`Comunicado publicado em ${formatarTempo(t)} (ideal: até ${formatarTempo(cenario.tempo_ideal_s)}).`);
    if (t > cenario.tempo_ideal_s) nota -= 1;
    if (t > 2 * cenario.tempo_ideal_s) nota -= 2;
  }
  const jornalistas = cenario.eventos.filter((e) => e.tipo === 'jornalista' && e.t <= (estado.criseEncerradaSim ?? Infinity));
  let expiradas = 0;
  let semComentarios = 0;
  for (const j of jornalistas) {
    const r = estado.respostasJornalistas[j.id];
    if (r?.tipo === 'sem_comentarios') semComentarios += 1;
    else if (!r) expiradas += 1;
  }
  nota -= expiradas + semComentarios;
  if (expiradas) partes.push(`${expiradas} pergunta(s) de jornalista ficaram sem resposta.`);
  if (semComentarios) partes.push(`${semComentarios} resposta(s) "sem comentários".`);
  if (!expiradas && !semComentarios && jornalistas.length) partes.push('Todos os jornalistas foram respondidos.');
  return { nota: limitar(nota), justificativa: partes.join(' ') };
}

function notaPortaVoz(cenario, estado) {
  const p = estado.decisoes?.portaVoz;
  if (!p) return { nota: 1, justificativa: 'Nenhum porta-voz foi escolhido.' };
  const nome = PORTA_VOZES[p].nome;
  if (p === 'influenciador') {
    return {
      nota: 2,
      justificativa: 'Influenciadores virtuais só convencem quando o público lhes atribui uma "mente" humana. Numa crise, mensagens atribuídas à IA tendem a parecer menos autênticas.'
    };
  }
  if (cenario.porta_voz.recomendado.includes(p)) {
    return { nota: 5, justificativa: `${nome} é um porta-voz humano com autoridade adequada a esta crise.` };
  }
  if (cenario.porta_voz.aceitavel.includes(p)) {
    return { nota: 4, justificativa: `${nome} é aceitável, mas a gravidade da crise pede um porta-voz de maior autoridade.` };
  }
  return { nota: 3, justificativa: `${nome} não é a escolha mais indicada para esta crise.` };
}

function notaDistribuicao(estado) {
  const d = estado.decisoes?.distribuicao;
  if (!d) return { nota: 1, justificativa: 'Nenhuma forma de distribuição foi escolhida.' };
  if (d === 'patrocinado') {
    return {
      nota: 2,
      justificativa: 'Quando o público percebe que a mensagem de crise foi patrocinada e segmentada por dados, a credibilidade da fonte cai.'
    };
  }
  return { nota: 5, justificativa: 'O post orgânico nos canais oficiais evita que a mensagem pareça manipulação.' };
}

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Notas dos critérios de texto calculadas pelas heurísticas. */
export function notasHeuristicas(cenario, estado) {
  const texto = estado.comunicado?.texto || '';
  const agoraFinal = Infinity; // o estado encerrado congela o tempo simulado
  return {
    sinceridade: notaSinceridade(texto, cenario.cluster_scct),
    empatia: notaEmpatia(texto),
    eppm: notaEppm(texto),
    desinformacao: notaDesinformacao(boatosVisiveis(cenario, estado, agoraFinal), estado.respostasBoatos, texto)
  };
}

/**
 * Monta a avaliação final.
 * notasIA: objeto opcional { sinceridade, empatia, eppm, desinformacao, sintese } vindo do LLM.
 */
export function montarAvaliacao(cenario, estado, notasIA = null) {
  const regras = {
    estrategia: notaEstrategia(cenario, estado),
    tempo: notaTempo(cenario, estado),
    porta_voz: notaPortaVoz(cenario, estado),
    distribuicao: notaDistribuicao(estado)
  };
  const heur = notasHeuristicas(cenario, estado);

  const criterios = [];
  for (const c of CRITERIOS) {
    let resultado;
    let tipo;
    if (c.origem === 'regra') {
      resultado = regras[c.id];
      tipo = 'Regra fixa';
    } else if (c.id === 'desinformacao' && heur.desinformacao === null) {
      continue; // cenário sem boato visível: critério não se aplica
    } else if (notasIA && notasIA[c.id]) {
      resultado = notasIA[c.id];
      tipo = 'IA';
    } else {
      resultado = heur[c.id];
      tipo = 'Heurística';
    }
    criterios.push({ id: c.id, nome: c.nome, fonte: c.fonte, tipo, nota: limitar(resultado.nota), justificativa: resultado.justificativa });
  }

  const media = Math.round((criterios.reduce((s, c) => s + c.nota, 0) / criterios.length) * 10) / 10;
  const sintese = notasIA?.sintese || sinteseAutomatica(criterios);
  return { criterios, media, sintese, geradaComIA: Boolean(notasIA), linhaDoTempo: linhaDoTempo(cenario, estado) };
}

function sinteseAutomatica(criterios) {
  const ordenados = [...criterios].sort((a, b) => b.nota - a.nota);
  const melhor = ordenados[0];
  const pior = ordenados[ordenados.length - 1];
  if (melhor.nota === pior.nota) return `Desempenho uniforme em todos os critérios (${melhor.nota}/5).`;
  return `Ponto forte: ${melhor.nome.toLowerCase()}. Ponto a melhorar: ${pior.nome.toLowerCase()}.`;
}

/** Linha do tempo legível das ações do aluno, usada na pós-crise e no relatório. */
export function linhaDoTempo(cenario, estado) {
  const itens = [];
  for (const r of estado.registro) {
    let texto;
    switch (r.tipo) {
      case 'pre_crise': texto = `Pré-crise: ${r.detalhe}`; break;
      case 'decisoes':
        texto = `Escolheu ${ESTRATEGIAS[r.detalhe.estrategia].nome.toLowerCase()}, ${PORTA_VOZES[r.detalhe.portaVoz].nome} e ${r.detalhe.distribuicao === 'organico' ? 'post orgânico' : 'post patrocinado'}`;
        break;
      case 'jornalista': texto = `Respondeu a ${r.detalhe}`; break;
      case 'sem_comentarios': texto = `Respondeu "sem comentários" a ${r.detalhe}`; break;
      case 'mais_prazo': texto = `Pediu mais prazo a ${r.detalhe}`; break;
      case 'comunicado': texto = 'Publicou o comunicado oficial'; break;
      case 'boato': texto = `Desmentiu o boato de ${r.detalhe}`; break;
      case 'fim_crise': texto = 'Encerrou a fase de crise'; break;
      default: texto = r.tipo;
    }
    itens.push({ tSim: r.tSim, texto, alerta: r.tipo === 'sem_comentarios' });
  }
  const fim = estado.criseEncerradaSim ?? Infinity;
  for (const e of eventosVisiveis(cenario, estado, fim)) {
    if (e.tipo === 'jornalista' && !estado.respostasJornalistas[e.id]) {
      itens.push({ tSim: null, texto: `Não respondeu a ${e.autor} dentro do prazo`, alerta: true });
    }
    if (e.tipo === 'boato' && !estado.respostasBoatos[e.id]) {
      itens.push({ tSim: null, texto: `Não respondeu ao boato de ${e.autor}`, alerta: true });
    }
  }
  return itens;
}
