const http = require('node:http');
const { lerCorpo, responder, criarArmazenamento } = require('./util');

const CONQUISTAS = [
  { id: 'primeira-missao', nome: 'Primeiro passo', descricao: 'Conclua 1 missão', ok: (d) => d.concluidas >= 1 },
  { id: 'cinco-missoes', nome: 'Pegando o ritmo', descricao: 'Conclua 5 missões', ok: (d) => d.concluidas >= 5 },
  { id: 'dez-missoes', nome: 'Imparável', descricao: 'Conclua 10 missões', ok: (d) => d.concluidas >= 10 },
  { id: 'nivel-3', nome: 'Aventureiro', descricao: 'Chegue ao nível 3', ok: (d) => d.nivel >= 3 },
  { id: 'nivel-5', nome: 'Veterano', descricao: 'Chegue ao nível 5', ok: (d) => d.nivel >= 5 },
];

function criarApp(opcoes = {}) {
  const armazenamento = criarArmazenamento(opcoes.arquivo, { usuarios: {} });

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const partes = url.pathname.split('/').filter(Boolean);

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return responder(res, 200, { status: 'ok', servico: 'conquistas' });
      }

      if (req.method === 'POST' && url.pathname === '/verificar') {
        const { usuario, concluidas, nivel } = await lerCorpo(req);
        if (!usuario || typeof usuario !== 'string') {
          return responder(res, 400, { erro: 'usuario_obrigatorio' });
        }
        if (!Number.isInteger(concluidas) || concluidas < 0 || !Number.isInteger(nivel) || nivel < 1) {
          return responder(res, 400, { erro: 'dados_invalidos' });
        }
        const ganhas = armazenamento.dados.usuarios[usuario] || [];
        const novas = CONQUISTAS.filter((c) => !ganhas.includes(c.id) && c.ok({ concluidas, nivel }));
        if (novas.length) {
          armazenamento.dados.usuarios[usuario] = ganhas.concat(novas.map((c) => c.id));
          armazenamento.salvar();
        }
        return responder(res, 200, {
          novas: novas.map(({ id, nome, descricao }) => ({ id, nome, descricao })),
        });
      }

      if (req.method === 'GET' && partes[0] === 'conquistas' && partes.length === 2) {
        const usuario = decodeURIComponent(partes[1]);
        const ganhas = armazenamento.dados.usuarios[usuario] || [];
        const lista = CONQUISTAS.map(({ id, nome, descricao }) => ({
          id,
          nome,
          descricao,
          conquistada: ganhas.includes(id),
        }));
        return responder(res, 200, lista);
      }

      return responder(res, 404, { erro: 'rota_nao_encontrada' });
    } catch (erro) {
      if (erro.message === 'json_invalido') return responder(res, 400, { erro: 'json_invalido' });
      return responder(res, 500, { erro: 'erro_interno' });
    }
  });
}

module.exports = { criarApp, CONQUISTAS };
