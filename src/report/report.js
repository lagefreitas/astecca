// Geração do relatório (debrief) em Markdown, para o aluno entregar ao professor.

import { CLUSTERS, ESTRATEGIAS, PORTA_VOZES, DISTRIBUICOES } from '../engine/constants.js';
import { formatarTempo } from '../engine/simulation.js';

export function gerarMarkdown(cenario, estado, { aluno = '' } = {}) {
  const a = estado.avaliacao;
  const d = estado.decisoes;
  const data = new Date(estado.criadaEm || Date.now()).toLocaleString('pt-BR');
  const linhas = [];
  linhas.push(`# Relatório de simulação — ${cenario.titulo}`);
  linhas.push('');
  if (aluno) linhas.push(`**Aluno(a):** ${aluno}  `);
  linhas.push(`**Data:** ${data}  `);
  linhas.push(`**Empresa:** ${cenario.empresa.nome} · **Grupo SCCT:** ${CLUSTERS[cenario.cluster_scct].nome}  `);
  linhas.push(`**Nota geral:** ${String(a.media).replace('.', ',')}/5`);
  linhas.push('');
  linhas.push(`> ${a.sintese}`);
  linhas.push('');
  linhas.push('## Decisões');
  linhas.push('');
  if (d) {
    linhas.push(`- Estratégia: ${ESTRATEGIAS[d.estrategia].nome}`);
    linhas.push(`- Porta-voz: ${PORTA_VOZES[d.portaVoz].nome}`);
    linhas.push(`- Distribuição: ${DISTRIBUICOES[d.distribuicao].nome}`);
  } else {
    linhas.push('- O aluno não definiu a resposta.');
  }
  linhas.push('');
  linhas.push('## Linha do tempo');
  linhas.push('');
  for (const item of a.linhaDoTempo) {
    const t = item.tSim == null ? '—' : `T+${formatarTempo(item.tSim)}`;
    linhas.push(`- ${t} · ${item.texto}`);
  }
  linhas.push('');
  linhas.push('## Avaliação por critério');
  linhas.push('');
  linhas.push('| Critério | Nota | Origem | Justificativa | Fonte |');
  linhas.push('|---|---|---|---|---|');
  for (const c of a.criterios) {
    linhas.push(`| ${c.nome} | ${c.nota}/5 | ${c.tipo} | ${c.justificativa.replace(/\|/g, '/')} | ${c.fonte} |`);
  }
  linhas.push('');
  linhas.push('## Comunicado oficial');
  linhas.push('');
  if (estado.comunicado) {
    linhas.push(`**${estado.comunicado.titulo || '(sem título)'}**`);
    linhas.push('');
    linhas.push(estado.comunicado.texto);
  } else {
    linhas.push('_Não publicado._');
  }
  const respostas = Object.entries(estado.respostasJornalistas);
  if (respostas.length) {
    linhas.push('');
    linhas.push('## Respostas à imprensa');
    for (const [id, r] of respostas) {
      const ev = cenario.eventos.find((e) => e.id === id);
      linhas.push('');
      linhas.push(`**${ev.autor}** (${ev.perfil}): "${ev.texto}"`);
      linhas.push('');
      linhas.push(r.tipo === 'sem_comentarios' ? '_Sem comentários._' : r.texto);
    }
  }
  const boatos = Object.entries(estado.respostasBoatos);
  if (boatos.length) {
    linhas.push('');
    linhas.push('## Respostas a boatos');
    for (const [id, r] of boatos) {
      const ev = cenario.eventos.find((e) => e.id === id);
      linhas.push('');
      linhas.push(`**Boato de ${ev.autor}:** "${ev.texto}"`);
      linhas.push('');
      linhas.push(r.texto);
    }
  }
  if (estado.reflexao) {
    linhas.push('');
    linhas.push('## Reflexão pós-crise');
    linhas.push('');
    linhas.push(`**O que faria diferente:** ${estado.reflexao.diferente || '_Sem resposta._'}`);
    linhas.push('');
    linhas.push(`**Ações de recuperação para os próximos 30 dias:** ${estado.reflexao.recuperacao || '_Sem resposta._'}`);
  }
  linhas.push('');
  linhas.push('---');
  linhas.push('');
  linhas.push(`_Avaliação de apoio gerada pelo Astecca${a.geradaComIA ? ' com IA' : ' sem IA (heurísticas)'}. A nota final é do professor._`);
  return linhas.join('\n');
}
