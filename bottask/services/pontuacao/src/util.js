const fs = require('node:fs');
const path = require('node:path');

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (parte) => {
      dados += parte;
      if (dados.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      if (!dados) return resolve({});
      try {
        resolve(JSON.parse(dados));
      } catch {
        reject(new Error('json_invalido'));
      }
    });
    req.on('error', reject);
  });
}

function responder(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corpo));
}

function criarArmazenamento(arquivo, inicial) {
  let dados = inicial;
  if (arquivo && fs.existsSync(arquivo)) {
    try {
      dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    } catch {
      dados = inicial;
    }
  }
  return {
    dados,
    salvar() {
      if (!arquivo) return;
      fs.mkdirSync(path.dirname(arquivo), { recursive: true });
      fs.writeFileSync(arquivo, JSON.stringify(dados));
    },
  };
}

module.exports = { lerCorpo, responder, criarArmazenamento };
