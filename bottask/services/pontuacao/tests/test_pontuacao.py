import json
import threading
import unittest
import urllib.error
import urllib.request

from src.app import criar_app, resumo


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
            return resposta.status, json.loads(resposta.read())
    except urllib.error.HTTPError as erro:
        return erro.code, json.loads(erro.read())


class TestePontuacao(unittest.TestCase):
    def setUp(self):
        self.servidor = criar_app()
        threading.Thread(target=self.servidor.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.servidor.server_address[1]}"

    def tearDown(self):
        self.servidor.shutdown()
        self.servidor.server_close()

    def test_calcula_nivel_a_cada_100_xp(self):
        self.assertEqual(resumo("a", 0)["nivel"], 1)
        self.assertEqual(resumo("a", 99)["nivel"], 1)
        self.assertEqual(resumo("a", 100)["nivel"], 2)
        self.assertEqual(resumo("a", 250)["nivel"], 3)
        self.assertEqual(resumo("a", 250)["xpNoNivel"], 50)

    def test_soma_xp_e_sobe_de_nivel(self):
        chamar(self.base, "POST", "/xp", {"usuario": "ana", "xp": 60})
        status, corpo = chamar(self.base, "POST", "/xp", {"usuario": "ana", "xp": 50})
        self.assertEqual(status, 200)
        self.assertEqual(corpo["xp"], 110)
        self.assertEqual(corpo["nivel"], 2)

    def test_usuario_novo_comeca_zerado(self):
        _, corpo = chamar(self.base, "GET", "/xp/novato")
        self.assertEqual(corpo["xp"], 0)
        self.assertEqual(corpo["nivel"], 1)

    def test_rejeita_xp_invalido(self):
        for xp in [0, -5, 1.5, "10", 5000, True]:
            status, _ = chamar(self.base, "POST", "/xp", {"usuario": "ana", "xp": xp})
            self.assertEqual(status, 400, xp)
        status, _ = chamar(self.base, "POST", "/xp", {"xp": 10})
        self.assertEqual(status, 400)

    def test_ranking_ordena_por_xp(self):
        chamar(self.base, "POST", "/xp", {"usuario": "ana", "xp": 10})
        chamar(self.base, "POST", "/xp", {"usuario": "bia", "xp": 50})
        _, ranking = chamar(self.base, "GET", "/xp")
        self.assertEqual(ranking[0]["usuario"], "bia")


if __name__ == "__main__":
    unittest.main()
