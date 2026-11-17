const test = require('node:test');
const assert = require('node:assert');
const { criarApp } = require('../src/app');

function iniciar() {
  return new Promise((resolve) => {
    const servidor = criarApp();
    servidor.listen(0, () => {
      resolve({ servidor, base: `http://127.0.0.1:${servidor.address().port}` });
    });
  });
}

function verificar(base, corpo) {
  return fetch(`${base}/verificar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
}

test('libera a primeira medalha com 1 missão', async () => {
  const { servidor, base } = await iniciar();
  const corpo = await (await verificar(base, { usuario: 'ana', concluidas: 1, nivel: 1 })).json();
  assert.deepStrictEqual(corpo.novas.map((c) => c.id), ['primeira-missao']);
  servidor.close();
});

test('não repete medalha já conquistada', async () => {
  const { servidor, base } = await iniciar();
  await verificar(base, { usuario: 'ana', concluidas: 1, nivel: 1 });
  const corpo = await (await verificar(base, { usuario: 'ana', concluidas: 2, nivel: 1 })).json();
  assert.strictEqual(corpo.novas.length, 0);
  servidor.close();
});

test('libera medalhas de missões e de nível juntas', async () => {
  const { servidor, base } = await iniciar();
  const corpo = await (await verificar(base, { usuario: 'ana', concluidas: 5, nivel: 3 })).json();
  const ids = corpo.novas.map((c) => c.id);
  assert.ok(ids.includes('cinco-missoes'));
  assert.ok(ids.includes('nivel-3'));
  assert.ok(!ids.includes('dez-missoes'));
  servidor.close();
});

test('lista medalhas do usuário com status', async () => {
  const { servidor, base } = await iniciar();
  await verificar(base, { usuario: 'ana', concluidas: 1, nivel: 1 });
  const lista = await (await fetch(`${base}/conquistas/ana`)).json();
  assert.strictEqual(lista.find((c) => c.id === 'primeira-missao').conquistada, true);
  assert.strictEqual(lista.find((c) => c.id === 'dez-missoes').conquistada, false);
  servidor.close();
});

test('rejeita dados inválidos', async () => {
  const { servidor, base } = await iniciar();
  assert.strictEqual((await verificar(base, { concluidas: 1, nivel: 1 })).status, 400);
  assert.strictEqual((await verificar(base, { usuario: 'ana', concluidas: 'x', nivel: 1 })).status, 400);
  assert.strictEqual((await verificar(base, { usuario: 'ana', concluidas: 1, nivel: 0 })).status, 400);
  servidor.close();
});
