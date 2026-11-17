const http = require('node:http');
const { lerCorpo, responder, criarArmazenamento } = require('./util');

const XP_POR_NIVEL = 100;

function resumo(usuario, xp) {
  const nivel = Math.floor(xp / XP_POR_NIVEL) + 1;
  return {
    usuario,
    xp,
    nivel,
    xpNoNivel: xp % XP_POR_NIVEL,
    xpParaProximoNivel: XP_POR_NIVEL,
  };
}

function criarApp(opcoes = {}) {
  const armazenamento = criarArmazenamento(opcoes.arquivo, { usuarios: {} });

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const partes = url.pathname.split('/').filter(Boolean);

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return responder(res, 200, { status: 'ok', servico: 'pontuacao' });
      }

      if (req.method === 'POST' && url.pathname === '/xp') {
        const { usuario, xp } = await lerCorpo(req);
        if (!usuario || typeof usuario !== 'string') {
          return responder(res, 400, { erro: 'usuario_obrigatorio' });
        }
        if (!Number.isInteger(xp) || xp <= 0 || xp > 1000) {
          return responder(res, 400, { erro: 'xp_invalido' });
        }
        const atual = armazenamento.dados.usuarios[usuario] || 0;
        armazenamento.dados.usuarios[usuario] = atual + xp;
        armazenamento.salvar();
        return responder(res, 200, resumo(usuario, atual + xp));
      }

      if (req.method === 'GET' && url.pathname === '/xp') {
        const ranking = Object.entries(armazenamento.dados.usuarios)
          .map(([usuario, xp]) => resumo(usuario, xp))
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 10);
        return responder(res, 200, ranking);
      }

      if (req.method === 'GET' && partes[0] === 'xp' && partes.length === 2) {
        const usuario = decodeURIComponent(partes[1]);
        return responder(res, 200, resumo(usuario, armazenamento.dados.usuarios[usuario] || 0));
      }

      return responder(res, 404, { erro: 'rota_nao_encontrada' });
    } catch (erro) {
      if (erro.message === 'json_invalido') return responder(res, 400, { erro: 'json_invalido' });
      return responder(res, 500, { erro: 'erro_interno' });
    }
  });
}

module.exports = { criarApp, resumo, XP_POR_NIVEL };
