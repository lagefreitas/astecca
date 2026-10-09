// Armazenamento local. Na extensão usa chrome.storage.local; fora dela (testes, navegador comum),
// usa localStorage. Os dados do aluno ficam apenas neste navegador.

const temChrome = typeof chrome !== 'undefined' && chrome?.storage?.local;

export async function carregar(chave) {
  if (temChrome) {
    const r = await chrome.storage.local.get(chave);
    return r[chave] ?? null;
  }
  try {
    const v = localStorage.getItem(chave);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export async function salvar(chave, valor) {
  if (temChrome) {
    await chrome.storage.local.set({ [chave]: valor });
    return;
  }
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // armazenamento indisponível: a sessão segue apenas em memória
  }
}

export const CHAVE_SESSAO = 'astecca:sessao';
export const CHAVE_CONFIG = 'astecca:config';
export const CHAVE_CENARIOS_IA = 'astecca:cenarios-ia';
