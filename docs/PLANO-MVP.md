# Plano de implementação do MVP — Astecca

Extensão do Chrome para o ensino prático de Comunicação de Crise em Relações Públicas.

> Base teórica do MVP: `docs/resumo-3-artigos-selecionados.md` (Cheng et al., 2025; Olbermann e Nagl, 2025; Brown-Devlin, Lim e Tao, 2022), além da SCCT, do EPPM e da Teoria do Comportamento Planejado citados na introdução do TCC.

---

## 1. Objetivo do MVP

O MVP deve permitir que um aluno de RP viva uma crise simulada do início ao fim. Por exemplo, ele recebe a notícia da crise, acompanha a repercussão nas redes, responde a jornalistas sob pressão de tempo e redige o comunicado oficial. Em seguida, a ferramenta devolve um feedback fundamentado na teoria. Dessa forma, o aluno treina decisões e erra num ambiente seguro antes de enfrentar uma crise real.

O MVP valida uma hipótese: a simulação com feedback teórico ajuda o aluno a aplicar, na prática, o que ele estudou em sala.

## 2. Por que uma extensão do Chrome

- O aluno abre a simulação numa aba inteira do Chrome com um clique no ícone da extensão. *(Revisão: a versão inicial usava o painel lateral; a aba inteira dá mais espaço para ler o feed e redigir o comunicado.)*
- A extensão pode ler a página aberta. Por exemplo, o aluno seleciona uma notícia real e a ferramenta transforma o caso num cenário de treino. Isso atende à recomendação de Cheng et al. (2025) de analisar casos reais.
- A distribuição é simples, pela Chrome Web Store, e não exige servidor próprio no MVP.

## 3. Escopo funcional

### 3.1 Dentro do MVP

| # | Funcionalidade | Fundamento |
|---|---|---|
| F1 | Biblioteca de cenários de crise, com um cenário por grupo da SCCT (vítima, acidental e evitável) | SCCT |
| F2 | Simulação em três fases: pré-crise, crise e pós-crise | Lacuna de ciclo de vida (Cheng et al., 2025) |
| F3 | Relógio simulado com eventos que chegam ao longo do tempo: posts, boatos e perguntas de jornalistas | Rapidez da resposta (Nuortimo et al., 2026) |
| F4 | Escolha da estratégia de resposta: negar, diminuir, reconstruir ou reforçar | SCCT |
| F5 | Redação do comunicado oficial e respostas a jornalistas com tempo limite | Prática de redação sob pressão |
| F6 | Escolha do porta-voz: CEO, profissional de RP ou influenciador virtual | Olbermann e Nagl (2025) |
| F7 | Escolha da forma de distribuição: post orgânico ou post patrocinado/segmentado | Brown-Devlin et al. (2022) |
| F8 | Reação simulada do público a cada decisão do aluno | Feedback imediato |
| F9 | Avaliação por rubrica com justificativa teórica | SCCT, EPPM, artigos selecionados |
| F10 | Relatório final (*debrief*) exportável em PDF ou Markdown para o professor | Fase pós-crise e aprendizado; supervisão humana |

### 3.2 Fora do MVP (versões futuras)

- Painel do professor com turmas e notas.
- Modo multijogador, com alunos em papéis diferentes na mesma crise.
- Criação de cenários pelo professor dentro da extensão.
- Suporte a outros idiomas (lacuna apontada por Bukar et al., 2022).
- Geração de cenário a partir de notícia real (F11). Se sobrar tempo, entra no MVP como funcionalidade experimental.

## 4. Fluxo do aluno

1. O aluno clica no ícone do Astecca, que abre numa aba inteira, e escolhe um cenário.
2. **Pré-crise.** Ele recebe sinais fracos, como reclamações isoladas. Em seguida, decide se age preventivamente.
3. **Crise.** O relógio acelera. Já nessa fase, chegam posts, boatos gerados por IA e perguntas de jornalistas. O aluno escolhe a estratégia, o porta-voz e a forma de distribuição. Além disso, redige o comunicado e responde aos jornalistas dentro do prazo.
4. A cada decisão, o público simulado reage. Por exemplo, uma negação em crise evitável aumenta a indignação, enquanto um pedido de desculpas sincero melhora a credibilidade.
5. **Pós-crise.** O aluno escreve uma breve reflexão sobre o que faria diferente.
6. A ferramenta gera o *debrief* com nota por critério, justificativa e referências.

## 5. Rubrica de avaliação

A rubrica combina regras fixas e avaliação por modelo de linguagem (LLM). As regras fixas garantem consistência, enquanto o LLM avalia a qualidade do texto.

| Critério | Como é avaliado | Fonte |
|---|---|---|
| Adequação da estratégia ao tipo de crise | Regra fixa (tabela SCCT) | SCCT |
| Tempo de resposta | Regra fixa (relógio simulado) | Nuortimo et al. (2026) |
| Sinceridade e assunção de responsabilidade | LLM | Brown-Devlin et al. (2022) |
| Empatia e tom humano, sem soar automatizado | LLM | Olbermann e Nagl (2025); JCCM (2025) |
| Ameaça + eficácia: a mensagem explica o risco e diz ao público o que fazer | LLM | EPPM |
| Escolha do porta-voz | Regra fixa + justificativa do LLM | Olbermann e Nagl (2025) |
| Forma de distribuição (evitar segmentação ostensiva) | Regra fixa | Brown-Devlin et al. (2022) |
| Combate à desinformação | LLM | Karinshak e Jin |

O feedback sempre cita a teoria que sustenta o comentário. Além disso, o relatório deixa claro que a avaliação é um apoio ao professor, que mantém a decisão final (*human-in-the-loop*, Cheng et al., 2025).

## 6. Arquitetura técnica

### 6.1 Stack adotada

- **Manifest V3**, exigido pela Chrome Web Store.
- **JavaScript puro com módulos ES**, sem etapa de build. Dessa forma, a Ana Caroliny e outros colaboradores carregam a extensão direto da pasta, sem instalar Node ou dependências. *(Revisão: o plano original previa WXT + React + TypeScript. A troca reduz a complexidade do MVP e pode ser revista se a interface crescer.)*
- **chrome.storage.local** para progresso e configurações. Os dados do aluno ficam no próprio navegador.
- **IA opcional, com três provedores:** Claude (Anthropic), GPT (OpenAI) e Gemini (Google). A IA gera reações do público e avalia textos. Sem IA, o MVP usa reações prontas e heurísticas.
- **node:test** para os testes automatizados, sem dependências externas.

### 6.2 Componentes

```
astecca/
├── manifest.json
├── docs/                      # TCC, plano e base teórica
├── icons/
├── src/
│   ├── background.js          # abre o Astecca numa aba
│   ├── app/                   # interface da simulação
│   ├── engine/                # motor da simulação (funções puras) e catálogo
│   ├── scenarios/             # cenários em JSON
│   ├── evaluation/            # regras fixas + heurísticas da rubrica
│   ├── llm/                   # cliente da API e prompts
│   ├── report/                # relatório em Markdown e página para PDF
│   └── lib/                   # utilitários de DOM e armazenamento
└── tests/
```

### 6.3 Motor da simulação

O motor tem as fases `pre_crise → crise → pos_crise → debrief`. Cada cenário define uma linha do tempo de eventos (*injects*) com o segundo simulado em que aparecem. Por exemplo, "segundo 60: jornalista do Portal Conecta pede posicionamento em 5 minutos". Além disso, o motor registra cada decisão do aluno com o horário, o que alimenta a rubrica.

O tempo simulado é calculado a partir do horário real em que a crise começou e da velocidade escolhida (1×, 2×, 5× ou 10×). Por isso, o relógio continua correto mesmo que o aluno feche e reabra a aba, sem depender do *service worker*.

### 6.4 Formato do cenário

```json
{
  "id": "vazamento-dados-smartwatch",
  "titulo": "Vazamento de dados de relógio fitness",
  "cluster_scct": "evitavel",
  "empresa": { "nome": "Pulso Tech", "setor": "wearables" },
  "estrategias_adequadas": ["reconstruir"],
  "eventos": [
    { "t": 0,   "fase": "pre_crise", "tipo": "post",       "texto": "..." },
    { "t": 180, "fase": "crise",     "tipo": "jornalista", "texto": "...", "prazo_s": 300 },
    { "t": 240, "fase": "crise",     "tipo": "boato_ia",   "texto": "..." }
  ]
}
```

O cenário inicial adapta o caso do relógio fitness de Olbermann e Nagl (2025). Os outros dois cobrem os grupos vítima e acidental da SCCT.

### 6.5 Uso do LLM

- **Reação do público:** recebe o cenário, a decisão do aluno e o estado atual. Em seguida, devolve posts simulados e um índice de sentimento.
- **Avaliador:** recebe o texto do aluno e a rubrica. Depois, devolve JSON com nota de 1 a 5 por critério e justificativa.
- Os prompts ficam em arquivos separados em `src/llm/prompts/` e usam o resumo dos artigos como contexto.
- Respostas sempre em JSON validado com esquema (por exemplo, `zod`), o que evita quebrar a interface.

### 6.6 Privacidade (LGPD)

- Nenhum dado do aluno vai para servidor próprio.
- Somente os textos da simulação vão para a API do LLM, sem nome ou e-mail.
- A política de privacidade é obrigatória para publicar na Chrome Web Store.

## 7. Etapas de implementação

| Etapa | Entregas | Esforço estimado |
|---|---|---|
| E0. Fundação | Repositório git + GitHub, projeto WXT, página "olá mundo", CI com lint e testes | 1–2 dias |
| E1. Cenários e motor | Esquema JSON, 1 cenário completo, máquina de estados, relógio com `chrome.alarms`, testes do motor | 3–4 dias |
| E2. Interface da simulação | Feed simulado, caixa de perguntas de jornalistas com contagem regressiva, editor de comunicado, escolha de estratégia, porta-voz e distribuição | 4–5 dias |
| E3. LLM | Cliente da API, prompts de reação do público e de avaliação, validação de JSON, tratamento de erros e de falta de conexão | 3–4 dias |
| E4. Avaliação e debrief | Regras fixas da rubrica, combinação com o LLM, relatório exportável | 2–3 dias |
| E5. Conteúdo | Mais 2 cenários (vítima e acidental), revisão teórica com a Ana Caroliny | 2–3 dias |
| E6. Validação | Teste piloto com alunos de RP, questionário SUS de usabilidade, ajustes | 1–2 semanas |
| E7. Publicação | Ícones, política de privacidade, envio à Chrome Web Store (opcional para o TCC) | 1–2 dias |

As etapas E1 a E4 formam o núcleo do MVP. Por outro lado, E5 e E6 dependem da participação da Ana Caroliny, que valida o conteúdo e conduz o teste com os alunos.

## 8. Validação para o TCC

A validação mede se a ferramenta apoia o ensino prático. Por exemplo:

- **Usabilidade:** questionário SUS (*System Usability Scale*) aplicado após a simulação.
- **Percepção de aprendizagem:** questionário curto em escala Likert sobre confiança para agir numa crise, antes e depois da simulação.
- **Desempenho:** comparação das notas da rubrica entre a primeira e a segunda tentativa do mesmo aluno.

Em todos os casos citados, a pesquisa com alunos pode exigir aprovação do Comitê de Ética, o que implica planejar esse prazo desde já.

## 9. Decisões em aberto

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| D1 | Quem paga e como se acessa o LLM | (a) cada aluno informa a própria chave de API; (b) servidor intermediário com chave do projeto; (c) modelo local | (b) para o teste piloto, já que alunos de RP dificilmente terão chave de API. Um servidor mínimo (por exemplo, Cloudflare Worker) esconde a chave e limita o uso. |
| D2 | Provedor do LLM | Anthropic, OpenAI, Google, modelo aberto | Definir conforme custo e qualidade em português |
| D3 | Nome do produto | "Astecca" ou outro | A definir com a Ana Caroliny |
| D4 | Quantidade de cenários no MVP | 1 a 3 | 3, um por grupo da SCCT |
| D5 | Publicar na Chrome Web Store | Sim ou instalação manual (modo desenvolvedor) | Instalação manual no piloto; publicação depois |
| D6 | Prazo de entrega do TCC | — | Necessário para ajustar o cronograma |

## 10. Riscos

- **Custo e limite da API de LLM** durante o teste piloto. Por isso, o servidor intermediário deve limitar chamadas por aluno.
- **Avaliação inconsistente do LLM.** Dessa forma, critérios objetivos ficam em regras fixas, e o LLM recebe exemplos de respostas boas e ruins.
- **Fechamento da aba durante a simulação.** Por isso, o estado é salvo no `chrome.storage` a cada ação, e o relógio é recalculado pelo horário real.
- **Repositório git dentro do iCloud.** Por isso, o histórico do git fica em `.git.nosync`.
