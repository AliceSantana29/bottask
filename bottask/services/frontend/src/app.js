const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PUBLICO = path.join(__dirname, '..', 'public');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function urlsPadrao() {
  return {
    missoes: process.env.MISSOES_URL || 'http://localhost:3001',
    pontuacao: process.env.PONTUACAO_URL || 'http://localhost:3002',
    conquistas: process.env.CONQUISTAS_URL || 'http://localhost:3003',
  };
}

function criarApp(opcoes = {}) {
  const urls = opcoes.urls || urlsPadrao();
  const rotas = [
    { prefixo: '/api/missoes', base: urls.missoes, destino: '/missoes' },
    { prefixo: '/api/pontuacao', base: urls.pontuacao, destino: '/xp' },
    { prefixo: '/api/conquistas', base: urls.conquistas, destino: '/conquistas' },
  ];

  function encaminhar(req, res, alvo) {
    const proxy = http.request(
      {
        hostname: alvo.hostname,
        port: alvo.port,
        path: alvo.pathname + alvo.search,
        method: req.method,
        headers: { ...req.headers, host: alvo.host },
      },
      (resposta) => {
        res.writeHead(resposta.statusCode, resposta.headers);
        resposta.pipe(res);
      }
    );
    proxy.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'servico_indisponivel' }));
    });
    req.pipe(proxy);
  }

  function arquivoEstatico(res, caminho) {
    let relativo;
    try {
      relativo = decodeURIComponent(caminho);
    } catch {
      res.writeHead(400);
      return res.end();
    }
    if (relativo === '/') relativo = '/index.html';
    const completo = path.join(PUBLICO, path.normalize(relativo));
    if (!completo.startsWith(PUBLICO + path.sep)) {
      res.writeHead(404);
      return res.end();
    }
    fs.readFile(completo, (erro, conteudo) => {
      if (erro) {
        res.writeHead(404);
        return res.end('nao encontrado');
      }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(completo)] || 'application/octet-stream' });
      res.end(conteudo);
    });
  }

  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', servico: 'frontend' }));
    }

    const rota = rotas.find(
      (r) => url.pathname === r.prefixo || url.pathname.startsWith(r.prefixo + '/')
    );
    if (rota) {
      const alvo = new URL(rota.base + rota.destino + url.pathname.slice(rota.prefixo.length) + url.search);
      return encaminhar(req, res, alvo);
    }

    if (req.method !== 'GET') {
      res.writeHead(405);
      return res.end();
    }
    return arquivoEstatico(res, url.pathname);
  });
}

module.exports = { criarApp };
