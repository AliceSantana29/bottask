const test = require('node:test');
const assert = require('node:assert');
const { criarApp } = require('../src/app');

function iniciar(clientes) {
  return new Promise((resolve) => {
    const servidor = criarApp({ clientes });
    servidor.listen(0, () => {
      resolve({ servidor, base: `http://127.0.0.1:${servidor.address().port}` });
    });
  });
}

const clientesOk = {
  pontuacao: async (usuario, xp) => ({ usuario, xp, nivel: 1 }),
  conquistas: async () => ({ novas: [{ id: 'primeira-missao', nome: 'Primeiro passo' }] }),
};

function json(corpo) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  };
}

test('cria e lista missões do usuário', async () => {
  const { servidor, base } = await iniciar(clientesOk);
  const criada = await fetch(`${base}/missoes`, json({ usuario: 'ana', titulo: 'Estudar', dificuldade: 'media' }));
  assert.strictEqual(criada.status, 201);
  const missao = await criada.json();
  assert.strictEqual(missao.xp, 25);

  const lista = await (await fetch(`${base}/missoes?usuario=ana`)).json();
  assert.strictEqual(lista.length, 1);
  const outra = await (await fetch(`${base}/missoes?usuario=bia`)).json();
  assert.strictEqual(outra.length, 0);
  servidor.close();
});

test('rejeita missão sem título e dificuldade inválida', async () => {
  const { servidor, base } = await iniciar(clientesOk);
  const semTitulo = await fetch(`${base}/missoes`, json({ usuario: 'ana' }));
  assert.strictEqual(semTitulo.status, 400);
  const dificuldade = await fetch(`${base}/missoes`, json({ usuario: 'ana', titulo: 'x', dificuldade: 'impossivel' }));
  assert.strictEqual(dificuldade.status, 400);
  servidor.close();
});

test('concluir envia o xp correto e devolve conquistas', async () => {
  const chamadas = [];
  const { servidor, base } = await iniciar({
    pontuacao: async (usuario, xp) => {
      chamadas.push({ usuario, xp });
      return { usuario, xp, nivel: 1 };
    },
    conquistas: async (corpo) => {
      chamadas.push(corpo);
      return { novas: [{ id: 'primeira-missao' }] };
    },
  });
  const missao = await (await fetch(`${base}/missoes`, json({ usuario: 'ana', titulo: 'Lição', dificuldade: 'dificil' }))).json();
  const resposta = await fetch(`${base}/missoes/${missao.id}/concluir`, { method: 'PUT' });
  assert.strictEqual(resposta.status, 200);
  const corpo = await resposta.json();
  assert.strictEqual(corpo.missao.concluida, true);
  assert.strictEqual(corpo.novasConquistas.length, 1);
  assert.deepStrictEqual(chamadas[0], { usuario: 'ana', xp: 50 });
  assert.strictEqual(chamadas[1].concluidas, 1);
  servidor.close();
});

test('não conclui a mesma missão duas vezes', async () => {
  const { servidor, base } = await iniciar(clientesOk);
  const missao = await (await fetch(`${base}/missoes`, json({ usuario: 'ana', titulo: 'Lição' }))).json();
  await fetch(`${base}/missoes/${missao.id}/concluir`, { method: 'PUT' });
  const segunda = await fetch(`${base}/missoes/${missao.id}/concluir`, { method: 'PUT' });
  assert.strictEqual(segunda.status, 409);
  servidor.close();
});

test('mantém a missão pendente se a pontuação estiver fora do ar', async () => {
  const { servidor, base } = await iniciar({
    pontuacao: async () => {
      throw new Error('falha');
    },
    conquistas: async () => ({ novas: [] }),
  });
  const missao = await (await fetch(`${base}/missoes`, json({ usuario: 'ana', titulo: 'Lição' }))).json();
  const resposta = await fetch(`${base}/missoes/${missao.id}/concluir`, { method: 'PUT' });
  assert.strictEqual(resposta.status, 502);
  const lista = await (await fetch(`${base}/missoes?usuario=ana`)).json();
  assert.strictEqual(lista[0].concluida, false);
  servidor.close();
});

test('exclui missão', async () => {
  const { servidor, base } = await iniciar(clientesOk);
  const missao = await (await fetch(`${base}/missoes`, json({ usuario: 'ana', titulo: 'Lição' }))).json();
  const apagada = await fetch(`${base}/missoes/${missao.id}`, { method: 'DELETE' });
  assert.strictEqual(apagada.status, 204);
  const inexistente = await fetch(`${base}/missoes/${missao.id}`, { method: 'DELETE' });
  assert.strictEqual(inexistente.status, 404);
  servidor.close();
});

test('health responde ok', async () => {
  const { servidor, base } = await iniciar(clientesOk);
  const resposta = await fetch(`${base}/health`);
  assert.strictEqual(resposta.status, 200);
  servidor.close();
});
