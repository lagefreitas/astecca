// Página do relatório para impressão ou "Salvar como PDF".
import { h } from '../lib/dom.js';
import { carregar, CHAVE_SESSAO, CHAVE_CONFIG } from '../lib/storage.js';
import { carregarCenario } from '../engine/scenarios.js';
import { CLUSTERS, ESTRATEGIAS, PORTA_VOZES, DISTRIBUICOES } from '../engine/constants.js';
import { formatarTempo } from '../engine/simulation.js';

const raiz = document.getElementById('relatorio');

async function iniciar() {
  const salvo = await carregar(CHAVE_SESSAO);
  const config = (await carregar(CHAVE_CONFIG)) || {};
  const s = salvo?.sessao;
  if (!s?.avaliacao) {
    raiz.replaceChildren(h('p', {}, 'Nenhum relatório disponível. Conclua uma simulação no painel do Astecca.'));
    return;
  }
  const c = await carregarCenario(s.cenarioId);
  const a = s.avaliacao;
  const d = s.decisoes;
  const faixa = (n) => (n >= 4 ? 'bom' : n === 3 ? 'medio' : 'fraco');
  document.title = `Relatório Astecca — ${c.titulo}`;

  raiz.replaceChildren(...[
    h('div', { class: 'acoes' }, h('button', { onclick: () => window.print() }, 'Imprimir ou salvar em PDF')),
    h('h1', {}, `Relatório de simulação — ${c.titulo}`),
    h('p', { class: 'meta' },
      config.aluno ? `Aluno(a): ${config.aluno} · ` : '',
      `${new Date(s.criadaEm || Date.now()).toLocaleString('pt-BR')} · ${c.empresa.nome} · Grupo SCCT: ${CLUSTERS[c.cluster_scct].nome}`),
    h('div', { class: 'nota-geral' }, h('strong', {}, `${String(a.media).replace('.', ',')}/5`), h('span', {}, a.sintese)),
    h('h2', {}, 'Decisões'),
    d ? h('ul', {},
      h('li', {}, `Estratégia: ${ESTRATEGIAS[d.estrategia].nome}`),
      h('li', {}, `Porta-voz: ${PORTA_VOZES[d.portaVoz].nome}`),
      h('li', {}, `Distribuição: ${DISTRIBUICOES[d.distribuicao].nome}`)) : h('p', {}, 'O aluno não definiu a resposta.'),
    h('h2', {}, 'Linha do tempo'),
    h('ul', { class: 'tempo' }, a.linhaDoTempo.map((i) => h('li', { class: i.alerta ? 'alerta' : '' },
      h('span', { class: 't' }, i.tSim == null ? '—' : `T+${formatarTempo(i.tSim)}`), i.texto))),
    h('h2', {}, 'Avaliação por critério'),
    h('table', {},
      h('thead', {}, h('tr', {}, ['Critério', 'Nota', 'Origem', 'Justificativa', 'Fonte'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, a.criterios.map((x) => h('tr', {},
        h('td', {}, x.nome), h('td', { class: `nota ${faixa(x.nota)}` }, `${x.nota}/5`), h('td', {}, x.tipo), h('td', {}, x.justificativa), h('td', {}, x.fonte))))),
    h('h2', {}, 'Comunicado oficial'),
    s.comunicado ? h('blockquote', {}, h('strong', {}, s.comunicado.titulo || '(sem título)'), '\n\n', s.comunicado.texto) : h('p', {}, 'Não publicado.'),
    Object.keys(s.respostasJornalistas).length > 0 && [
      h('h2', {}, 'Respostas à imprensa'),
      Object.entries(s.respostasJornalistas).map(([id, r]) => {
        const ev = c.eventos.find((e) => e.id === id);
        return [h('p', {}, h('strong', {}, `${ev.autor}: `), `"${ev.texto}"`), h('blockquote', {}, r.tipo === 'sem_comentarios' ? 'Sem comentários.' : r.texto)];
      })],
    Object.keys(s.respostasBoatos).length > 0 && [
      h('h2', {}, 'Respostas a boatos'),
      Object.entries(s.respostasBoatos).map(([id, r]) => {
        const ev = c.eventos.find((e) => e.id === id);
        return [h('p', {}, h('strong', {}, `Boato de ${ev.autor}: `), `"${ev.texto}"`), h('blockquote', {}, r.texto)];
      })],
    s.reflexao && [
      h('h2', {}, 'Reflexão pós-crise'),
      h('p', {}, h('strong', {}, 'O que faria diferente: '), s.reflexao.diferente || 'Sem resposta.'),
      h('p', {}, h('strong', {}, 'Ações de recuperação para os próximos 30 dias: '), s.reflexao.recuperacao || 'Sem resposta.')],
    h('p', { class: 'rodape' }, `Avaliação de apoio gerada pelo Astecca ${a.geradaComIA ? 'com IA' : 'sem IA (heurísticas)'}. A nota final é do professor.`)
  ].flat(Infinity).filter(Boolean));
}

iniciar();
