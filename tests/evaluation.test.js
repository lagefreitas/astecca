import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerCenario, T0, em } from './helpers.js';
import * as sim from '../src/engine/simulation.js';
import { montarAvaliacao } from '../src/evaluation/rubric.js';
import { notaSinceridade, notaEmpatia, notaEppm, notaDesinformacao } from '../src/evaluation/heuristics.js';
import { gerarMarkdown } from '../src/report/report.js';

const BOM_TEXTO = `Nós erramos e pedimos desculpas. Sabemos que vocês confiaram seus dados de saúde a nós.
Dados de frequência cardíaca de cerca de 180 mil usuários foram compartilhados sem o consentimento claro que vocês merecem, o que expõe informações sensíveis.
Suspendemos hoje esse compartilhamento. Para apagar seu histórico, acesse o app em Configurações › Privacidade › Apagar dados de saúde.
Dúvidas? Fale com nosso canal de atendimento.`;

const TEXTO_RUIM = 'Prezados, informamos que não houve qualquer irregularidade. A responsabilidade do parceiro será apurada. Lamentamos eventuais transtornos.';

function sessaoBoa(c) {
  let e = sim.decidirPreCrise(c, sim.criarSessao(c), 'comite', T0);
  e = sim.responderJornalista(c, e, 'e2', { tipo: 'resposta', texto: 'Confirmamos e vamos suspender o envio.' }, em(200));
  e = sim.definirDecisoes(e, { estrategia: 'reconstruir', portaVoz: 'ceo', distribuicao: 'organico' }, em(400));
  e = sim.responderBoato(c, e, 'e4', 'O áudio é falso, gerado por inteligência artificial. Confira os canais oficiais.', em(500));
  e = sim.publicarComunicado(c, e, { titulo: 'Um pedido de desculpas', texto: BOM_TEXTO }, em(600));
  e = sim.encerrarCrise(c, e, em(700));
  return sim.enviarReflexao(e, { diferente: 'Responderia antes.', recuperacao: 'Auditoria externa.' });
}

function sessaoRuim(c) {
  let e = sim.decidirPreCrise(c, sim.criarSessao(c), 'monitorar', T0);
  e = sim.responderJornalista(c, e, 'e2', { tipo: 'sem_comentarios' }, em(200));
  e = sim.definirDecisoes(e, { estrategia: 'negar', portaVoz: 'influenciador', distribuicao: 'patrocinado' }, em(1500));
  e = sim.publicarComunicado(c, e, { titulo: 'Nota oficial', texto: TEXTO_RUIM }, em(2000));
  e = sim.encerrarCrise(c, e, em(2100));
  return sim.enviarReflexao(e, { diferente: '', recuperacao: '' });
}

test('boa resposta recebe nota alta, e má resposta recebe nota baixa', () => {
  const c = lerCenario('vazamento-dados-smartwatch');
  const boa = montarAvaliacao(c, sessaoBoa(c));
  const ruim = montarAvaliacao(c, sessaoRuim(c));
  assert.ok(boa.media >= 4.3, `média boa ${boa.media}`);
  assert.ok(ruim.media <= 1.8, `média ruim ${ruim.media}`);
  assert.equal(boa.criterios.length, 8);
  assert.ok(boa.criterios.every((x) => x.nota >= 1 && x.nota <= 5));
  assert.equal(boa.criterios.find((x) => x.id === 'estrategia').tipo, 'Regra fixa');
  assert.equal(boa.criterios.find((x) => x.id === 'empatia').tipo, 'Heurística');
});

test('a avaliação usa as notas da IA quando disponíveis', () => {
  const c = lerCenario('vazamento-dados-smartwatch');
  const ia = {
    sinceridade: { nota: 2, justificativa: 'IA-s' },
    empatia: { nota: 3, justificativa: 'IA-e' },
    eppm: { nota: 4, justificativa: 'IA-p' },
    desinformacao: { nota: 5, justificativa: 'IA-d' },
    sintese: 'Síntese da IA.'
  };
  const a = montarAvaliacao(c, sessaoBoa(c), ia);
  const emp = a.criterios.find((x) => x.id === 'empatia');
  assert.equal(emp.tipo, 'IA');
  assert.equal(emp.nota, 3);
  assert.equal(a.sintese, 'Síntese da IA.');
  assert.equal(a.geradaComIA, true);
});

test('critério de desinformação não se aplica quando não houve boato visível', () => {
  const c = lerCenario('vazamento-dados-smartwatch'); // boato aparece em t=300
  let e = sim.decidirPreCrise(c, sim.criarSessao(c), 'comite', T0);
  e = sim.definirDecisoes(e, { estrategia: 'reconstruir', portaVoz: 'ceo', distribuicao: 'organico' }, em(50));
  e = sim.publicarComunicado(c, e, { titulo: 't', texto: BOM_TEXTO }, em(100));
  e = sim.encerrarCrise(c, e, em(120));
  const a = montarAvaliacao(c, e);
  assert.equal(a.criterios.find((x) => x.id === 'desinformacao'), undefined);
  assert.equal(a.criterios.length, 7);
});

test('em crise de vítima, negar o boato é a estratégia adequada', () => {
  const c = lerCenario('boato-ia');
  let e = sim.decidirPreCrise(c, sim.criarSessao(c), 'comite', T0);
  e = sim.definirDecisoes(e, { estrategia: 'negar', portaVoz: 'rp', distribuicao: 'organico' }, em(100));
  e = sim.publicarComunicado(c, e, { titulo: 't', texto: 'O vídeo é falso. O laudo da vigilância aprovou todos os lotes.' }, em(200));
  e = sim.encerrarCrise(c, e, em(300));
  const a = montarAvaliacao(c, e);
  assert.equal(a.criterios.find((x) => x.id === 'estrategia').nota, 5);
});

test('heurísticas de texto', () => {
  assert.ok(notaSinceridade(BOM_TEXTO, 'evitavel').nota >= 4);
  assert.ok(notaSinceridade(TEXTO_RUIM, 'evitavel').nota <= 2);
  assert.ok(notaEmpatia(BOM_TEXTO).nota >= 4);
  assert.ok(notaEmpatia(TEXTO_RUIM).nota <= 2);
  assert.equal(notaEppm(BOM_TEXTO).nota, 5);
  assert.ok(notaEppm('Pedimos desculpas.').nota <= 2);
  const boatos = [{ id: 'b1' }];
  assert.equal(notaDesinformacao([], {}, ''), null);
  assert.equal(notaDesinformacao(boatos, {}, '').nota, 1);
  assert.equal(notaDesinformacao(boatos, { b1: { texto: 'É falso. Veja o laudo no nosso site.' } }, '').nota, 5);
});

test('linha do tempo aponta omissões', () => {
  const c = lerCenario('vazamento-dados-smartwatch');
  const a = montarAvaliacao(c, sessaoRuim(c));
  assert.ok(a.linhaDoTempo.some((i) => i.alerta && i.texto.includes('boato')));
  assert.ok(a.linhaDoTempo.some((i) => i.alerta && i.texto.includes('Diego Alves')));
});

test('relatório em Markdown inclui nota, critérios e textos', () => {
  const c = lerCenario('vazamento-dados-smartwatch');
  let e = sessaoBoa(c);
  e = sim.definirAvaliacao(e, montarAvaliacao(c, e));
  const md = gerarMarkdown(c, e, { aluno: 'Ana' });
  assert.match(md, /# Relatório de simulação/);
  assert.match(md, /\*\*Aluno\(a\):\*\* Ana/);
  assert.match(md, /\| Tempo de resposta \|/);
  assert.match(md, /Um pedido de desculpas/);
  assert.match(md, /A nota final é do professor/);
});
