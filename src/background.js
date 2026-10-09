// Service worker: abre o painel lateral quando o aluno clica no ícone da extensão.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((erro) => console.error('Astecca: não foi possível configurar o painel lateral.', erro));
