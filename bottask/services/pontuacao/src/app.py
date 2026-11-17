import threading

from .util import Armazenamento, ErroHttp, criar_servidor

XP_POR_NIVEL = 100


def resumo(usuario, xp):
    return {
        "usuario": usuario,
        "xp": xp,
        "nivel": xp // XP_POR_NIVEL + 1,
        "xpNoNivel": xp % XP_POR_NIVEL,
        "xpParaProximoNivel": XP_POR_NIVEL,
    }


def criar_app(host="127.0.0.1", porta=0, arquivo=None):
    armazenamento = Armazenamento(arquivo, {"usuarios": {}})
    trava = threading.RLock()

    def somar(corpo):
        usuario = corpo.get("usuario")
        xp = corpo.get("xp")
        if not isinstance(usuario, str) or not usuario.strip():
            raise ErroHttp(400, "usuario_obrigatorio")
        if isinstance(xp, bool) or not isinstance(xp, int) or xp <= 0 or xp > 1000:
            raise ErroHttp(400, "xp_invalido")
        total = armazenamento.dados["usuarios"].get(usuario, 0) + xp
        armazenamento.dados["usuarios"][usuario] = total
        armazenamento.salvar()
        return 200, resumo(usuario, total)

    def ranking():
        itens = [resumo(u, xp) for u, xp in armazenamento.dados["usuarios"].items()]
        itens.sort(key=lambda item: item["xp"], reverse=True)
        return 200, itens[:10]

    def rotear(metodo, partes, consulta, corpo):
        with trava:
            if metodo == "GET" and partes == ["health"]:
                return 200, {"status": "ok", "servico": "pontuacao"}
            if metodo == "POST" and partes == ["xp"]:
                return somar(corpo)
            if metodo == "GET" and partes == ["xp"]:
                return ranking()
            if metodo == "GET" and len(partes) == 2 and partes[0] == "xp":
                usuario = partes[1]
                return 200, resumo(usuario, armazenamento.dados["usuarios"].get(usuario, 0))
            raise ErroHttp(404, "rota_nao_encontrada")

    return criar_servidor(rotear, host, porta)
