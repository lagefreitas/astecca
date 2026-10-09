# DADOS DE ENTRADA: RESUMO DOS ARTIGOS SELECIONADOS PARA PROMPTING EM COMUNICAÇÃO DE CRISE E IA

Este documento reúne resumos analíticos e estruturados dos três artigos selecionados sobre o uso de Inteligência Artificial, influenciadores virtuais e personalização algorítmica na Comunicação de Crise. A estrutura foi desenhada especificamente para servir como **contexto de entrada (input data)** para prompts e modelos de linguagem.

---

## SEÇÃO 1: Revisão Sistemática sobre IA em Comunicação de Crise
**Título original:** *How is artificial intelligence shaping crisis communication? A systematic review and future research agenda*  
**Autores:** Yang Cheng, Junzhen Li, Jaekuk Lee, Yadan Liu (2025)  
**Periódico:** *Journal of Risk Research* [1, 2]  

### 1. Visão Geral e Objetivo
* **Amostra:** Revisão sistemática de 177 artigos empíricos (2005–2024) indexados no SSCI (Web of Science) [3, 25].
* **Objetivo:** Mapear o estado da arte do uso da IA na comunicação de crise em quatro dimensões: teorias utilizadas, métodos empregados, tipos/funções de ferramentas de IA e contextos de crise/regiões [9, 10].

### 2. Principais Achados e Números-Chave
* **Surtos de publicação:** 73% dos artigos analisados foram publicados entre 2021 e 2024, evidenciando o crescimento exponencial da área após 2019 [35].
* **Carência Teórica:** Apenas ~20% (37 de 177) dos artigos utilizam enquadramentos teóricos explícitos [3, 38].
  * *Teorias predominantes:* Teoria da Comunicação de Crise Situacional (SCCT), Teoria da Restauração da Imagem, Agenda-Setting e Modelos de Aceitação Tecnológica (TAM/UTAUT) [11, 12, 38, 53].
* **Predomínio Metodológico:** 45% usam métodos quantitativos (destaque para análise de conteúdo computacional com LDA/sentiment analysis), 45% métodos mistos e 10% qualitativos [39].
* **Funções Primárias da IA:**
  1. *Análise e Tomada de Decisão (77% em não-comunicação, 36% em comunicação):* Análise de redes sociais, predição de crise e classificação de dados [43, 48].
  2. *Reconhecimento de Emoções e Empatização:* Monitoramento de sentimentos e suporte social/saúde mental via chatbots [43, 49].
  3. *Automação e Execução:* Disseminação massiva de alertas e extração de dados [43, 48].
* **Tipos de Crise:** Predomínio de crises de saúde pública (56%, turbinado pela COVID-19), seguidas por desastres ambientais/climáticos (21%) e crises financeiras (7%) [47].

### 3. Lacunas Críticas e Implicações para Prompts/IA
* **Fragmentação do Ciclo de Vida:** A literatura foca na detecção precoce ou na resposta imediata, mas ignora a integração entre as fases de pré-crise, crise e pós-crise (recuperação e aprendizado) [3, 56, 57].
* **Falta de Dimensão Relacional:** A IA é muito usada para classificação/detecção, mas pouco testada na construção de confiança, empatia e relacionamento de longo prazo [3, 55].
* **Necessidade de Supervisão Humana (*Human-in-the-Loop*):** Alerta contra a confiança cega e o *automation bias*, exigindo governança ética, transparência e mitigação de viés algorítmico em regiões do Sul Global [58, 61, 62].

---

## SEÇÃO 2: Eficácia de Influenciadores Virtuais em Comunicação de Crise Corporativa
**Título original:** *Reputation through artificial intelligence? On the effectiveness of virtual influencers as spokespersons in corporate crisis communication*  
**Autores:** Zoe Olbermann, Magdalena Nagl (2025)  
**Periódico:** *Frontiers in Communication* [121, 123]  

### 1. Visão Geral e Objetivo
* **Metodologia:** Experimento online mono-fatorial em 3 estágios ($N = 169$) comparando três tipos de porta-vozes (*Social Media Influencers* - SMIs) em um post no Instagram contendo um pedido de desculpas corporativo [121, 138, 139, 142]:
  1. *Human Influencer (HI)* – Porta-voz humana real (Grupo de Controle) [139].
  2. *Humanized Virtual Influencer (HVI)* – Influenciadora virtual realista (alta humanização visual) [139].
  3. *Animated Virtual Influencer (AVI)* – Influenciadora virtual estilizada/3D (estilo animação) [139].
* **Cenário:** Crise corporativa fictícia envolvendo preocupações com a privacidade de dados coletados por um relógio fitness [138, 151].

### 2. Cadeia Psicológica do Modelo de Mediação (Mediação Serial)
O estudo demonstrou empiricamente que a eficácia do porta-voz segue uma reação em cadeia [121, 144, 145]:
$$\text{Tipo de Porta-voz} \longrightarrow \text{Humanização Percebida (Visual/Mental)} \longrightarrow \text{Similaridade Percebida} \longrightarrow \text{Identificação Desejada} \longrightarrow \text{Aceitação da Mensagem} \longrightarrow \text{Imagem da Marca}$$

### 3. Principais Achados
* **Humanização Visual vs. Mental:**
  * Influenciadoras virtuais humanizadas (HVI) e animadas (AVI) diferem significativamente na **humanização visual** percebida ($p < 0.05$), mas **NÃO diferem na humanização mental** percebida ($b = -0.02$) [143, 144, 146].
  * O público consegue reconhecer que o avatar tem aparência humana sem necessariamente atribuir a ele inteligência ou mente humana real [146].
* **O Poder da Humanização Mental:** A humanização mental é um preditor muito mais forte da **similaridade percebida** ($b = 0.36$) do que a humanização visual ($b = 0.11$) [145, 146].
* **Identificação Desejada (*Wishful Identification*):** A similaridade percebida gera o desejo de se parecer/identificar com o influenciador ($b = 0.53$), o que reduz a resistência crítica (*reactance*) e aumenta a **aceitação da mensagem de crise** ($b = 0.57$) [145, 147, 148].
* **Impacto na Reputação:** A aceitação da mensagem prediz diretamente a restauração da imagem da marca ($b = 0.40$) [145, 148].

### 4. Implicações para Prompts/Design de Porta-vozes de IA
* Não basta focar na fidedignidade gráfica/estética do avatar de IA. O fator crítico para gerar confiança e persuadir o público reside na **narrativa de personagem (*storytelling*)**, que constrói uma "mente", valores, empatia e personalidade percebida (*mental human-likeness*) [146, 149, 152].

---

## SEÇÃO 3: Riscos da Personalização Algorítmica e Rotulagem de Mensagens de Crise
**Título original:** *Examining the Influence of Algorithmic Message Personalization on Source Credibility and Reputation*  
**Autores:** Natalie Brown-Devlin, Hayoung Sally Lim, Jingyue Tao (2022)  
**Periódico:** *International Journal of Business Communication* [183]  

### 1. Visão Geral e Objetivo
* **Fundamentação Teórica:** Teoria da Comunicação de Crise Situacional (SCCT) [183, 187, 189].
* **Metodologia:** Experimento fatorial $2 \times 2$ ($N = 242$) investigando a resposta a uma crise de um atleta profissional (*Athlete Reputational Crisis* - ARC) no grupo evitável (prisão por rachas de rua) [183, 208, 210, 211]:
  * *Fator 1 (Estratégia SCCT):* Pedido de Desculpas (*Apology*) vs. Negação (*Denial*) [183, 208, 212].
  * *Fator 2 (Notificação de Personalização):* Presença vs. Ausência de aviso de que o post foi personalizado/patrocinado com base em dados de navegação e perfil (*big data*) [183, 208, 212].

### 2. Principais Achados
* **Ação Indireta da Estratégia de Resposta:** O pedido de desculpas não melhora a reputação diretamente ($p > 0.05$), mas o faz **indireta e significativamente através do aumento da credibilidade da fonte** ($B = 0.71, p < 0.001$) [216, 217, 220].
* **O Efeito Moderador da Notificação de Personalização:**
  * A notificação de que a mensagem foi microsegmentada via dados pessoais/algoritmos **quebra a percepção de credibilidade da fonte** ($ab = -0.40$) [217, 218].
  * Quando o público descobre que o comunicado de crise foi direcionado por dados ou impulsionado como post patrocinado, a mensagem perde o tom genuíno, soando como manipulação, *cash grab* ou esforço corporativo insincero [222].
* **Risco da Negação Digital:** A postura de negação em redes sociais é duplamente prejudicial, pois pode ser checada e desmentida rapidamente por outras fontes no feed [221].

### 3. Implicações para Prompts/IA em Resposta a Crises
* **Evitar a Micro-segmentação Ostensiva e Transparência Excessiva de Algoritmo:** Mensagens de crise e pedidos de desculpas **NÃO devem ser apresentados como textos automatizados, patrocinados ou direcionados por dados**, sob o risco de reverter o ganho de credibilidade e amplificar a indignação do público [222, 225].
* **Valor do Porta-voz Humano Autêntico:** A voz direta e sincera do porta-voz oficial (CEO, RP, Atleta) continua sendo o pilar fundamental para restaurar a credibilidade [201, 220].
