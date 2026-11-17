import json
import threading
import unittest
import urllib.error
import urllib.request

from src.app import criar_app


def chamar(base, metodo, caminho, corpo=None):
    dados = json.dumps(corpo).encode("utf-8") if corpo is not None else None
    requisicao = urllib.request.Request(
        base + caminho,
        data=dados,
        method=metodo,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(requisicao) as resposta:
            bruto = resposta.read()
            return resposta.status, json.loads(bruto) if bruto else None
    except urllib.error.HTTPError as erro:
        bruto = erro.read()
        return erro.code, json.loads(bruto) if bruto else None


def clientes_ok():
    return {
        "pontuacao": lambda usuario, xp: {"usuario": usuario, "xp": xp, "nivel": 1},
        "conquistas": lambda corpo: {"novas": [{"id": "primeira-missao"}]},
    }


class TesteMissoes(unittest.TestCase):
    def iniciar(self, clientes=None):
        self.servidor = criar_app(clientes=clientes or clientes_ok())
        threading.Thread(target=self.servidor.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.servidor.server_address[1]}"

    def tearDown(self):
        self.servidor.shutdown()
        self.servidor.server_close()

    def test_cria_e_lista_missoes_do_usuario(self):
        self.iniciar()
        status, missao = chamar(
            self.base, "POST", "/missoes", {"usuario": "ana", "titulo": "Estudar", "dificuldade": "media"}
        )
        self.assertEqual(status, 201)
        self.assertEqual(missao["xp"], 25)
        _, lista = chamar(self.base, "GET", "/missoes?usuario=ana")
        self.assertEqual(len(lista), 1)
        _, outra = chamar(self.base, "GET", "/missoes?usuario=bia")
        self.assertEqual(len(outra), 0)

    def test_rejeita_missao_invalida(self):
        self.iniciar()
        status, _ = chamar(self.base, "POST", "/missoes", {"usuario": "ana"})
        self.assertEqual(status, 400)
        status, _ = chamar(
            self.base, "POST", "/missoes", {"usuario": "ana", "titulo": "x", "dificuldade": "impossivel"}
        )
        self.assertEqual(status, 400)

    def test_concluir_envia_xp_correto_e_devolve_conquistas(self):
        chamadas = []

        def pontuacao(usuario, xp):
            chamadas.append(("pontuacao", usuario, xp))
            return {"usuario": usuario, "xp": xp, "nivel": 1}

        def conquistas(corpo):
            chamadas.append(("conquistas", corpo))
            return {"novas": [{"id": "primeira-missao"}]}

        self.iniciar({"pontuacao": pontuacao, "conquistas": conquistas})
        _, missao = chamar(
            self.base, "POST", "/missoes", {"usuario": "ana", "titulo": "Lição", "dificuldade": "dificil"}
        )
        status, corpo = chamar(self.base, "PUT", f"/missoes/{missao['id']}/concluir")
        self.assertEqual(status, 200)
        self.assertTrue(corpo["missao"]["concluida"])
        self.assertEqual(len(corpo["novasConquistas"]), 1)
        self.assertEqual(chamadas[0], ("pontuacao", "ana", 50))
        self.assertEqual(chamadas[1][1]["concluidas"], 1)

    def test_nao_conclui_duas_vezes(self):
        self.iniciar()
        _, missao = chamar(self.base, "POST", "/missoes", {"usuario": "ana", "titulo": "Lição"})
        chamar(self.base, "PUT", f"/missoes/{missao['id']}/concluir")
        status, _ = chamar(self.base, "PUT", f"/missoes/{missao['id']}/concluir")
        self.assertEqual(status, 409)

    def test_mantem_pendente_se_pontuacao_fora_do_ar(self):
        def falha(usuario, xp):
            raise RuntimeError("fora do ar")

        self.iniciar({"pontuacao": falha, "conquistas": lambda corpo: {"novas": []}})
        _, missao = chamar(self.base, "POST", "/missoes", {"usuario": "ana", "titulo": "Lição"})
        status, _ = chamar(self.base, "PUT", f"/missoes/{missao['id']}/concluir")
        self.assertEqual(status, 502)
        _, lista = chamar(self.base, "GET", "/missoes?usuario=ana")
        self.assertFalse(lista[0]["concluida"])

    def test_exclui_missao(self):
        self.iniciar()
        _, missao = chamar(self.base, "POST", "/missoes", {"usuario": "ana", "titulo": "Lição"})
        status, _ = chamar(self.base, "DELETE", f"/missoes/{missao['id']}")
        self.assertEqual(status, 204)
        status, _ = chamar(self.base, "DELETE", f"/missoes/{missao['id']}")
        self.assertEqual(status, 404)

    def test_health(self):
        self.iniciar()
        status, _ = chamar(self.base, "GET", "/health")
        self.assertEqual(status, 200)


if __name__ == "__main__":
    unittest.main()
