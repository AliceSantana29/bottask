const test = require('node:test');
const assert = require('node:assert');
const { criarApp, resumo } = require('../src/app');

function iniciar() {
  return new Promise((resolve) => {
    const servidor = criarApp();
    servidor.listen(0, () => {
      resolve({ servidor, base: `http://127.0.0.1:${servidor.address().port}` });
    });
  });
}

function json(corpo) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  };
}

test('calcula nível a cada 100 xp', () => {
  assert.strictEqual(resumo('a', 0).nivel, 1);
  assert.strictEqual(resumo('a', 99).nivel, 1);
  assert.strictEqual(resumo('a', 100).nivel, 2);
  assert.strictEqual(resumo('a', 250).nivel, 3);
  assert.strictEqual(resumo('a', 250).xpNoNivel, 50);
});

test('soma xp e sobe de nível', async () => {
  const { servidor, base } = await iniciar();
  await fetch(`${base}/xp`, json({ usuario: 'ana', xp: 60 }));
  const resposta = await fetch(`${base}/xp`, json({ usuario: 'ana', xp: 50 }));
  const corpo = await resposta.json();
  assert.strictEqual(corpo.xp, 110);
  assert.strictEqual(corpo.nivel, 2);
  servidor.close();
});

test('usuário novo começa zerado', async () => {
  const { servidor, base } = await iniciar();
  const corpo = await (await fetch(`${base}/xp/novato`)).json();
  assert.strictEqual(corpo.xp, 0);
  assert.strictEqual(corpo.nivel, 1);
  servidor.close();
});

test('rejeita xp inválido', async () => {
  const { servidor, base } = await iniciar();
  for (const xp of [0, -5, 1.5, '10', 5000]) {
    const resposta = await fetch(`${base}/xp`, json({ usuario: 'ana', xp }));
    assert.strictEqual(resposta.status, 400);
  }
  const semUsuario = await fetch(`${base}/xp`, json({ xp: 10 }));
  assert.strictEqual(semUsuario.status, 400);
  servidor.close();
});

test('ranking ordena por xp', async () => {
  const { servidor, base } = await iniciar();
  await fetch(`${base}/xp`, json({ usuario: 'ana', xp: 10 }));
  await fetch(`${base}/xp`, json({ usuario: 'bia', xp: 50 }));
  const ranking = await (await fetch(`${base}/xp`)).json();
  assert.strictEqual(ranking[0].usuario, 'bia');
  servidor.close();
});
