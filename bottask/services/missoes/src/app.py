import os
import threading
import uuid
from datetime import datetime, timezone

from .util import Armazenamento, ErroHttp, criar_servidor, enviar_json

XP_POR_DIFICULDADE = {"facil": 10, "media": 25, "dificil": 50}


def clientes_padrao():
    pontuacao = os.environ.get("PONTUACAO_URL", "http://localhost:3002")
    conquistas = os.environ.get("CONQUISTAS_URL", "http://localhost:3003")
    return {
        "pontuacao": lambda usuario, xp: enviar_json(
            f"{pontuacao}/xp", {"usuario": usuario, "xp": xp}
        ),
        "conquistas": lambda corpo: enviar_json(f"{conquistas}/verificar", corpo),
    }


def agora():
    return datetime.now(timezone.utc).isoformat()


def texto_valido(valor):
    return isinstance(valor, str) and valor.strip() != ""


def criar_app(host="127.0.0.1", porta=0, arquivo=None, clientes=None):
    armazenamento = Armazenamento(arquivo, {"missoes": []})
    clientes = clientes or clientes_padrao()
    trava = threading.RLock()

    def listar(consulta):
        usuario = consulta.get("usuario", [None])[0]
        if not usuario:
            raise ErroHttp(400, "usuario_obrigatorio")
        return 200, [m for m in armazenamento.dados["missoes"] if m["usuario"] == usuario]

    def criar(corpo):
        usuario = corpo.get("usuario")
        titulo = corpo.get("titulo")
        dificuldade = corpo.get("dificuldade", "facil")
        if not texto_valido(usuario):
            raise ErroHttp(400, "usuario_obrigatorio")
        if not texto_valido(titulo):
            raise ErroHttp(400, "titulo_obrigatorio")
        if not isinstance(dificuldade, str) or dificuldade not in XP_POR_DIFICULDADE:
            raise ErroHttp(400, "dificuldade_invalida")
        missao = {
            "id": str(uuid.uuid4()),
            "usuario": usuario.strip(),
            "titulo": titulo.strip(),
            "dificuldade": dificuldade,
            "xp": XP_POR_DIFICULDADE[dificuldade],
            "concluida": False,
            "criadaEm": agora(),
            "concluidaEm": None,
        }
        armazenamento.dados["missoes"].append(missao)
        armazenamento.salvar()
        return 201, missao

    def buscar(id_missao):
        for missao in armazenamento.dados["missoes"]:
            if missao["id"] == id_missao:
                return missao
        raise ErroHttp(404, "missao_nao_encontrada")

    def concluir(id_missao):
        missao = buscar(id_missao)
        if missao["concluida"]:
            raise ErroHttp(409, "missao_ja_concluida")

        try:
            pontuacao = clientes["pontuacao"](missao["usuario"], missao["xp"])
        except Exception:
            raise ErroHttp(502, "servico_pontuacao_indisponivel")

        concluidas = 1 + sum(
            1
            for m in armazenamento.dados["missoes"]
            if m["usuario"] == missao["usuario"] and m["concluida"]
        )

        try:
            resultado = clientes["conquistas"](
                {
                    "usuario": missao["usuario"],
                    "concluidas": concluidas,
                    "nivel": pontuacao["nivel"],
                }
            )
            novas = resultado.get("novas", [])
        except Exception:
            novas = []

        missao["concluida"] = True
        missao["concluidaEm"] = agora()
        armazenamento.salvar()
        return 200, {"missao": missao, "pontuacao": pontuacao, "novasConquistas": novas}

    def excluir(id_missao):
        missao = buscar(id_missao)
        armazenamento.dados["missoes"].remove(missao)
        armazenamento.salvar()
        return 204, None

    def rotear(metodo, partes, consulta, corpo):
        with trava:
            if metodo == "GET" and partes == ["health"]:
                return 200, {"status": "ok", "servico": "missoes"}
            if not partes or partes[0] != "missoes":
                raise ErroHttp(404, "rota_nao_encontrada")
            if metodo == "GET" and len(partes) == 1:
                return listar(consulta)
            if metodo == "POST" and len(partes) == 1:
                return criar(corpo)
            if metodo == "PUT" and len(partes) == 3 and partes[2] == "concluir":
                return concluir(partes[1])
            if metodo == "DELETE" and len(partes) == 2:
                return excluir(partes[1])
            raise ErroHttp(404, "rota_nao_encontrada")

    return criar_servidor(rotear, host, porta)
