import http.client
import threading
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from src.app import criar_app


def subir(servidor):
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{servidor.server_address[1]}"


def parar(servidor):
    servidor.shutdown()
    servidor.server_close()


class TesteFrontend(unittest.TestCase):
    def test_serve_a_pagina_inicial(self):
        servidor = criar_app()
        base = subir(servidor)
        try:
            with urllib.request.urlopen(base + "/") as resposta:
                self.assertEqual(resposta.status, 200)
                self.assertIn("BotTask", resposta.read().decode("utf-8"))
        finally:
            parar(servidor)

    def test_encaminha_chamadas_de_api_para_os_servicos(self):
        recebidos = []

        class Origem(BaseHTTPRequestHandler):
            def do_GET(self):
                recebidos.append(self.path)
                corpo = b'{"ok": true}'
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(corpo)))
                self.end_headers()
                self.wfile.write(corpo)

            def log_message(self, *args):
                pass

        origem = ThreadingHTTPServer(("127.0.0.1", 0), Origem)
        base_origem = subir(origem)
        servidor = criar_app(
            urls={"missoes": base_origem, "pontuacao": base_origem, "conquistas": base_origem}
        )
        base = subir(servidor)
        try:
            for caminho in ("/api/missoes?usuario=ana", "/api/pontuacao/ana", "/api/conquistas/ana"):
                urllib.request.urlopen(base + caminho).read()
            self.assertEqual(recebidos, ["/missoes?usuario=ana", "/xp/ana", "/conquistas/ana"])
        finally:
            parar(servidor)
            parar(origem)

    def test_responde_502_quando_servico_esta_fora_do_ar(self):
        morto = "http://127.0.0.1:1"
        servidor = criar_app(urls={"missoes": morto, "pontuacao": morto, "conquistas": morto})
        base = subir(servidor)
        try:
            with self.assertRaises(urllib.error.HTTPError) as contexto:
                urllib.request.urlopen(base + "/api/missoes?usuario=ana")
            self.assertEqual(contexto.exception.code, 502)
        finally:
            parar(servidor)

    def test_bloqueia_acesso_fora_da_pasta_publica(self):
        servidor = criar_app()
        subir(servidor)
        try:
            conexao = http.client.HTTPConnection("127.0.0.1", servidor.server_address[1])
            conexao.request("GET", "/%2e%2e/src/app.py")
            self.assertEqual(conexao.getresponse().status, 404)
            conexao.close()
        finally:
            parar(servidor)


if __name__ == "__main__":
    unittest.main()
