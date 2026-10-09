// Interface do Astecca, aberta numa aba inteira do Chrome. Cada tela é uma função que devolve um elemento.
// O estado da sessão é salvo a cada ação. Dessa forma, o aluno pode fechar a aba e voltar depois.

import { h, icone } from '../lib/dom.js';
import { carregar, salvar, CHAVE_SESSAO, CHAVE_CONFIG } from '../lib/storage.js';
import { carregarCatalogo } from '../engine/scenarios.js';
import * as sim from '../engine/simulation.js';
import { CLUSTERS, ESTRATEGIAS, PORTA_VOZES, DISTRIBUICOES, NOMES_FASES, FASES } from '../engine/constants.js';
import { montarAvaliacao, linhaDoTempo } from '../evaluation/rubric.js';
import { iaConfigurada, listarModelos, normalizarConfig, sugerirModelo, PROVEDORES } from '../llm/client.js';
import { avaliarComIA, gerarReacoesComIA } from '../llm/prompts.js';
import { gerarMarkdown } from '../report/report.js';

const CONFIG_PADRAO = { provedor: 'anthropic', chaves: { anthropic: '', openai: '', gemini: '' }, urlBase: '', modelo: '', velocidade: 1, aluno: '', dicas: true };
const LIMITE_RESPOSTA = 600;
const LIMITE_COMUNICADO = 1500;

const app = {
  catalogo: [],
  cenario: null,
  sessao: null,
  view: 'inicio',
  param: null,
  config: { ...CONFIG_PADRAO },
  rascunhos: {},
  selecionado: null,
  escolhaPre: null,
  aviso: null,
  erro: null,
  erroIA: null,
  ocupado: null,
  modelos: [],
  statusConfig: '',
  assinatura: ''
};

const raiz = document.getElementById('app');
const agora = () => Date.now();

// ---------- Persistência ----------

let temporizadorSalvar = null;
function persistir(imediato = false) {
  const salvarAgora = () => salvar(CHAVE_SESSAO, app.sessao
    ? { sessao: app.sessao, view: app.view, param: app.param, rascunhos: app.rascunhos, aviso: app.aviso }
    : null);
  clearTimeout(temporizadorSalvar);
  if (imediato) salvarAgora();
  else temporizadorSalvar = setTimeout(salvarAgora, 400);
}

function rascunho(chave, padrao = '') {
  return app.rascunhos[chave] ?? padrao;
}

function guardarRascunho(chave, valor) {
  app.rascunhos[chave] = valor;
  persistir();
}

// ---------- Navegação e ações ----------

function ir(view, param = null) {
  app.view = view;
  app.param = param;
  app.erro = null;
  persistir(true);
  render();
  window.scrollTo(0, 0);
}

function executar(acao, depois) {
  try {
    app.sessao = acao(app.sessao);
    app.erro = null;
    persistir(true);
    if (depois) depois();
    else render();
  } catch (e) {
    app.erro = e.message;
    render();
  }
}

function iniciarSimulacao() {
  const cenario = app.catalogo.find((c) => c.id === app.selecionado);
  if (!cenario) return;
  app.cenario = cenario;
  app.sessao = sim.criarSessao(cenario, { velocidade: Number(app.config.velocidade) || 1 });
  app.rascunhos = {};
  app.escolhaPre = null;
  app.aviso = null;
  app.erroIA = null;
  ir('pre_crise');
}

function descartarSessao() {
  app.sessao = null;
  app.cenario = null;
  app.rascunhos = {};
  app.aviso = null;
  persistir(true);
  ir('inicio');
}

async function gerarReacoes() {
  const { cenario } = app;
  app.ocupado = 'reacoes';
  render();
  let posts = null;
  let origem = 'cenario';
  if (iaConfigurada(app.config)) {
    try {
      posts = await gerarReacoesComIA(app.config, cenario, app.sessao);
      origem = 'ia';
    } catch (e) {
      app.erroIA = e.message;
    }
  }
  if (!posts) posts = cenario.reacoes[sim.desfechoComunicado(cenario, app.sessao)];
  app.sessao = sim.definirReacoes(app.sessao, { posts, origem });
  app.ocupado = null;
  persistir(true);
  render();
}

async function gerarAvaliacao() {
  const { cenario } = app;
  app.ocupado = 'avaliacao';
  render();
  let notasIA = null;
  if (iaConfigurada(app.config)) {
    try {
      notasIA = await avaliarComIA(app.config, cenario, app.sessao);
    } catch (e) {
      app.erroIA = e.message;
    }
  }
  app.sessao = sim.definirAvaliacao(app.sessao, montarAvaliacao(cenario, app.sessao, notasIA));
  app.ocupado = null;
  persistir(true);
  render();
}

function baixarMarkdown() {
  const md = gerarMarkdown(app.cenario, app.sessao, { aluno: app.config.aluno });
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const data = new Date().toISOString().slice(0, 10);
  const a = h('a', { href: url, download: `astecca-${app.cenario.id}-${data}.md` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function abrirImpressao() {
  const url = typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('src/report/report.html')
    : new URL('../report/report.html', import.meta.url).href;
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) chrome.tabs.create({ url });
  else window.open(url, '_blank');
}

// ---------- Componentes ----------

function textoTempo(segundos) {
  return `T+${sim.formatarTempo(segundos)}`;
}

function relogio() {
  const s = app.sessao;
  const t = sim.tempoSimulado(s, agora());
  return h('div', { class: `relogio${s.fase === 'crise' ? ' ativo' : ''}`, 'data-relogio': '', 'aria-label': 'Tempo simulado' }, textoTempo(t));
}

function fases() {
  const atual = FASES.indexOf(app.sessao.fase);
  return h('ol', { class: 'fases', 'aria-label': 'Fases da simulação' },
    FASES.map((f, i) => {
      let classe = '';
      if (i < atual) classe = 'feita';
      if (i === atual) classe = `atual${f === 'crise' ? ' crise' : f === 'pos_crise' ? ' pos' : ''}`;
      return h('li', { class: classe, 'aria-current': i === atual ? 'step' : null }, NOMES_FASES[f]);
    }));
}

function topoSimulacao() {
  const { cenario } = app;
  return h('header', { class: 'topo' },
    h('div', { class: 'topo-linha' },
      h('div', { class: 'identificacao' },
        h('strong', {}, 'Astecca'),
        h('span', {}, `${cenario.empresa.nome} · ${cenario.titulo}`)),
      app.sessao.fase === 'debrief'
        ? h('span', { class: 'texto-mudo', style: 'white-space:nowrap' }, `Duração ${sim.formatarTempo(app.sessao.criseEncerradaSim || 0)}`)
        : relogio()),
    fases());
}

function topoSecundario(titulo, voltarPara) {
  const t = sim.tempoSimulado(app.sessao, agora());
  return h('header', { class: 'topo topo-sub' },
    h('button', { class: 'botao-icone', 'aria-label': 'Voltar', onclick: () => ir(voltarPara) }, icone('voltar')),
    h('div', { class: 'identificacao' },
      h('strong', {}, titulo),
      h('span', {}, NOMES_FASES[app.sessao.fase], ' · ', h('span', { 'data-relogio': '' }, textoTempo(t)))),
    h('span', { class: 'novidades', 'data-novidades': '', 'aria-live': 'polite' }, textoNovidades()));
}

function textoNovidades() {
  if (!app.sessao || app.sessao.fase !== 'crise') return '';
  const pend = sim.jornalistasPendentes(app.cenario, app.sessao, agora()).length;
  return pend ? `${pend} jornalista${pend > 1 ? 's' : ''} aguardando` : '';
}

function caixaErro() {
  if (!app.erro) return null;
  return h('div', { class: 'aviso alerta erro', role: 'alert' }, icone('alerta', 'icone'), h('div', { class: 'corpo' }, app.erro));
}

function rodape(...filhos) {
  return h('footer', { class: 'rodape' }, filhos);
}

function fatosConfirmados() {
  return h('details', {},
    h('summary', {}, 'Fatos confirmados pelo comitê'),
    h('ul', {}, app.cenario.fatos.map((f) => h('li', {}, f))));
}

function campoTexto({ id, rotulo, chave, limite, classe, placeholder }) {
  const contador = h('span', { class: 'contador' });
  const atualizar = (v) => { contador.textContent = `${v.length} / ${limite.toLocaleString('pt-BR')} caracteres`; };
  const area = h('textarea', {
    id, class: classe, maxlength: String(limite), placeholder,
    value: rascunho(chave),
    oninput: (e) => { guardarRascunho(chave, e.target.value); atualizar(e.target.value); }
  });
  atualizar(rascunho(chave));
  return h('div', { class: 'campo' }, h('label', { for: id }, rotulo), area, contador);
}

function iniciais(nome) {
  return nome.replace(/^@/, '').split(/[\s.]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

// ---------- Telas ----------

function telaCarregando(msg) {
  return h('div', { class: 'carregando', role: 'status' }, h('div', { class: 'giro' }), msg);
}

function telaInicio() {
  const emAndamento = app.sessao && app.cenario;
  const semIA = !iaConfigurada(app.config);
  return h('div', { class: 'tela' },
    h('header', { class: 'topo' },
      h('div', { class: 'topo-linha' },
        h('div', { class: 'marca' }, icone('alerta', 'icone'), 'Astecca'),
        h('button', { class: 'botao-icone', 'aria-label': 'Configurações', onclick: () => ir('config') }, icone('config')))),
    h('main', { class: 'principal' },
      emAndamento && h('div', { class: 'cartao' },
        h('span', { class: 'sobretitulo' }, 'Simulação em andamento'),
        h('strong', {}, app.cenario.titulo),
        h('span', { class: 'texto-mudo' }, `Fase: ${NOMES_FASES[app.sessao.fase]}`),
        h('div', { class: 'grade-2', style: 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px' },
          h('button', { class: 'botao terciario', onclick: descartarSessao }, 'Descartar'),
          h('button', { class: 'botao primario', onclick: () => ir(telaDaFase()) }, 'Continuar'))),
      h('div', { class: 'bloco' },
        h('span', { class: 'sobretitulo' }, 'Treino de Comunicação de Crise'),
        h('h1', {}, 'Escolha uma crise para gerenciar'),
        h('p', { class: 'texto-2' }, 'Você será o profissional de RP da empresa. A simulação passa por três fases: pré-crise, crise e pós-crise.')),
      h('div', { class: 'bloco', role: 'group', 'aria-label': 'Cenários' },
        app.catalogo.map((c) => h('button', {
          class: 'cartao cartao-cenario',
          'aria-pressed': String(app.selecionado === c.id),
          onclick: () => { app.selecionado = c.id; render(); }
        },
          h('div', { class: 'linha-entre' },
            h('span', { class: `etiqueta${app.selecionado === c.id ? ' forte' : ''}` }, CLUSTERS[c.cluster_scct].nome),
            h('span', { class: 'texto-mudo' }, `~${c.duracao_min} min · ${c.dificuldade}${c.rascunho ? ' · Rascunho' : ''}`)),
          h('span', { class: 'titulo' }, c.titulo),
          h('span', { class: 'texto-2' }, c.resumo)))),
      h('p', { class: 'texto-mudo' }, 'Os grupos seguem a SCCT: quanto mais evitável a crise, maior a responsabilidade atribuída à empresa.'),
      semIA && h('div', { class: 'aviso info' }, icone('info', 'icone'),
        h('div', { class: 'corpo' }, 'Modo sem IA: os textos serão avaliados por heurísticas simples. Para usar IA, abra as ',
          h('button', { class: 'link', onclick: () => ir('config') }, 'configurações'), '.'))),
    rodape(h('button', { class: 'botao primario', disabled: !app.selecionado, onclick: iniciarSimulacao }, 'Iniciar simulação')));
}

function telaDaFase() {
  switch (app.sessao?.fase) {
    case 'pre_crise': return 'pre_crise';
    case 'crise': return 'feed';
    case 'pos_crise': return 'pos_crise';
    case 'debrief': return 'debrief';
    default: return 'inicio';
  }
}

function telaPreCrise() {
  const { cenario } = app;
  const icones = { forum: 'forum', email: 'email', grafico: 'grafico' };
  return h('div', { class: 'tela' },
    topoSimulacao(),
    h('main', { class: 'principal' },
      h('section', { class: 'cartao' },
        h('span', { class: 'sobretitulo' }, 'Seu papel'),
        h('p', {}, cenario.papel)),
      h('section', { class: 'bloco' },
        h('h2', {}, 'Sinais fracos detectados'),
        cenario.pre_crise.sinais.map((s) => h('div', { class: 'cartao sinal' }, icone(icones[s.icone] || 'info', 'icone'), h('span', { class: 'texto-2' }, s.texto)))),
      h('fieldset', {},
        h('legend', {}, 'O que você faz agora?'),
        cenario.pre_crise.opcoes.map((o) => h('label', { class: 'opcao' },
          h('input', { type: 'radio', name: 'pre', value: o.id, checked: app.escolhaPre === o.id, onchange: () => { app.escolhaPre = o.id; render(); } }),
          o.texto)))),
    caixaErro(),
    rodape(h('button', {
      class: 'botao primario',
      disabled: !app.escolhaPre,
      onclick: () => {
        const opcao = cenario.pre_crise.opcoes.find((o) => o.id === app.escolhaPre);
        executar((s) => sim.decidirPreCrise(cenario, s, app.escolhaPre, agora()), () => {
          app.aviso = opcao.feedback;
          ir('feed');
        });
      }
    }, 'Confirmar decisão')));
}

function bannersJornalistas() {
  return sim.jornalistasPendentes(app.cenario, app.sessao, agora()).map((j) =>
    h('button', { class: 'banner', onclick: () => ir('jornalista', j.evento.id) },
      h('span', { class: 'esq' }, icone('telefone', 'icone'), `${j.evento.autor} aguarda resposta`),
      h('span', { class: 'tempo', 'data-prazo': j.evento.id }, sim.formatarTempo(j.restante))));
}

function climaAtual() {
  const valor = sim.calcularSentimento(app.cenario, app.sessao, agora());
  return h('section', { class: 'clima', 'aria-label': 'Clima do público' },
    h('div', { class: 'linha-entre' },
      h('strong', { style: 'font-size:12px' }, 'Clima do público'),
      h('span', { class: 'texto-mudo', 'data-clima-texto': '' }, `${valor}% negativo`)),
    h('div', { class: 'barra' }, h('span', { 'data-clima-barra': '', style: `width:${valor}%` })));
}

function comparacaoClima() {
  const antes = app.sessao.sentimentoNaPublicacao;
  const depois = sim.calcularSentimento(app.cenario, app.sessao, agora());
  const linha = (rotulo, v, attr) => [
    h('span', { class: 'texto-mudo' }, rotulo),
    h('div', { class: 'barra' }, h('span', { style: `width:${v}%`, [attr]: '' })),
    h('span', { class: 'valor', [`${attr}-texto`]: '' }, `${v}%`)
  ];
  return h('section', { class: 'cartao', 'aria-label': 'Clima do público' },
    h('h2', {}, 'Clima do público'),
    h('div', { class: 'comparacao' }, linha('Antes', antes, 'data-antes'), linha('Agora', depois, 'data-clima-barra')),
    h('span', { class: 'texto-mudo' }, 'Percentual de menções negativas'));
}

function cartaoEvento(e) {
  const s = app.sessao;
  const rotulos = { imprensa: 'Imprensa', post: null, boato: 'Boato', jornalista: 'Pergunta' };
  const meta = h('div', { class: 'meta' },
    h('span', {}, h('strong', {}, e.autor), ` · ${e.perfil}`),
    rotulos[e.tipo] && h('span', { class: `etiqueta${e.tipo === 'boato' ? ' alerta' : ''}` }, rotulos[e.tipo]));
  const corpo = [meta, h('p', {}, e.tipo === 'jornalista' ? `"${e.texto}"` : e.texto), e.alcance && h('span', { class: 'alcance' }, e.alcance)];

  if (e.tipo === 'boato') {
    corpo.push(s.respostasBoatos[e.id]
      ? h('span', { class: 'etiqueta ok' }, 'Desmentido publicado')
      : h('button', { class: 'botao perigo', onclick: () => ir('boato', e.id) }, 'Responder ao boato'));
  }
  if (e.tipo === 'jornalista') {
    const sit = sim.situacaoJornalista(e, s, agora());
    const textos = { resposta: 'Respondida', sem_comentarios: 'Respondida: "sem comentários"', expirado: 'Prazo encerrado: a matéria saiu sem a sua versão' };
    corpo.push(sit.status === 'pendente'
      ? h('button', { class: 'botao terciario', onclick: () => ir('jornalista', e.id) }, 'Responder')
      : h('span', { class: `etiqueta${sit.status === 'resposta' ? ' ok' : ''}` }, textos[sit.status]));
  }
  return h('article', { class: `post${e.tipo === 'boato' ? ' boato' : ''}` }, corpo);
}

function telaFeed() {
  const { cenario } = app;
  const s = app.sessao;
  const eventos = sim.eventosVisiveis(cenario, s, agora()).slice().reverse();
  const tempoEsgotado = !s.comunicado && sim.podeEncerrarCrise(cenario, s, agora());

  let acoes;
  if (s.comunicado) {
    acoes = h('button', { class: 'botao primario', onclick: () => executar((x) => sim.encerrarCrise(cenario, x, agora()), () => ir('pos_crise')) }, 'Avançar para pós-crise');
  } else {
    acoes = h('div', { class: 'grade-2' },
      h('button', { class: 'botao secundario', onclick: () => ir('decisoes') }, s.decisoes ? 'Revisar resposta' : 'Definir resposta'),
      h('button', { class: 'botao primario', disabled: !s.decisoes, onclick: () => ir('comunicado') }, 'Redigir comunicado'));
  }

  return h('div', { class: 'tela larga' },
    topoSimulacao(),
    bannersJornalistas(),
    s.comunicado && h('div', { class: 'status-faixa', role: 'status' }, icone('ok', 'icone'), `Comunicado publicado em ${textoTempo(s.comunicado.tSim)}`),
    h('main', { class: 'principal' },
      app.aviso && h('div', { class: 'aviso info' }, icone('info', 'icone'),
        h('div', { class: 'corpo' }, h('strong', {}, 'Sobre a sua decisão na pré-crise: '), app.aviso),
        h('button', { class: 'botao-icone', style: 'width:32px;height:32px', 'aria-label': 'Fechar aviso', onclick: () => { app.aviso = null; persistir(); render(); } }, icone('fechar'))),
      tempoEsgotado && h('div', { class: 'aviso alerta', role: 'alert' }, icone('alerta', 'icone'),
        h('div', { class: 'corpo' }, 'O pico da crise passou sem comunicado oficial. Você pode publicar agora ou avançar para a pós-crise.'),
        h('button', { class: 'link', onclick: () => executar((x) => sim.encerrarCrise(cenario, x, agora()), () => ir('pos_crise')) }, 'Avançar')),
      h('div', { class: 'colunas' },
        h('aside', { class: 'coluna-lateral' },
          s.comunicado ? comparacaoClima() : h('div', { class: 'cartao' }, climaAtual()),
          s.comunicado && h('section', { class: 'bloco' },
            h('h2', {}, 'O que estão dizendo'),
            app.ocupado === 'reacoes'
              ? telaCarregando('Gerando reações do público…')
              : (s.reacoes?.posts || []).map((p) => h('article', { class: 'post' },
                h('div', { class: 'meta' }, h('span', {}, h('strong', {}, p.autor), ` · ${p.perfil}`), h('span', { class: 'etiqueta' }, 'Reação')),
                h('p', {}, p.texto))))),
        h('section', { class: 'bloco coluna-feed', 'aria-live': 'polite' },
          h('h2', {}, 'Feed simulado'),
          eventos.length ? eventos.map(cartaoEvento) : h('p', { class: 'vazio' }, 'Nada por enquanto.')))),
    caixaErro(),
    rodape(acoes));
}

function telaJornalista() {
  const { cenario } = app;
  const s = app.sessao;
  const e = cenario.eventos.find((x) => x.id === app.param);
  const sit = sim.situacaoJornalista(e, s, agora());
  const chave = `jor:${e.id}`;
  const pendente = sit.status === 'pendente';
  const total = sim.prazoJornalista(e, s) - e.t;

  return h('div', { class: 'tela' },
    topoSecundario('Pergunta de jornalista', 'feed'),
    h('section', { class: `prazo${pendente ? '' : ' encerrado'}`, 'aria-label': 'Prazo' },
      h('div', { class: 'linha-entre' },
        h('strong', { style: 'font-size:13px' }, pendente ? 'Prazo para responder' : 'Situação'),
        h('span', { class: 'valor', 'data-prazo': e.id }, pendente ? sim.formatarTempo(sit.restante) : '—')),
      pendente && h('div', { class: 'trilho' }, h('span', { 'data-barra-prazo': e.id, style: `width:${Math.round((sit.restante / total) * 100)}%` })),
      h('span', { style: 'font-size:12px' }, pendente
        ? 'Se o prazo acabar, a matéria sai com "a empresa não respondeu".'
        : { resposta: 'Resposta enviada.', sem_comentarios: 'Você respondeu "sem comentários".', expirado: 'O prazo acabou. A matéria saiu sem a versão da empresa.' }[sit.status])),
    h('main', { class: 'principal' },
      h('article', { class: 'cartao' },
        h('div', { class: 'pessoa' },
          h('span', { class: 'avatar', 'aria-hidden': 'true' }, iniciais(e.autor)),
          h('div', { class: 'identificacao' }, h('strong', {}, e.autor), h('span', {}, e.perfil))),
        h('p', { class: 'citacao' }, `"${e.texto}"`)),
      fatosConfirmados(),
      pendente
        ? campoTexto({ id: 'resposta', rotulo: 'Sua resposta', chave, limite: LIMITE_RESPOSTA, placeholder: 'Escreva a resposta que será enviada ao jornalista…' })
        : s.respostasJornalistas[e.id]?.texto && h('div', { class: 'cartao' }, h('span', { class: 'sobretitulo' }, 'Sua resposta'), h('p', {}, s.respostasJornalistas[e.id].texto))),
    caixaErro(),
    pendente
      ? rodape(
        h('button', { class: 'botao primario', onclick: () => executar((x) => sim.responderJornalista(cenario, x, e.id, { tipo: 'resposta', texto: rascunho(chave) }, agora()), () => ir('feed')) }, 'Enviar resposta'),
        h('div', { class: 'grade-2' },
          h('button', { class: 'botao terciario', disabled: Boolean(s.prorrogacoes[e.id]), onclick: () => executar((x) => sim.responderJornalista(cenario, x, e.id, { tipo: 'mais_prazo' }, agora())) }, 'Pedir mais prazo'),
          h('button', { class: 'botao terciario', onclick: () => executar((x) => sim.responderJornalista(cenario, x, e.id, { tipo: 'sem_comentarios' }, agora()), () => ir('feed')) }, '"Sem comentários"')))
      : rodape(h('button', { class: 'botao secundario', onclick: () => ir('feed') }, 'Voltar ao feed')));
}

function telaDecisoes() {
  const s = app.sessao;
  const escolha = app.rascunhos.decisoes || (s.decisoes ? { ...s.decisoes } : {});
  const marcar = (campo, valor) => {
    app.rascunhos.decisoes = { ...escolha, [campo]: valor };
    persistir();
    render();
  };
  const radio = (campo, valor) => h('input', { type: 'radio', name: campo, value: valor, checked: escolha[campo] === valor, onchange: () => marcar(campo, valor) });
  const completo = escolha.estrategia && escolha.portaVoz && escolha.distribuicao;

  return h('div', { class: 'tela' },
    topoSecundario('Definir resposta', 'feed'),
    h('main', { class: 'principal' },
      h('fieldset', {},
        h('legend', {}, '1. Estratégia de resposta'),
        app.config.dicas && h('p', { class: 'ajuda' }, 'Dica: na SCCT, a estratégia depende da responsabilidade que o público atribui à empresa.'),
        h('div', { class: 'grade-opcoes' },
          Object.entries(ESTRATEGIAS).map(([id, e]) => h('label', { class: 'opcao' },
            h('span', { class: 'rotulo' }, radio('estrategia', id), e.nome),
            h('span', { class: 'descricao' }, e.descricao))))),
      h('fieldset', {},
        h('legend', {}, '2. Porta-voz'),
        h('div', { class: 'grade-opcoes tres' },
          Object.entries(PORTA_VOZES).map(([id, p]) => h('label', { class: 'opcao' }, radio('portaVoz', id), p.nome)))),
      h('fieldset', {},
        h('legend', {}, '3. Distribuição'),
        Object.entries(DISTRIBUICOES).map(([id, d]) => h('label', { class: 'opcao' },
          radio('distribuicao', id),
          h('span', {}, h('strong', {}, d.nome), h('span', { class: 'descricao' }, d.descricao)))))),
    caixaErro(),
    rodape(h('button', {
      class: 'botao primario',
      disabled: !completo,
      onclick: () => executar((x) => sim.definirDecisoes(x, escolha, agora()), () => { delete app.rascunhos.decisoes; ir('comunicado'); })
    }, 'Confirmar e redigir comunicado')));
}

function telaComunicado() {
  const { cenario } = app;
  const s = app.sessao;
  const d = s.decisoes;
  return h('div', { class: 'tela' },
    topoSecundario('Comunicado oficial', 'feed'),
    h('main', { class: 'principal' },
      h('div', { class: 'chips', 'aria-label': 'Suas decisões' },
        h('span', { class: 'chip' }, ESTRATEGIAS[d.estrategia].nome),
        h('span', { class: 'chip' }, `Porta-voz: ${PORTA_VOZES[d.portaVoz].nome}`),
        h('span', { class: 'chip' }, d.distribuicao === 'organico' ? 'Post orgânico' : 'Post patrocinado'),
        h('button', { class: 'link', onclick: () => ir('decisoes') }, 'Alterar')),
      fatosConfirmados(),
      h('div', { class: 'campo' },
        h('label', { for: 'titulo' }, 'Título'),
        h('input', { id: 'titulo', type: 'text', maxlength: '120', value: rascunho('titulo'), oninput: (e) => guardarRascunho('titulo', e.target.value) })),
      campoTexto({ id: 'texto', rotulo: 'Texto do comunicado', chave: 'comunicado', limite: LIMITE_COMUNICADO, placeholder: `Comunicado assinado por: ${PORTA_VOZES[d.portaVoz].nome}` }),
      app.config.dicas && h('details', {},
        h('summary', {}, 'Dicas (modo iniciante)'),
        h('ul', {},
          h('li', {}, 'Explique o risco e diga ao público o que fazer (EPPM).'),
          h('li', {}, 'Assuma a responsabilidade compatível com o tipo de crise (SCCT).'),
          h('li', {}, 'Escreva com voz humana, sem tom de texto automático.')))),
    caixaErro(),
    rodape(
      h('button', {
        class: 'botao primario',
        onclick: () => executar(
          (x) => sim.publicarComunicado(cenario, x, { titulo: rascunho('titulo'), texto: rascunho('comunicado') }, agora()),
          () => { ir('feed'); gerarReacoes(); })
      }, 'Publicar comunicado'),
      h('span', { class: 'texto-mudo', style: 'text-align:center' }, 'Depois de publicado, o comunicado não pode ser editado.')));
}

function telaBoato() {
  const { cenario } = app;
  const e = cenario.eventos.find((x) => x.id === app.param);
  const chave = `boato:${e.id}`;
  return h('div', { class: 'tela' },
    topoSecundario('Responder ao boato', 'feed'),
    h('main', { class: 'principal' },
      h('article', { class: 'post boato' },
        h('div', { class: 'meta' }, h('span', {}, h('strong', {}, e.autor), ` · ${e.perfil}`), h('span', { class: 'etiqueta alerta' }, 'Boato')),
        h('p', {}, e.texto),
        e.alcance && h('span', { class: 'alcance' }, e.alcance)),
      fatosConfirmados(),
      campoTexto({ id: 'desmentido', rotulo: 'Desmentido oficial', chave, limite: LIMITE_RESPOSTA, classe: 'curto', placeholder: 'Escreva o post de desmentido…' }),
      app.config.dicas && h('p', { class: 'ajuda' }, 'Dica: diga que o conteúdo é falso, explique por quê e aponte uma fonte verificável.')),
    caixaErro(),
    rodape(h('button', { class: 'botao primario', onclick: () => executar((x) => sim.responderBoato(cenario, x, e.id, rascunho(chave), agora()), () => ir('feed')) }, 'Publicar desmentido')));
}

function telaPosCrise() {
  const itens = linhaDoTempo(app.cenario, app.sessao);
  return h('div', { class: 'tela' },
    topoSimulacao(),
    h('main', { class: 'principal' },
      h('section', { class: 'bloco' },
        h('h2', {}, 'Sua linha do tempo'),
        h('ol', { class: 'cartao linha-tempo' },
          itens.map((i) => h('li', { class: i.alerta ? 'alerta' : '' },
            h('span', { class: 't' }, i.tSim == null ? '—' : textoTempo(i.tSim)),
            h('span', {}, i.texto))))),
      campoTexto({ id: 'diferente', rotulo: 'O que você faria diferente?', chave: 'diferente', limite: 1000, classe: 'curto' }),
      campoTexto({ id: 'recuperacao', rotulo: 'Que ações de recuperação a empresa deve tomar nos próximos 30 dias?', chave: 'recuperacao', limite: 1000, classe: 'curto' })),
    caixaErro(),
    rodape(h('button', {
      class: 'botao primario',
      onclick: () => executar((x) => sim.enviarReflexao(x, { diferente: rascunho('diferente'), recuperacao: rascunho('recuperacao') }), () => { ir('debrief'); gerarAvaliacao(); })
    }, 'Gerar avaliação')));
}

function telaDebrief() {
  const a = app.sessao.avaliacao;
  if (!a) {
    return h('div', { class: 'tela' }, topoSimulacao(), h('main', { class: 'principal' },
      app.ocupado === 'avaliacao'
        ? telaCarregando('Avaliando a sua resposta…')
        : h('button', { class: 'botao primario', onclick: gerarAvaliacao }, 'Gerar avaliação')));
  }
  const faixa = (n) => (n >= 4 ? 'bom' : n === 3 ? 'medio' : 'fraco');
  return h('div', { class: 'tela' },
    topoSimulacao(),
    h('main', { class: 'principal' },
      h('section', { class: 'resumo-nota' },
        h('div', { class: 'bloco', style: 'gap:4px' },
          h('span', { class: 'sobretitulo' }, 'Desempenho geral'),
          h('span', {}, a.sintese)),
        h('span', { class: 'nota' }, String(a.media).replace('.', ','), h('small', {}, '/5'))),
      app.erroIA && !a.geradaComIA && h('div', { class: 'aviso alerta' }, icone('alerta', 'icone'),
        h('div', { class: 'corpo' }, `A IA não respondeu (${app.erroIA}). Os textos foram avaliados por heurísticas.`)),
      h('h2', {}, 'Avaliação por critério'),
      h('div', { class: 'bloco' },
        a.criterios.map((c) => h('article', { class: 'criterio' },
          h('div', { class: 'linha-entre', style: 'align-items:flex-start' },
            h('span', { class: 'nome' }, c.nome),
            h('span', { class: 'nota' }, `${c.nota}/5`)),
          h('div', { class: `segmentos ${faixa(c.nota)}`, 'aria-hidden': 'true' },
            [1, 2, 3, 4, 5].map((i) => h('span', { class: i <= c.nota ? 'cheio' : '' }))),
          h('p', { class: 'texto-2' }, c.justificativa),
          h('div', { class: 'chips' }, h('span', { class: 'etiqueta' }, c.tipo), h('span', { class: 'fonte' }, c.fonte))))),
      h('div', { class: 'aviso info', role: 'note' }, icone('info', 'icone'),
        h('div', { class: 'corpo' }, 'Esta avaliação apoia o professor, que mantém a decisão final sobre a nota.'))),
    rodape(
      h('button', { class: 'botao primario', onclick: abrirImpressao }, 'Abrir relatório para imprimir (PDF)'),
      h('div', { class: 'grade-2' },
        h('button', { class: 'botao terciario', onclick: baixarMarkdown }, 'Baixar Markdown'),
        h('button', { class: 'botao terciario', onclick: descartarSessao }, 'Treinar outro cenário'))));
}

function telaConfig() {
  const c = app.config;
  const form = { ...c, chaves: { ...c.chaves } };
  const statusEl = h('p', { class: 'ajuda', 'data-status-config': '', 'aria-live': 'polite' }, app.statusConfig || '');
  const provedor = PROVEDORES[form.provedor];
  const seletor = h('select', { id: 'modelo', onchange: (e) => { form.modelo = e.target.value; } },
    h('option', { value: '' }, '— escolha após testar a conexão —'),
    app.modelos.map((m) => h('option', { value: m.id }, m.nome)),
    c.modelo && !app.modelos.some((m) => m.id === c.modelo) && h('option', { value: c.modelo }, c.modelo));
  seletor.value = c.modelo || '';

  function trocarProvedor(novo) {
    if (novo === form.provedor) return;
    // cada provedor tem modelos e URL próprios; a chave de cada um fica guardada
    app.config = { ...form, provedor: novo, modelo: '', urlBase: '' };
    app.modelos = [];
    app.statusConfig = '';
    render();
  }

  async function testar() {
    statusEl.textContent = 'Testando…';
    try {
      app.modelos = await listarModelos(form);
      if (!app.modelos.length) throw new Error('Nenhum modelo de texto disponível para esta chave.');
      if (!form.modelo || !app.modelos.some((m) => m.id === form.modelo)) form.modelo = sugerirModelo(form, app.modelos);
      const n = app.modelos.length;
      app.statusConfig = `Conexão ok. ${n} ${n > 1 ? 'modelos disponíveis' : 'modelo disponível'}.`;
      app.config = { ...form };
      render();
    } catch (e) {
      statusEl.textContent = e.message;
    }
  }

  return h('div', { class: 'tela' },
    h('header', { class: 'topo topo-sub' },
      h('button', { class: 'botao-icone', 'aria-label': 'Voltar', onclick: () => { app.statusConfig = ''; ir('inicio'); } }, icone('voltar')),
      h('div', { class: 'identificacao' }, h('strong', {}, 'Configurações'), h('span', {}, 'Salvas apenas neste navegador'))),
    h('main', { class: 'principal' },
      h('div', { class: 'campo' },
        h('label', { for: 'aluno' }, 'Seu nome (aparece no relatório)'),
        h('input', { id: 'aluno', type: 'text', value: c.aluno, oninput: (e) => { form.aluno = e.target.value; } })),
      h('div', { class: 'campo' },
        h('label', { for: 'velocidade' }, 'Velocidade do relógio'),
        h('select', { id: 'velocidade', onchange: (e) => { form.velocidade = Number(e.target.value); } },
          [1, 2, 5, 10].map((v) => h('option', { value: String(v) }, v === 1 ? 'Tempo real (1×)' : `${v}× mais rápido`))),
        h('span', { class: 'ajuda' }, 'Vale para as próximas simulações. Use 5× ou 10× para demonstrações.')),
      h('label', { class: 'interruptor' },
        h('input', { type: 'checkbox', checked: c.dicas, onchange: (e) => { form.dicas = e.target.checked; } }),
        'Mostrar dicas (modo iniciante)'),
      h('h2', {}, 'Inteligência artificial (opcional)'),
      h('p', { class: 'texto-2' }, 'Com IA, as reações do público e a avaliação dos textos ficam mais ricas. Sem IA, o Astecca usa reações prontas e heurísticas.'),
      h('fieldset', {},
        h('legend', {}, 'Provedor'),
        h('div', { class: 'grade-opcoes tres' },
          Object.entries(PROVEDORES).map(([id, p]) => h('label', { class: 'opcao' },
            h('input', { type: 'radio', name: 'provedor', value: id, checked: form.provedor === id, onchange: () => trocarProvedor(id) }),
            p.nome)))),
      h('div', { class: 'campo' },
        h('label', { for: 'chave' }, provedor.rotuloChave),
        h('input', { id: 'chave', type: 'password', autocomplete: 'off', value: form.chaves[form.provedor], oninput: (e) => { form.chaves[form.provedor] = e.target.value.trim(); } }),
        h('span', { class: 'ajuda' }, 'A chave fica guardada só neste navegador. Os textos da simulação são enviados ao provedor escolhido, sem o seu nome.')),
      h('div', { class: 'campo' },
        h('label', { for: 'urlBase' }, 'Servidor intermediário (opcional)'),
        h('input', { id: 'urlBase', type: 'url', placeholder: provedor.urlPadrao, value: form.urlBase, oninput: (e) => { form.urlBase = e.target.value.trim(); } })),
      h('button', { class: 'botao terciario', onclick: testar }, 'Testar conexão e listar modelos'),
      statusEl,
      h('div', { class: 'campo' }, h('label', { for: 'modelo' }, 'Modelo'), seletor)),
    rodape(h('button', {
      class: 'botao primario',
      onclick: async () => {
        app.config = normalizarConfig({ ...CONFIG_PADRAO, ...form });
        app.statusConfig = '';
        await salvar(CHAVE_CONFIG, app.config);
        ir('inicio');
      }
    }, 'Salvar')));
}

// ---------- Renderização e relógio ----------

const TELAS = {
  inicio: telaInicio,
  config: telaConfig,
  pre_crise: telaPreCrise,
  feed: telaFeed,
  jornalista: telaJornalista,
  decisoes: telaDecisoes,
  comunicado: telaComunicado,
  boato: telaBoato,
  pos_crise: telaPosCrise,
  debrief: telaDebrief
};

function render() {
  let tela = TELAS[app.view] || telaInicio;
  // Telas de simulação exigem uma sessão compatível.
  if (app.view !== 'inicio' && app.view !== 'config' && !app.sessao) tela = telaInicio;
  const focado = document.activeElement?.id;
  raiz.replaceChildren(tela());
  if (app.view === 'config') {
    const v = document.getElementById('velocidade');
    if (v) v.value = String(app.config.velocidade || 1);
  }
  if (focado) document.getElementById(focado)?.focus();
  app.assinatura = assinatura();
}

/** Resume o que está visível no feed. Quando muda, a tela de feed é redesenhada. */
function assinatura() {
  if (!app.sessao || app.sessao.fase !== 'crise') return '';
  const t = agora();
  const ev = sim.eventosVisiveis(app.cenario, app.sessao, t);
  const jor = ev.filter((e) => e.tipo === 'jornalista').map((e) => sim.situacaoJornalista(e, app.sessao, t).status);
  return `${ev.map((e) => e.id).join(',')}|${jor.join(',')}|${sim.podeEncerrarCrise(app.cenario, app.sessao, t)}`;
}

function tick() {
  const s = app.sessao;
  if (!s || s.fase !== 'crise') return;
  const t = agora();
  const nova = assinatura();
  if (nova !== app.assinatura) {
    const expirouAqui = app.view === 'jornalista'
      && sim.situacaoJornalista(app.cenario.eventos.find((e) => e.id === app.param), s, t).status !== 'pendente';
    if (app.view === 'feed' || expirouAqui) {
      render();
      return;
    }
    app.assinatura = nova;
  }
  const tSim = sim.tempoSimulado(s, t);
  document.querySelectorAll('[data-relogio]').forEach((el) => { el.textContent = textoTempo(tSim); });
  document.querySelectorAll('[data-prazo]').forEach((el) => {
    const e = app.cenario.eventos.find((x) => x.id === el.dataset.prazo);
    const sit = sim.situacaoJornalista(e, s, t);
    el.textContent = sit.status === 'pendente' ? sim.formatarTempo(sit.restante) : '—';
  });
  document.querySelectorAll('[data-barra-prazo]').forEach((el) => {
    const e = app.cenario.eventos.find((x) => x.id === el.dataset.barraPrazo);
    const sit = sim.situacaoJornalista(e, s, t);
    el.style.width = `${Math.round((sit.restante / (sim.prazoJornalista(e, s) - e.t)) * 100)}%`;
  });
  const clima = sim.calcularSentimento(app.cenario, s, t);
  document.querySelectorAll('[data-clima-barra]').forEach((el) => { el.style.width = `${clima}%`; });
  document.querySelectorAll('[data-clima-texto]').forEach((el) => { el.textContent = `${clima}% negativo`; });
  document.querySelectorAll('[data-clima-barra-texto]').forEach((el) => { el.textContent = `${clima}%`; });
  document.querySelectorAll('[data-novidades]').forEach((el) => { el.textContent = textoNovidades(); });
}

async function iniciar() {
  raiz.replaceChildren(telaCarregando('Carregando…'));
  try {
    app.catalogo = await carregarCatalogo();
  } catch (e) {
    raiz.replaceChildren(h('div', { class: 'aviso alerta', role: 'alert', style: 'margin:20px' }, e.message));
    return;
  }
  app.config = normalizarConfig({ ...CONFIG_PADRAO, ...(await carregar(CHAVE_CONFIG)) });
  const salvo = await carregar(CHAVE_SESSAO);
  if (salvo?.sessao) {
    const cenario = app.catalogo.find((c) => c.id === salvo.sessao.cenarioId);
    if (cenario) {
      app.cenario = cenario;
      app.sessao = salvo.sessao;
      app.rascunhos = salvo.rascunhos || {};
      app.aviso = salvo.aviso || null;
      app.view = salvo.view || telaDaFase();
      app.param = salvo.param || null;
      app.selecionado = cenario.id;
      if (app.sessao.fase === 'debrief' && !app.sessao.avaliacao) gerarAvaliacao();
      if (app.sessao.comunicado && !app.sessao.reacoes) gerarReacoes();
    }
  }
  render();
  setInterval(tick, 500);
}

iniciar();
