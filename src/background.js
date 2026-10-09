// Service worker: ao clicar no ícone da extensão, abre o Astecca numa aba inteira.
// Se a aba já estiver aberta, apenas a traz para a frente, o que evita abas duplicadas.

const URL_APP = chrome.runtime.getURL('src/app/index.html');

async function abrirAstecca() {
  const [aberta] = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [URL_APP] });
  if (aberta && aberta.tabId >= 0) {
    await chrome.tabs.update(aberta.tabId, { active: true });
    await chrome.windows.update(aberta.windowId, { focused: true });
    return;
  }
  await chrome.tabs.create({ url: URL_APP });
}

chrome.action.onClicked.addListener(abrirAstecca);

// Exposto para os testes automatizados.
self.abrirAstecca = abrirAstecca;
