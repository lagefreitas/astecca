// Motor da simulação: funções puras que recebem o estado e devolvem um novo estado.
// O tempo simulado é derivado do relógio real (Date.now) e da velocidade escolhida.
// Dessa forma, o relógio continua correto mesmo que a aba seja fechada e reaberta.

import { PRORROGACAO_S } from './constants.js';

/** Cria uma nova sessão de treino para um cenário. */
export function criarSessao(cenario, { velocidade = 1 } = {}) {
  return {
    versao: 1,
    cenarioId: cenario.id,
    fase: 'pre_crise',
    velocidade,
    criadaEm: null,
    criseIniciadaEm: null,
    criseEncerradaSim: null,
    decisaoPre: null,
    decisoes: null,
    respostasJornalistas: {},
    prorrogacoes: {},
    respostasBoatos: {},
    comunicado: null,
    sentimentoNaPublicacao: null,
    reacoes: null,
    reflexao: null,
    avaliacao: null,
    registro: []
  };
}

/** Segundos simulados desde o início da fase de crise. */
export function tempoSimulado(estado, agora) {
  if (estado.criseIniciadaEm == null) return 0;
  if (estado.criseEncerradaSim != null) return estado.criseEncerradaSim;
  return Math.max(0, Math.floor(((agora - estado.criseIniciadaEm) / 1000) * estado.velocidade));
}

export function formatarTempo(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(seg).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function registrar(estado, tSim, tipo, detalhe) {
  return [...estado.registro, { tSim, tipo, detalhe }];
}

/** Eventos do cenário que já apareceram no feed. */
export function eventosVisiveis(cenario, estado, agora) {
  const t = tempoSimulado(estado, agora);
  if (estado.fase === 'pre_crise') return [];
  return cenario.eventos.filter((e) => e.t <= t);
}

export function prazoJornalista(evento, estado) {
  return evento.t + evento.prazo_s + (estado.prorrogacoes[evento.id] || 0);
}

/** Situação de uma pergunta de jornalista: pendente, respondida, sem comentários ou expirada. */
export function situacaoJornalista(evento, estado, agora) {
  const t = tempoSimulado(estado, agora);
  const resposta = estado.respostasJornalistas[evento.id];
  if (resposta) return { status: resposta.tipo, restante: 0 };
  const prazo = prazoJornalista(evento, estado);
  if (t > prazo) return { status: 'expirado', restante: 0 };
  return { status: 'pendente', restante: prazo - t };
}

export function jornalistasPendentes(cenario, estado, agora) {
  return eventosVisiveis(cenario, estado, agora)
    .filter((e) => e.tipo === 'jornalista')
    .map((e) => ({ evento: e, ...situacaoJornalista(e, estado, agora) }))
    .filter((j) => j.status === 'pendente');
}

export function boatosVisiveis(cenario, estado, agora) {
  return eventosVisiveis(cenario, estado, agora).filter((e) => e.tipo === 'boato');
}

// ---------- Ações do aluno ----------

export function decidirPreCrise(cenario, estado, opcaoId, agora) {
  if (estado.fase !== 'pre_crise') throw new Error('A decisão de pré-crise já foi tomada.');
  const opcao = cenario.pre_crise.opcoes.find((o) => o.id === opcaoId);
  if (!opcao) throw new Error(`Opção desconhecida: ${opcaoId}`);
  return {
    ...estado,
    fase: 'crise',
    criadaEm: estado.criadaEm ?? agora,
    criseIniciadaEm: agora,
    decisaoPre: opcaoId,
    registro: registrar(estado, 0, 'pre_crise', opcao.texto)
  };
}

export function definirDecisoes(estado, { estrategia, portaVoz, distribuicao }, agora) {
  exigirFase(estado, 'crise');
  if (estado.comunicado) throw new Error('O comunicado já foi publicado.');
  if (!estrategia || !portaVoz || !distribuicao) throw new Error('Escolha estratégia, porta-voz e distribuição.');
  const t = tempoSimulado(estado, agora);
  return {
    ...estado,
    decisoes: { estrategia, portaVoz, distribuicao, tSim: t },
    registro: registrar(estado, t, 'decisoes', { estrategia, portaVoz, distribuicao })
  };
}

export function responderJornalista(cenario, estado, eventoId, { tipo, texto = '' }, agora) {
  exigirFase(estado, 'crise');
  const evento = cenario.eventos.find((e) => e.id === eventoId && e.tipo === 'jornalista');
  if (!evento) throw new Error(`Pergunta desconhecida: ${eventoId}`);
  const situacao = situacaoJornalista(evento, estado, agora);
  if (situacao.status !== 'pendente') throw new Error('Esta pergunta não está mais pendente.');
  const t = tempoSimulado(estado, agora);

  if (tipo === 'mais_prazo') {
    if (estado.prorrogacoes[eventoId]) throw new Error('O prazo já foi prorrogado uma vez.');
    return {
      ...estado,
      prorrogacoes: { ...estado.prorrogacoes, [eventoId]: PRORROGACAO_S },
      registro: registrar(estado, t, 'mais_prazo', evento.autor)
    };
  }
  if (tipo === 'resposta' && texto.trim().length === 0) throw new Error('Escreva a resposta antes de enviar.');
  if (tipo !== 'resposta' && tipo !== 'sem_comentarios') throw new Error(`Tipo de resposta inválido: ${tipo}`);

  return {
    ...estado,
    respostasJornalistas: { ...estado.respostasJornalistas, [eventoId]: { tipo, texto: texto.trim(), tSim: t } },
    registro: registrar(estado, t, tipo === 'resposta' ? 'jornalista' : 'sem_comentarios', evento.autor)
  };
}

export function publicarComunicado(cenario, estado, { titulo, texto }, agora) {
  exigirFase(estado, 'crise');
  if (!estado.decisoes) throw new Error('Defina a resposta antes de publicar o comunicado.');
  if (estado.comunicado) throw new Error('O comunicado já foi publicado.');
  if (!texto || texto.trim().length === 0) throw new Error('Escreva o comunicado antes de publicar.');
  const t = tempoSimulado(estado, agora);
  const antes = calcularSentimento(cenario, estado, agora);
  return {
    ...estado,
    comunicado: { titulo: (titulo || '').trim(), texto: texto.trim(), tSim: t },
    sentimentoNaPublicacao: antes,
    registro: registrar(estado, t, 'comunicado', (titulo || '').trim())
  };
}

export function responderBoato(cenario, estado, eventoId, texto, agora) {
  exigirFase(estado, 'crise');
  const evento = cenario.eventos.find((e) => e.id === eventoId && e.tipo === 'boato');
  if (!evento) throw new Error(`Boato desconhecido: ${eventoId}`);
  if (estado.respostasBoatos[eventoId]) throw new Error('Este boato já foi respondido.');
  if (!texto || texto.trim().length === 0) throw new Error('Escreva a resposta ao boato.');
  const t = tempoSimulado(estado, agora);
  return {
    ...estado,
    respostasBoatos: { ...estado.respostasBoatos, [eventoId]: { texto: texto.trim(), tSim: t } },
    registro: registrar(estado, t, 'boato', evento.autor)
  };
}

export function definirReacoes(estado, reacoes) {
  return { ...estado, reacoes };
}

export function podeEncerrarCrise(cenario, estado, agora) {
  return estado.fase === 'crise' && (estado.comunicado != null || tempoSimulado(estado, agora) >= cenario.encerramento_s);
}

export function encerrarCrise(cenario, estado, agora) {
  if (!podeEncerrarCrise(cenario, estado, agora)) {
    throw new Error('Publique o comunicado antes de avançar para a pós-crise.');
  }
  const t = tempoSimulado(estado, agora);
  return {
    ...estado,
    fase: 'pos_crise',
    criseEncerradaSim: t,
    registro: registrar(estado, t, 'fim_crise', null)
  };
}

export function enviarReflexao(estado, { diferente, recuperacao }) {
  exigirFase(estado, 'pos_crise');
  return {
    ...estado,
    fase: 'debrief',
    reflexao: { diferente: (diferente || '').trim(), recuperacao: (recuperacao || '').trim() }
  };
}

export function definirAvaliacao(estado, avaliacao) {
  return { ...estado, avaliacao };
}

function exigirFase(estado, fase) {
  if (estado.fase !== fase) throw new Error(`Ação permitida apenas na fase "${fase}".`);
}

// ---------- Clima do público ----------

/**
 * Percentual de menções negativas (3 a 97). É um modelo simples e determinístico,
 * pensado para dar retorno imediato ao aluno, sem pretensão de prever o mundo real.
 */
export function calcularSentimento(cenario, estado, agora) {
  let s = cenario.sentimento_inicial;
  const pre = cenario.pre_crise.opcoes.find((o) => o.id === estado.decisaoPre);
  if (pre) s += pre.efeito_sentimento;

  const t = tempoSimulado(estado, agora);
  for (const e of eventosVisiveis(cenario, estado, agora)) {
    s += e.impacto || 0;
    if (e.tipo === 'jornalista') {
      const sit = situacaoJornalista(e, estado, agora);
      if (sit.status === 'resposta') s -= e.impacto;
      if (sit.status === 'sem_comentarios') s += 4;
      if (sit.status === 'expirado') s += 6;
    }
    if (e.tipo === 'boato') {
      const r = estado.respostasBoatos[e.id];
      if (r) s -= Math.round(e.impacto * 0.8);
      else if (t - e.t > 300) s += Math.round(e.impacto * 0.5);
    }
  }

  if (estado.comunicado && estado.decisoes) {
    const { estrategia, portaVoz, distribuicao } = estado.decisoes;
    let alivio;
    if (cenario.estrategias_adequadas.includes(estrategia)) alivio = 30;
    else if (cenario.estrategias_aceitaveis.includes(estrategia)) alivio = 18;
    else if (estrategia === 'negar') alivio = -10;
    else alivio = 5;
    const tp = estado.comunicado.tSim;
    const fator = tp <= cenario.tempo_ideal_s ? 1 : tp <= 2 * cenario.tempo_ideal_s ? 0.7 : 0.4;
    s -= Math.round(alivio * fator);
    if (cenario.porta_voz.recomendado.includes(portaVoz)) s -= 5;
    if (portaVoz === 'influenciador') s += 6;
    if (distribuicao === 'patrocinado') s += 8;
  }
  return Math.min(97, Math.max(3, Math.round(s)));
}

/** Qualidade geral da resposta, usada para escolher as reações do público no modo sem IA. */
export function desfechoComunicado(cenario, estado) {
  if (!estado.decisoes) return 'ruim';
  const { estrategia, distribuicao } = estado.decisoes;
  let desfecho;
  if (cenario.estrategias_adequadas.includes(estrategia)) desfecho = 'boa';
  else if (cenario.estrategias_aceitaveis.includes(estrategia)) desfecho = 'mista';
  else desfecho = 'ruim';
  if (distribuicao === 'patrocinado' && desfecho === 'boa') desfecho = 'mista';
  return desfecho;
}
