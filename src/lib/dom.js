// Utilitários mínimos de DOM, sem dependências externas.

/** Cria um elemento. Atributos "on*" viram eventos; "value" e "checked" viram propriedades. */
export function h(tag, atributos = {}, ...filhos) {
  const el = document.createElement(tag);
  const props = {};
  for (const [k, v] of Object.entries(atributos || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'svg') { if (Object.values(ICONES).includes(v)) el.innerHTML = v; } // só ícones fixos deste arquivo; nunca dados
    else if (k === 'value' || k === 'checked' || k === 'disabled') props[k] = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const f of filhos.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  Object.assign(el, props);
  return el;
}

const svg = (corpo, tamanho = 20) =>
  `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;

export const ICONES = {
  alerta: svg('<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>', 24),
  config: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  voltar: svg('<path d="m15 18-6-6 6-6"/>'),
  telefone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>', 18),
  forum: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', 18),
  email: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', 18),
  grafico: svg('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>', 18),
  ok: svg('<path d="M20 6 9 17l-5-5"/>', 18),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>', 18),
  fechar: svg('<path d="M18 6 6 18M6 6l12 12"/>', 18)
};

export function icone(nome, classe = 'icone') {
  return h('span', { class: classe, svg: ICONES[nome] });
}
