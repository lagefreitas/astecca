// Opções de decisão do aluno, com base na SCCT (Coombs) e nos artigos selecionados.

export const FASES = ['pre_crise', 'crise', 'pos_crise', 'debrief'];

export const NOMES_FASES = {
  pre_crise: 'Pré-crise',
  crise: 'Crise',
  pos_crise: 'Pós-crise',
  debrief: 'Debrief'
};

export const CLUSTERS = {
  vitima: { nome: 'Vítima', descricao: 'A empresa também é vítima. A responsabilidade atribuída é baixa.' },
  acidental: { nome: 'Acidental', descricao: 'A empresa não quis causar o dano. A responsabilidade atribuída é moderada.' },
  evitavel: { nome: 'Evitável', descricao: 'A empresa poderia ter evitado a crise. A responsabilidade atribuída é alta.' }
};

export const ESTRATEGIAS = {
  negar: { nome: 'Negar', descricao: 'Afirmar que não há crise ou culpa' },
  diminuir: { nome: 'Diminuir', descricao: 'Reduzir a gravidade ou a responsabilidade' },
  reconstruir: { nome: 'Reconstruir', descricao: 'Pedir desculpas e reparar o dano' },
  reforcar: { nome: 'Reforçar', descricao: 'Lembrar boas ações da empresa' }
};

export const PORTA_VOZES = {
  ceo: { nome: 'CEO' },
  rp: { nome: 'Gerente de RP' },
  influenciador: { nome: 'Influenciador virtual' }
};

export const DISTRIBUICOES = {
  organico: { nome: 'Post orgânico nos canais oficiais', descricao: 'Site, perfis da marca e imprensa' },
  patrocinado: { nome: 'Post patrocinado e segmentado', descricao: 'Impulsionado para usuários afetados' }
};

// Prorrogação concedida quando o aluno pede mais prazo ao jornalista (uma vez por pergunta).
export const PRORROGACAO_S = 120;
