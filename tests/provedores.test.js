import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enviarMensagem, listarModelos, iaConfigurada, normalizarConfig, sugerirModelo } from '../src/llm/client.js';

function falso(corpo, status = 200) {
  const f = async (url, opts) => {
    f.ultima = { url, opts };
    return { ok: status === 200, status, statusText: 'x', json: async () => corpo };
  };
  return f;
}

test('configuração antiga (só "chave") vira chave da Anthropic', () => {
  const c = normalizarConfig({ chave: 'k-antiga', modelo: 'm' });
  assert.equal(c.provedor, 'anthropic');
  assert.equal(c.chaves.anthropic, 'k-antiga');
  assert.equal('chave' in c, false);
});

test('iaConfigurada usa a chave do provedor escolhido', () => {
  const chaves = { anthropic: '', openai: 'sk-o', gemini: '' };
  assert.equal(iaConfigurada({ provedor: 'openai', chaves, modelo: 'gpt-x' }), true);
  assert.equal(iaConfigurada({ provedor: 'gemini', chaves, modelo: 'gemini-x' }), false);
});

test('OpenAI: requisição no formato chat/completions', async () => {
  const f = falso({ choices: [{ message: { content: '{"ok":true}' } }] });
  const texto = await enviarMensagem({ provedor: 'openai', chaves: { openai: 'sk-o' }, modelo: 'gpt-teste' }, { sistema: 'S', usuario: 'U', maxTokens: 100 }, f);
  assert.equal(texto, '{"ok":true}');
  assert.equal(f.ultima.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(f.ultima.opts.headers.authorization, 'Bearer sk-o');
  const corpo = JSON.parse(f.ultima.opts.body);
  assert.equal(corpo.model, 'gpt-teste');
  assert.deepEqual(corpo.messages.map((m) => m.role), ['system', 'user']);
  assert.equal(corpo.response_format.type, 'json_object');
  assert.ok(corpo.max_completion_tokens >= 100);
});

test('Gemini: requisição no formato generateContent', async () => {
  const f = falso({ candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '1}' }] } }] });
  const texto = await enviarMensagem({ provedor: 'gemini', chaves: { gemini: 'g-k' }, modelo: 'gemini-teste-flash' }, { sistema: 'S', usuario: 'U' }, f);
  assert.equal(texto, '{"a":1}');
  assert.equal(f.ultima.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-teste-flash:generateContent');
  assert.equal(f.ultima.opts.headers['x-goog-api-key'], 'g-k');
  const corpo = JSON.parse(f.ultima.opts.body);
  assert.equal(corpo.systemInstruction.parts[0].text, 'S');
  assert.equal(corpo.contents[0].parts[0].text, 'U');
  assert.equal(corpo.generationConfig.responseMimeType, 'application/json');
});

test('listas de modelos são filtradas por provedor', async () => {
  const openai = await listarModelos({ provedor: 'openai', chaves: { openai: 'k' } },
    falso({ data: [{ id: 'gpt-teste' }, { id: 'gpt-teste-audio-preview' }, { id: 'text-embedding-3-small' }, { id: 'dall-e-3' }, { id: 'gpt-teste-mini' }] }));
  assert.deepEqual(openai.map((m) => m.id), ['gpt-teste', 'gpt-teste-mini']);

  const gemini = await listarModelos({ provedor: 'gemini', chaves: { gemini: 'k' } }, falso({
    models: [
      { name: 'models/gemini-teste-flash', displayName: 'Gemini Teste Flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] }
    ]
  }));
  assert.deepEqual(gemini, [{ id: 'gemini-teste-flash', nome: 'Gemini Teste Flash' }]);
  assert.equal(sugerirModelo({ provedor: 'gemini' }, gemini), 'gemini-teste-flash');
});

test('resposta vazia vira erro legível', async () => {
  const f = falso({ choices: [{ message: { content: '' } }] });
  await assert.rejects(enviarMensagem({ provedor: 'openai', chaves: { openai: 'k' }, modelo: 'g' }, { sistema: 's', usuario: 'u' }, f), /vazia/);
});
