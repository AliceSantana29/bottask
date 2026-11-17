const http = require('node:http');
const crypto = require('node:crypto');
const { lerCorpo, responder, criarArmazenamento } = require('./util');

const XP_POR_DIFICULDADE = { facil: 10, media: 25, dificil: 50 };

async function enviar(url, corpo) {
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new Error('falha_servico');
  return resposta.json();
}

function clientesPadrao() {
  const pontuacao = process.env.PONTUACAO_URL || 'http://localhost:3002';
  const conquistas = process.env.CONQUISTAS_URL || 'http://localhost:3003';
  return {
    pontuacao: (usuario, xp) => enviar(`${pontuacao}/xp`, { usuario, xp }),
    conquistas: (corpo) => enviar(`${conquistas}/verificar`, corpo),
  };
}

function criarApp(opcoes = {}) {
  const armazenamento = criarArmazenamento(opcoes.arquivo, { missoes: [] });
  const clientes = opcoes.clientes || clientesPadrao();

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const partes = url.pathname.split('/').filter(Boolean);

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return responder(res, 200, { status: 'ok', servico: 'missoes' });
      }
      if (partes[0] !== 'missoes') {
        return responder(res, 404, { erro: 'rota_nao_encontrada' });
      }

      if (req.method === 'GET' && partes.length === 1) {
        const usuario = url.searchParams.get('usuario');
        if (!usuario) return responder(res, 400, { erro: 'usuario_obrigatorio' });
        const lista = armazenamento.dados.missoes.filter((m) => m.usuario === usuario);
        return responder(res, 200, lista);
      }

      if (req.method === 'POST' && partes.length === 1) {
        const { usuario, titulo, dificuldade = 'facil' } = await lerCorpo(req);
        if (!usuario || typeof usuario !== 'string') {
          return responder(res, 400, { erro: 'usuario_obrigatorio' });
        }
        if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
          return responder(res, 400, { erro: 'titulo_obrigatorio' });
        }
        if (!(dificuldade in XP_POR_DIFICULDADE)) {
          return responder(res, 400, { erro: 'dificuldade_invalida' });
        }
        const missao = {
          id: crypto.randomUUID(),
          usuario: usuario.trim(),
          titulo: titulo.trim(),
          dificuldade,
          xp: XP_POR_DIFICULDADE[dificuldade],
          concluida: false,
          criadaEm: new Date().toISOString(),
          concluidaEm: null,
        };
        armazenamento.dados.missoes.push(missao);
        armazenamento.salvar();
        return responder(res, 201, missao);
      }

      if (req.method === 'PUT' && partes.length === 3 && partes[2] === 'concluir') {
        const missao = armazenamento.dados.missoes.find((m) => m.id === partes[1]);
        if (!missao) return responder(res, 404, { erro: 'missao_nao_encontrada' });
        if (missao.concluida) return responder(res, 409, { erro: 'missao_ja_concluida' });

        let pontuacao;
        try {
          pontuacao = await clientes.pontuacao(missao.usuario, missao.xp);
        } catch {
          return responder(res, 502, { erro: 'servico_pontuacao_indisponivel' });
        }

        const concluidas =
          armazenamento.dados.missoes.filter((m) => m.usuario === missao.usuario && m.concluida)
            .length + 1;

        let novasConquistas = [];
        try {
          const resultado = await clientes.conquistas({
            usuario: missao.usuario,
            concluidas,
            nivel: pontuacao.nivel,
          });
          novasConquistas = resultado.novas || [];
        } catch {
          novasConquistas = [];
        }

        missao.concluida = true;
        missao.concluidaEm = new Date().toISOString();
        armazenamento.salvar();
        return responder(res, 200, { missao, pontuacao, novasConquistas });
      }

      if (req.method === 'DELETE' && partes.length === 2) {
        const indice = armazenamento.dados.missoes.findIndex((m) => m.id === partes[1]);
        if (indice === -1) return responder(res, 404, { erro: 'missao_nao_encontrada' });
        armazenamento.dados.missoes.splice(indice, 1);
        armazenamento.salvar();
        res.writeHead(204);
        return res.end();
      }

      return responder(res, 404, { erro: 'rota_nao_encontrada' });
    } catch (erro) {
      if (erro.message === 'json_invalido') return responder(res, 400, { erro: 'json_invalido' });
      return responder(res, 500, { erro: 'erro_interno' });
    }
  });
}

module.exports = { criarApp, XP_POR_DIFICULDADE };
