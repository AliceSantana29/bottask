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
            return resposta.status, json.loads(resposta.read())
    except urllib.error.HTTPError as erro:
        return erro.code, json.loads(erro.read())


class TesteConquistas(unittest.TestCase):
    def setUp(self):
        self.servidor = criar_app()
        threading.Thread(target=self.servidor.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.servidor.server_address[1]}"

    def tearDown(self):
        self.servidor.shutdown()
        self.servidor.server_close()

    def verificar(self, corpo):
        return chamar(self.base, "POST", "/verificar", corpo)

    def test_libera_primeira_medalha_com_uma_missao(self):
        _, corpo = self.verificar({"usuario": "ana", "concluidas": 1, "nivel": 1})
        self.assertEqual([c["id"] for c in corpo["novas"]], ["primeira-missao"])

    def test_nao_repete_medalha_ja_conquistada(self):
        self.verificar({"usuario": "ana", "concluidas": 1, "nivel": 1})
        _, corpo = self.verificar({"usuario": "ana", "concluidas": 2, "nivel": 1})
        self.assertEqual(corpo["novas"], [])

    def test_libera_medalhas_de_missoes_e_de_nivel_juntas(self):
        _, corpo = self.verificar({"usuario": "ana", "concluidas": 5, "nivel": 3})
        ids = [c["id"] for c in corpo["novas"]]
        self.assertIn("cinco-missoes", ids)
        self.assertIn("nivel-3", ids)
        self.assertNotIn("dez-missoes", ids)

    def test_lista_medalhas_do_usuario_com_status(self):
        self.verificar({"usuario": "ana", "concluidas": 1, "nivel": 1})
        _, lista = chamar(self.base, "GET", "/conquistas/ana")
        por_id = {c["id"]: c for c in lista}
        self.assertTrue(por_id["primeira-missao"]["conquistada"])
        self.assertFalse(por_id["dez-missoes"]["conquistada"])

    def test_rejeita_dados_invalidos(self):
        status, _ = self.verificar({"concluidas": 1, "nivel": 1})
        self.assertEqual(status, 400)
        status, _ = self.verificar({"usuario": "ana", "concluidas": "x", "nivel": 1})
        self.assertEqual(status, 400)
        status, _ = self.verificar({"usuario": "ana", "concluidas": 1, "nivel": 0})
        self.assertEqual(status, 400)


if __name__ == "__main__":
    unittest.main()
