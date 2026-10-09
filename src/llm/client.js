// Cliente mínimo para três provedores de IA: Anthropic (Claude), OpenAI (GPT) e Google (Gemini).
// Cada provedor tem o seu formato de requisição. Por isso, o resto do código usa só
// enviarMensagem() e listarModelos(), que escolhem o formato certo.
// A URL base é configurável. Dessa forma, um servidor intermediário com a chave do
// projeto pode substituir a chave individual sem mudar o resto do código.

export const PROVEDORES = {
  anthropic: {
    nome: 'Claude (Anthropic)',
    rotuloChave: 'Chave da API da Anthropic',
    urlPadrao: 'https://api.anthropic.com',
    sugerido: /sonnet/i
  },
  openai: {
    nome: 'GPT (OpenAI)',
    rotuloChave: 'Chave da API da OpenAI',
    urlPadrao: 'https://api.openai.com',
    sugerido: /^gpt-[\d.]+$|^gpt-[\d.]+o?$|^gpt-[\d.]+-?mini$/i
  },
  gemini: {
    nome: 'Gemini (Google)',
    rotuloChave: 'Chave da API do Google AI Studio',
    urlPadrao: 'https://generativelanguage.googleapis.com',
    sugerido: /flash/i
  }
};

// Mantido para compatibilidade com configurações antigas.
export const URL_PADRAO = PROVEDORES.anthropic.urlPadrao;

/** Normaliza a configuração salva (versões antigas tinham só "chave", da Anthropic). */
export function normalizarConfig(config = {}) {
  const provedor = PROVEDORES[config.provedor] ? config.provedor : 'anthropic';
  const chaves = { anthropic: '', openai: '', gemini: '', ...(config.chaves || {}) };
  if (config.chave && !chaves.anthropic) chaves.anthropic = config.chave;
  const { chave, ...resto } = config;
  return { ...resto, provedor, chaves };
}

function chaveAtual(config) {
  const c = normalizarConfig(config);
  return c.chaves[c.provedor] || '';
}

function base(config) {
  const c = normalizarConfig(config);
  return (c.urlBase || PROVEDORES[c.provedor].urlPadrao).replace(/\/+$/, '');
}

export function iaConfigurada(config) {
  if (!config || !config.modelo) return false;
  const c = normalizarConfig(config);
  const usaServidorProprio = c.urlBase && c.urlBase !== PROVEDORES[c.provedor].urlPadrao;
  return Boolean(chaveAtual(c) || usaServidorProprio);
}

// ---------- Formatos de cada provedor ----------

const ADAPTADORES = {
  anthropic: {
    cabecalhos: (chave) => ({
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      ...(chave ? { 'x-api-key': chave } : {})
    }),
    urlModelos: (b) => `${b}/v1/models?limit=100`,
    lerModelos: (dados) => (dados.data || []).map((m) => ({ id: m.id, nome: m.display_name || m.id })),
    urlMensagem: (b) => `${b}/v1/messages`,
    corpo: ({ modelo, sistema, usuario, maxTokens }) => ({
      model: modelo,
      max_tokens: maxTokens,
      system: sistema,
      messages: [{ role: 'user', content: usuario }]
    }),
    lerTexto: (dados) => (dados.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
  },

  openai: {
    cabecalhos: (chave) => ({
      'content-type': 'application/json',
      ...(chave ? { authorization: `Bearer ${chave}` } : {})
    }),
    urlModelos: (b) => `${b}/v1/models`,
    lerModelos: (dados) => (dados.data || [])
      .map((m) => m.id)
      // mantém apenas modelos de conversa (exclui áudio, imagem, embeddings etc.)
      .filter((id) => /^(gpt-|o\d|chatgpt-)/i.test(id) && !/audio|realtime|image|transcribe|tts|search|embedding|instruct/i.test(id))
      .sort()
      .map((id) => ({ id, nome: id })),
    urlMensagem: (b) => `${b}/v1/chat/completions`,
    corpo: ({ modelo, sistema, usuario, maxTokens }) => ({
      model: modelo,
      // modelos de raciocínio gastam tokens antes de responder; por isso, a margem é maior
      max_completion_tokens: Math.max(maxTokens, 4000),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: usuario }
      ]
    }),
    lerTexto: (dados) => dados.choices?.[0]?.message?.content || ''
  },

  gemini: {
    cabecalhos: (chave) => ({
      'content-type': 'application/json',
      ...(chave ? { 'x-goog-api-key': chave } : {})
    }),
    urlModelos: (b) => `${b}/v1beta/models?pageSize=200`,
    lerModelos: (dados) => (dados.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini/i.test(m.name))
      .map((m) => ({ id: m.name.replace(/^models\//, ''), nome: m.displayName || m.name })),
    urlMensagem: (b, modelo) => `${b}/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
    corpo: ({ sistema, usuario, maxTokens }) => ({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [{ role: 'user', parts: [{ text: usuario }] }],
      generationConfig: {
        // modelos com "pensamento" gastam tokens antes de responder; por isso, a margem é maior
        maxOutputTokens: Math.max(maxTokens, 4000),
        responseMimeType: 'application/json'
      }
    }),
    lerTexto: (dados) => (dados.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
  }
};

/** Lista os modelos disponíveis para a chave informada. */
export async function listarModelos(config, fetchFn = fetch) {
  const c = normalizarConfig(config);
  const ad = ADAPTADORES[c.provedor];
  const r = await fetchFn(ad.urlModelos(base(c)), { headers: ad.cabecalhos(chaveAtual(c)) });
  if (!r.ok) throw new Error(await mensagemErro(r));
  return ad.lerModelos(await r.json());
}

/** Sugere um modelo da lista para o provedor atual. */
export function sugerirModelo(config, modelos) {
  const c = normalizarConfig(config);
  const padrao = PROVEDORES[c.provedor].sugerido;
  return (modelos.find((m) => padrao.test(m.id)) || modelos[0])?.id || '';
}

/** Envia uma mensagem e devolve o texto da resposta. */
export async function enviarMensagem(config, { sistema, usuario, maxTokens = 1500 }, fetchFn = fetch) {
  const c = normalizarConfig(config);
  const ad = ADAPTADORES[c.provedor];
  const r = await fetchFn(ad.urlMensagem(base(c), c.modelo), {
    method: 'POST',
    headers: ad.cabecalhos(chaveAtual(c)),
    body: JSON.stringify(ad.corpo({ modelo: c.modelo, sistema, usuario, maxTokens }))
  });
  if (!r.ok) throw new Error(await mensagemErro(r));
  const texto = ad.lerTexto(await r.json());
  if (!texto) throw new Error('A IA devolveu uma resposta vazia.');
  return texto;
}

async function mensagemErro(r) {
  try {
    const dados = await r.json();
    const msg = dados?.error?.message || (typeof dados?.error === 'string' ? dados.error : null) || r.statusText;
    return `Erro ${r.status} da API: ${msg}`;
  } catch {
    return `Erro ${r.status} da API.`;
  }
}

/** Extrai o primeiro objeto JSON de um texto (o modelo às vezes envolve o JSON em ```json). */
export function extrairJson(texto) {
  const inicio = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  if (inicio < 0 || fim <= inicio) throw new Error('A resposta da IA não contém JSON.');
  return JSON.parse(texto.slice(inicio, fim + 1));
}
