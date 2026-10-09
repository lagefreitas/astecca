// Cliente mínimo da API da Anthropic (Messages API).
// A URL base é configurável. Dessa forma, um servidor intermediário com a chave do
// projeto pode substituir a chave individual sem mudar o resto do código.

export const URL_PADRAO = 'https://api.anthropic.com';
const VERSAO_API = '2023-06-01';

function cabecalhos(config) {
  const h = {
    'content-type': 'application/json',
    'anthropic-version': VERSAO_API,
    'anthropic-dangerous-direct-browser-access': 'true'
  };
  if (config.chave) h['x-api-key'] = config.chave;
  return h;
}

function base(config) {
  return (config.urlBase || URL_PADRAO).replace(/\/+$/, '');
}

export function iaConfigurada(config) {
  return Boolean(config && config.modelo && (config.chave || (config.urlBase && config.urlBase !== URL_PADRAO)));
}

/** Lista os modelos disponíveis para a chave informada. */
export async function listarModelos(config, fetchFn = fetch) {
  const r = await fetchFn(`${base(config)}/v1/models?limit=100`, { headers: cabecalhos(config) });
  if (!r.ok) throw new Error(await mensagemErro(r));
  const dados = await r.json();
  return (dados.data || []).map((m) => ({ id: m.id, nome: m.display_name || m.id }));
}

/** Envia uma mensagem e devolve o texto da resposta. */
export async function enviarMensagem(config, { sistema, usuario, maxTokens = 1500 }, fetchFn = fetch) {
  const corpo = {
    model: config.modelo,
    max_tokens: maxTokens,
    system: sistema,
    messages: [{ role: 'user', content: usuario }]
  };
  const r = await fetchFn(`${base(config)}/v1/messages`, {
    method: 'POST',
    headers: cabecalhos(config),
    body: JSON.stringify(corpo)
  });
  if (!r.ok) throw new Error(await mensagemErro(r));
  const dados = await r.json();
  return (dados.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

async function mensagemErro(r) {
  try {
    const dados = await r.json();
    return `Erro ${r.status} da API: ${dados?.error?.message || r.statusText}`;
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
