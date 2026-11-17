import threading

from .util import Armazenamento, ErroHttp, criar_servidor

CONQUISTAS = [
    {"id": "primeira-missao", "nome": "Primeiro passo", "descricao": "Conclua 1 missão",
     "ok": lambda d: d["concluidas"] >= 1},
    {"id": "cinco-missoes", "nome": "Pegando o ritmo", "descricao": "Conclua 5 missões",
     "ok": lambda d: d["concluidas"] >= 5},
    {"id": "dez-missoes", "nome": "Imparável", "descricao": "Conclua 10 missões",
     "ok": lambda d: d["concluidas"] >= 10},
    {"id": "nivel-3", "nome": "Aventureiro", "descricao": "Chegue ao nível 3",
     "ok": lambda d: d["nivel"] >= 3},
    {"id": "nivel-5", "nome": "Veterano", "descricao": "Chegue ao nível 5",
     "ok": lambda d: d["nivel"] >= 5},
]


def inteiro(valor):
    return isinstance(valor, int) and not isinstance(valor, bool)


def publica(conquista):
    return {k: conquista[k] for k in ("id", "nome", "descricao")}


def criar_app(host="127.0.0.1", porta=0, arquivo=None):
    armazenamento = Armazenamento(arquivo, {"usuarios": {}})
    trava = threading.RLock()

    def verificar(corpo):
        usuario = corpo.get("usuario")
        concluidas = corpo.get("concluidas")
        nivel = corpo.get("nivel")
        if not isinstance(usuario, str) or not usuario.strip():
            raise ErroHttp(400, "usuario_obrigatorio")
        if not inteiro(concluidas) or concluidas < 0 or not inteiro(nivel) or nivel < 1:
            raise ErroHttp(400, "dados_invalidos")
        ganhas = armazenamento.dados["usuarios"].get(usuario, [])
        dados = {"concluidas": concluidas, "nivel": nivel}
        novas = [c for c in CONQUISTAS if c["id"] not in ganhas and c["ok"](dados)]
        if novas:
            armazenamento.dados["usuarios"][usuario] = ganhas + [c["id"] for c in novas]
            armazenamento.salvar()
        return 200, {"novas": [publica(c) for c in novas]}

    def listar(usuario):
        ganhas = armazenamento.dados["usuarios"].get(usuario, [])
        return 200, [dict(publica(c), conquistada=c["id"] in ganhas) for c in CONQUISTAS]

    def rotear(metodo, partes, consulta, corpo):
        with trava:
            if metodo == "GET" and partes == ["health"]:
                return 200, {"status": "ok", "servico": "conquistas"}
            if metodo == "POST" and partes == ["verificar"]:
                return verificar(corpo)
            if metodo == "GET" and len(partes) == 2 and partes[0] == "conquistas":
                return listar(partes[1])
            raise ErroHttp(404, "rota_nao_encontrada")

    return criar_servidor(rotear, host, porta)
