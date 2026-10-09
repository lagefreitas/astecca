// Avaliação simplificada de textos, usada quando não há IA configurada
// ou quando a chamada à IA falha. Procura marcas textuais ligadas a cada critério.
// É uma aproximação: o relatório deixa claro quando a nota veio daqui.

export function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function contar(texto, termos) {
  const t = normalizar(texto);
  return termos.filter((termo) => t.includes(termo)).length;
}

const limitar = (n) => Math.min(5, Math.max(1, Math.round(n)));

const DESCULPAS = ['desculp', 'erramos', 'lamentamos', 'reconhecemos', 'assumimos', 'nossa responsabilidade', 'falhamos', 'nosso erro'];
const COMPROMISSO = ['vamos', 'suspendemos', 'iremos', 'compromisso', 'a partir de hoje', 'ja corrigimos', 'estamos trabalhando', 'garantimos'];
const CULPA_ALHEIA = ['culpa do', 'culpa da', 'responsabilidade do parceiro', 'responsabilidade do fornecedor', 'nao temos responsabilidade', 'nao houve qualquer', 'nao ha qualquer', 'isento'];
const EVIDENCIAS = ['laudo', 'pericia', 'prova', 'analise', 'vigilancia', 'documento', 'auditoria', 'checagem'];

const EMPATIA = ['entendemos', 'sabemos', 'imaginamos', 'preocupa', 'sentimos', 'compreendemos', 'lamentamos', 'pedimos desculpas', 'sua confianca', 'confianca de voces'];
const SEGUNDA_PESSOA = [' voce', ' voces', ' seu ', ' sua ', ' seus ', ' suas '];
const JARGAO = ['informamos que', 'prezados', 'eventuais transtornos', 'vimos por meio', 'a empresa esclarece', 'nota oficial', 'em virtude de', 'outrossim'];

const AMEACA = ['risco', 'afetad', 'dados', 'seguranca', 'exposto', 'impacto', 'contaminad', 'saldo', 'multa', 'perigo', 'prejuizo'];
const EFICACIA = ['acesse', 'clique', 'configuracoes', 'passo', 'apague', 'apagar', 'consulte', 'confira', 'pelo app', 'no app', 'no site', 'canal', 'telefone', '0800', 'reembolso', 'solicite', 'verifique', 'basta'];

const DESMENTIDO = ['falso', 'nao e verdade', 'nao e verdadeiro', 'gerado por ia', 'inteligencia artificial', 'manipulad', 'montagem', 'sintetic', 'fake', 'desinformacao', 'boato'];
const FONTE_OFICIAL = ['laudo', 'pericia', 'canais oficiais', 'site oficial', 'checagem', 'perfil oficial', 'nosso site'];

export function notaSinceridade(texto, cluster) {
  if (!texto) return { nota: 1, justificativa: 'Não há comunicado para avaliar.' };
  const culpa = contar(texto, CULPA_ALHEIA) > 0;
  const compromisso = contar(texto, COMPROMISSO) > 0;
  if (cluster === 'vitima') {
    const provas = contar(texto, EVIDENCIAS) > 0;
    const nota = limitar(2 + (provas ? 2 : 0) + (compromisso ? 1 : 0) - (culpa ? 1 : 0));
    const just = provas
      ? 'O texto apresenta evidências, o que dá credibilidade à empresa como vítima.'
      : 'Em crises de vítima, a credibilidade vem das provas. O texto não cita nenhuma.';
    return { nota, justificativa: just };
  }
  const desculpas = contar(texto, DESCULPAS) > 0;
  const nota = limitar(2 + (desculpas ? 2 : 0) + (compromisso ? 1 : 0) - (culpa ? 2 : 0));
  let just;
  if (culpa) just = 'O texto transfere a culpa para terceiros, o que reduz a credibilidade da fonte.';
  else if (desculpas && compromisso) just = 'O texto assume a responsabilidade e indica o que será feito.';
  else if (desculpas) just = 'O texto assume a responsabilidade, mas não diz o que a empresa vai fazer.';
  else just = 'O texto não assume a responsabilidade de forma clara.';
  return { nota, justificativa: just };
}

export function notaEmpatia(texto) {
  if (!texto) return { nota: 1, justificativa: 'Não há comunicado para avaliar.' };
  const empatia = contar(texto, EMPATIA);
  const segunda = contar(` ${texto} `, SEGUNDA_PESSOA) > 0;
  const jargao = contar(texto, JARGAO);
  const nota = limitar(2 + Math.min(2, empatia) + (segunda ? 1 : 0) - jargao);
  let just;
  if (jargao > 0) just = 'Expressões burocráticas fazem o texto soar automático e distante.';
  else if (empatia > 0 && segunda) just = 'O texto fala diretamente com o público e reconhece o que ele sente.';
  else if (segunda) just = 'O texto fala com o público, mas reconhece pouco a preocupação das pessoas.';
  else just = 'O texto fala da empresa, mas pouco com as pessoas afetadas.';
  return { nota, justificativa: just };
}

export function notaEppm(texto) {
  if (!texto) return { nota: 1, justificativa: 'Não há comunicado para avaliar.' };
  const ameaca = contar(texto, AMEACA) > 0;
  const eficacia = contar(texto, EFICACIA);
  const nota = limitar(1 + (ameaca ? 2 : 0) + (eficacia >= 2 ? 2 : eficacia === 1 ? 1 : 0));
  let just;
  if (ameaca && eficacia >= 2) just = 'O texto explica o risco e diz ao público o que fazer.';
  else if (ameaca) just = 'O texto explica o risco, mas não diz com clareza o que o público deve fazer.';
  else if (eficacia > 0) just = 'O texto diz o que fazer, mas não explica o risco para o público.';
  else just = 'O texto não explica o risco nem orienta o público.';
  return { nota, justificativa: just };
}

/** boatos: eventos de boato que o aluno viu; respostas: respostas dadas a eles. */
export function notaDesinformacao(boatos, respostas, textoComunicado) {
  if (!boatos.length) return null;
  const respondidos = boatos.filter((b) => respostas[b.id]);
  const comunicadoDesmente = contar(textoComunicado, DESMENTIDO) > 0;
  if (respondidos.length === 0) {
    if (comunicadoDesmente) {
      return { nota: 2, justificativa: 'O comunicado menciona o boato, mas ele não recebeu um desmentido próprio.' };
    }
    return { nota: 1, justificativa: 'O boato circulou sem desmentido oficial.' };
  }
  const textos = respondidos.map((b) => respostas[b.id].texto).join(' ');
  const desmente = contar(textos, DESMENTIDO) > 0;
  const fonte = contar(textos, FONTE_OFICIAL) > 0;
  let nota = 3 + (desmente ? 1 : 0) + (fonte ? 1 : 0);
  if (respondidos.length < boatos.length) nota -= 1;
  nota = limitar(nota);
  let just;
  if (desmente && fonte) just = 'O desmentido diz que o conteúdo é falso e aponta uma fonte confiável.';
  else if (desmente) just = 'O desmentido diz que o conteúdo é falso, mas não aponta provas ou fonte oficial.';
  else just = 'O boato foi respondido, mas sem afirmar com clareza que é falso.';
  if (respondidos.length < boatos.length) just += ' Além disso, parte dos boatos ficou sem resposta.';
  return { nota, justificativa: just };
}

// Expressões típicas de quem tenta dar ordens à IA avaliadora dentro do texto (prompt injection).
// Um comunicado de crise real não tem motivo para conter essas expressões.
const MANIPULACAO = [
  'ignore as instrucoes', 'ignore todas', 'ignore as regras', 'ignore o que', 'ignore previous', 'ignore all',
  'desconsidere as', 'desconsidere todas', 'esqueca as instrucoes', 'instrucoes anteriores', 'novas instrucoes',
  'prompt do sistema', 'system prompt', 'voce e um avaliador', 'voce e uma ia', 'caro avaliador', 'ao avaliador',
  'ia avaliadora', 'modelo de linguagem', 'nota 5', 'nota cinco', 'nota maxima', 'nota 10', 'nota dez', '5/5',
  'atribua nota', 'responda apenas', 'responda somente', '"nota"', '{"', '</'
];

/** Indica se o texto do aluno parece conter instruções dirigidas à IA. */
export function detectarManipulacao(texto) {
  const t = normalizar(texto);
  return MANIPULACAO.some((termo) => t.includes(termo));
}
