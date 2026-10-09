# Astecca - Ambiente de Treinamento em Comunicação de Crise

Extensão do Chrome para o ensino prático de Comunicação de Crise em Relações Públicas. Esse MVP foi desenvolvido como produto de TCC da Ana Caroliny Mendes Cavalcante ([ana.mendes@ichca.ufal.br](mailto:ana.mendes@ichca.ufal.br)), graduanda do curso de Relações Públicas da Universidade Federal de Alagoas (UFAL), sob orientação do Prof. André Lage Freitas ([andre.lage@ichca.ufal.br](mailto:andre.lage@ichca.ufal.br)).

O aluno assume o papel de profissional de RP de uma empresa fictícia. A simulação passa por três fases: pré-crise, crise e pós-crise. Ao longo da crise, ele escolhe a estratégia de resposta (SCCT), o porta-voz e a forma de distribuição. Além disso, responde a jornalistas com prazo, redige o comunicado oficial e desmente boatos gerados por IA. No fim, recebe uma avaliação por critério, com a teoria que sustenta cada nota.

Plano completo: [`docs/PLANO-MVP.md`](docs/PLANO-MVP.md). Base teórica: [`docs/resumo-3-artigos-selecionados.md`](docs/resumo-3-artigos-selecionados.md).

## Como baixar

O Astecca está disponível em <https://github.com/lagefreitas/astecca>. Há duas formas de baixá-lo.

**Opção 1: arquivo ZIP (mais simples, sem programas extras).**

1. Acesse <https://github.com/lagefreitas/astecca>.
2. Clique no botão verde **Code** e, em seguida, em **Download ZIP**.
3. Descompacte o arquivo baixado. Ele cria a pasta `astecca-main`, que é a pasta usada na instalação.

**Opção 2: git (para quem vai colaborar com o código).**

```
git clone https://github.com/lagefreitas/astecca.git
```

Esse comando cria a pasta `astecca`.

## Como instalar (modo desenvolvedor)

1. Abra `chrome://extensions` no Chrome (versão 116 ou mais recente).
2. Ative o **Modo do desenvolvedor**, no canto superior direito.
3. Clique em **Carregar sem compactação** e selecione a pasta baixada (`astecca-main`, na opção ZIP, ou `astecca`, na opção git). A pasta certa é a que contém o arquivo `manifest.json`.
4. Fixe o ícone do Astecca na barra do Chrome e clique nele. O Astecca abre numa aba inteira. Se a aba já estiver aberta, o clique apenas volta para ela.

Não apague nem mova a pasta depois de instalar, já que o Chrome carrega a extensão a partir dela.

Não há etapa de build. Dessa forma, qualquer alteração nos arquivos aparece ao recarregar a extensão em `chrome://extensions`.

## Como atualizar

1. Baixe a versão nova: na opção ZIP, baixe e descompacte o arquivo de novo, substituindo a pasta antiga; na opção git, rode `git pull` dentro da pasta.
2. Em `chrome://extensions`, clique no botão de recarregar do Astecca.

As configurações, as chaves de API e as crises geradas ficam guardadas no Chrome. Por isso, elas continuam disponíveis depois da atualização, desde que a extensão não seja removida.

## Inteligência artificial (opcional)

Sem IA, o Astecca funciona com reações prontas de cada cenário e avalia os textos por heurísticas simples. Com IA, as reações do público e a avaliação dos textos ficam mais ricas.

O Astecca aceita três provedores: **Claude** (Anthropic), **GPT** (OpenAI) e **Gemini** (Google AI Studio). Para ativar, abra **Configurações**, escolha o provedor, informe a chave da API e clique em **Testar conexão e listar modelos**. Em seguida, escolha o modelo e salve. Cada provedor guarda a sua própria chave, que fica só no navegador do aluno. Para o teste piloto, o campo **Servidor intermediário** permite apontar para um servidor do projeto que guarde a chave, conforme a decisão D1 do plano.

## Estrutura

```
manifest.json            Manifest V3
src/background.js        abre o Astecca numa aba ao clicar no ícone
src/app/                 interface (HTML, CSS e JavaScript puro)
src/engine/              motor da simulação (funções puras) e catálogo de cenários
src/scenarios/*.json     cenários editáveis pela equipe de conteúdo
src/evaluation/          rubrica: regras fixas + heurísticas de texto
src/llm/                 cliente dos provedores de IA (client.js) e prompts (prompts.js)
src/report/              relatório em Markdown e página para impressão/PDF
tests/                   testes automatizados (node:test)
```

## Como editar um cenário

Cada cenário é um arquivo JSON em `src/scenarios/`. Os campos principais são:

- `cluster_scct`: `vitima`, `acidental` ou `evitavel`.
- `estrategias_adequadas` e `estrategias_aceitaveis`: entre `negar`, `diminuir`, `reconstruir` e `reforcar`.
- `porta_voz.recomendado` e `porta_voz.aceitavel`: entre `ceo`, `rp` e `influenciador`.
- `eventos`: posts, matérias, boatos e perguntas de jornalistas. O campo `t` é o segundo simulado em que o evento aparece, e `prazo_s` é o prazo do jornalista.
- `reacoes`: posts usados no modo sem IA, conforme o desfecho (`boa`, `mista` ou `ruim`).

Com a IA ativada, a tela inicial também mostra **Gerar nova crise com IA**. O aluno escolhe o grupo SCCT (ou "Aleatório") e, se quiser, o setor da empresa. A IA escreve o conteúdo, enquanto o código define as regras teóricas do cenário, como as estratégias adequadas a cada grupo. As crises geradas ficam salvas no navegador, marcadas como "Gerada por IA", e podem ser removidas.

Para incluir um cenário novo, crie o arquivo e acrescente o `id` em `CATALOGO`, no arquivo `src/engine/scenarios.js`. Os testes verificam se todos os cenários são válidos.

Os cenários "Falha no sistema de pagamentos" e "Boato gerado por IA sobre a marca" estão marcados como rascunho, e precisam de revisão de conteúdo.

## Testes

Requer Node.js 18 ou mais recente.

```
npm test
```

## Segurança

A revisão de segurança, com prompt injection, XSS, chaves de API e privacidade, está em [`docs/SEGURANCA.md`](docs/SEGURANCA.md).

## Privacidade

Os dados do aluno ficam no `chrome.storage.local` do próprio navegador. Quando a IA está ativa, somente os textos da simulação vão para o provedor escolhido, sem o nome do aluno.
