import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerCenario, todos, T0, em } from './helpers.js';
import { validarCenario } from '../src/engine/scenarios.js';
import * as sim from '../src/engine/simulation.js';

test('todos os cenários do catálogo são válidos', () => {
  for (const c of todos()) assert.deepEqual(validarCenario(c), [], c.id);
});

test('validador aponta erros de cenário', () => {
  const c = lerCenario('boato-ia');
  const erros = validarCenario({ ...c, cluster_scct: 'outro', estrategias_adequadas: ['fugir'] });
  assert.ok(erros.some((e) => e.includes('cluster_scct')));
  assert.ok(erros.some((e) => e.includes('fugir')));
});

test('formatarTempo', () => {
  assert.equal(sim.formatarTempo(0), '00:00');
  assert.equal(sim.formatarTempo(272), '04:32');
  assert.equal(sim.formatarTempo(3725), '1:02:05');
});

test('a crise começa após a decisão de pré-crise e os eventos aparecem com o tempo', () => {
  const c = lerCenario('vazamento-dados-smartwatch');
  let e = sim.criarSessao(c);
  assert.equal(e.fase, 'pre_crise');
  assert.equal(sim.eventosVisiveis(c, e, em(100)).length, 0);
  e = sim.decidirPreCrise(c, e, 'comite', T0);
  assert.equal(e.fase, 'crise');
  assert.deepEqual(sim.eventosVisiveis(c, e, em(0)).map((x) => x.id), ['e1']);
  assert.deepEqual(sim.eventosVisiveis(c, e, em(300)).map((x) => x.id), ['e1', 'e2', 'e3', 'e4']);
});

test('a velocidade acelera o tempo simulado', () => {
  const c = lerCenario('vazamento-dados-smartwatch');
  let e = sim.criarSessao(c, { velocidade: 5 });
  e = sim.decidirPreCrise(c, e, 'comite', T0);
  assert.equal(sim.tempoSimulado(e, T0 + 60_000), 300);
});

test('pergunta de jornalista expira, e pedir mais prazo prorroga uma vez', () => {
  const c = lerCenario('vazamento-dados-smartwatch');
  let e = sim.decidirPreCrise(c, sim.criarSessao(c), 'comite', T0);
  const j = c.eventos.find((x) => x.id === 'e2'); // t=60, prazo 300
  assert.equal(sim.situacaoJornalista(j, e, em(100)).status, 'pendente');
  assert.equal(sim.situacaoJornalista(j, e, em(100)).restante, 260);
  assert.equal(sim.situacaoJornalista(j, e, em(361)).status, 'expirado');

  e = sim.responderJornalista(c, e, 'e2', { tipo: 'mais_prazo' }, em(200));
  assert.equal(sim.situacaoJornalista(j, e, em(361)).status, 'pendente');
  assert.throws(() => sim.responderJornalista(c, e, 'e2', { tipo: 'mais_prazo' }, em(210)), /prorrogado/);
  e = sim.responderJornalista(c, e, 'e2', { tipo: 'resposta', texto: 'Confirmamos e pedimos desculpas.' }, em(400));
  assert.equal(sim.situacaoJornalista(j, e, em(900)).status, 'resposta');
  assert.throws(() => sim.responderJornalista(c, e, 'e2', { tipo: 'resposta', texto: 'x' }, em(410)), /pendente/);
});

test('não publica comunicado sem decisões nem avança sem comunicado', () => {
  const c = lerCenario('vazamento-dados-smartwatch');
  let e = sim.decidirPreCrise(c, sim.criarSessao(c), 'comite', T0);
  assert.throws(() => sim.publicarComunicado(c, e, { titulo: 't', texto: 'x' }, em(10)), /Defina a resposta/);
  assert.equal(sim.podeEncerrarCrise(c, e, em(10)), false);
  assert.throws(() => sim.encerrarCrise(c, e, em(10)), /Publique/);
  // depois do tempo de encerramento, pode avançar mesmo sem comunicado
  assert.equal(sim.podeEncerrarCrise(c, e, em(c.encerramento_s)), true);
});

test('clima do público melhora com boa resposta e piora com má resposta', () => {
  const c = lerCenario('vazamento-dados-smartwatch');
  const base = sim.decidirPreCrise(c, sim.criarSessao(c), 'comite', T0);
  const semResposta = sim.calcularSentimento(c, base, em(600));

  let boa = sim.definirDecisoes(base, { estrategia: 'reconstruir', portaVoz: 'ceo', distribuicao: 'organico' }, em(500));
  boa = sim.publicarComunicado(c, boa, { titulo: 'Desculpas', texto: 'Erramos.' }, em(600));
  let ma = sim.definirDecisoes(base, { estrategia: 'negar', portaVoz: 'influenciador', distribuicao: 'patrocinado' }, em(500));
  ma = sim.publicarComunicado(c, ma, { titulo: 'Nota', texto: 'Não houve nada.' }, em(600));

  const sBoa = sim.calcularSentimento(c, boa, em(600));
  const sMa = sim.calcularSentimento(c, ma, em(600));
  assert.ok(sBoa < semResposta, `${sBoa} < ${semResposta}`);
  assert.ok(sMa > semResposta, `${sMa} > ${semResposta}`);
  assert.ok(sBoa >= 3 && sMa <= 97);
  assert.equal(sim.desfechoComunicado(c, boa), 'boa');
  assert.equal(sim.desfechoComunicado(c, ma), 'ruim');
});

test('responder ao boato reduz o sentimento negativo', () => {
  const c = lerCenario('vazamento-dados-smartwatch');
  const base = sim.decidirPreCrise(c, sim.criarSessao(c), 'comite', T0);
  const sem = sim.calcularSentimento(c, base, em(700));
  const com = sim.responderBoato(c, base, 'e4', 'O áudio é falso, gerado por IA.', em(400));
  assert.ok(sim.calcularSentimento(c, com, em(700)) < sem);
});

test('o tempo congela ao encerrar a crise', () => {
  const c = lerCenario('vazamento-dados-smartwatch');
  let e = sim.decidirPreCrise(c, sim.criarSessao(c), 'comite', T0);
  e = sim.definirDecisoes(e, { estrategia: 'reconstruir', portaVoz: 'ceo', distribuicao: 'organico' }, em(100));
  e = sim.publicarComunicado(c, e, { titulo: 't', texto: 'texto' }, em(200));
  e = sim.encerrarCrise(c, e, em(250));
  assert.equal(e.fase, 'pos_crise');
  assert.equal(sim.tempoSimulado(e, em(9999)), 250);
  e = sim.enviarReflexao(e, { diferente: 'a', recuperacao: 'b' });
  assert.equal(e.fase, 'debrief');
});
