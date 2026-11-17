const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { criarApp } = require('../src/app');

function subir(servidor) {
  return new Promise((resolve) => {
    servidor.listen(0, () => resolve(`http://127.0.0.1:${servidor.address().port}`));
  });
}

test('serve a página inicial', async () => {
  const servidor = criarApp({ urls: {} });
  const base = await subir(servidor);
  const resposta = await fetch(`${base}/`);
  assert.strictEqual(resposta.status, 200);
  assert.match(await resposta.text(), /BotTask/);
  servidor.close();
});

test('encaminha as chamadas de api para os serviços', async () => {
  const recebidos = [];
  const origem = http.createServer((req, res) => {
    recebidos.push(req.url);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
  });
  const baseOrigem = await subir(origem);
  const servidor = criarApp({
    urls: { missoes: baseOrigem, pontuacao: baseOrigem, conquistas: baseOrigem },
  });
  const base = await subir(servidor);

  await fetch(`${base}/api/missoes?usuario=ana`);
  await fetch(`${base}/api/pontuacao/ana`);
  await fetch(`${base}/api/conquistas/ana`);

  assert.deepStrictEqual(recebidos, ['/missoes?usuario=ana', '/xp/ana', '/conquistas/ana']);
  servidor.close();
  origem.close();
});

test('responde 502 quando o serviço está fora do ar', async () => {
  const servidor = criarApp({
    urls: { missoes: 'http://127.0.0.1:1', pontuacao: 'http://127.0.0.1:1', conquistas: 'http://127.0.0.1:1' },
  });
  const base = await subir(servidor);
  const resposta = await fetch(`${base}/api/missoes?usuario=ana`);
  assert.strictEqual(resposta.status, 502);
  servidor.close();
});

test('bloqueia acesso fora da pasta pública', async () => {
  const servidor = criarApp({ urls: {} });
  const base = await subir(servidor);
  const porta = new URL(base).port;
  const status = await new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port: porta, path: '/%2e%2e/package.json' }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
  });
  assert.strictEqual(status, 404);
  servidor.close();
});
