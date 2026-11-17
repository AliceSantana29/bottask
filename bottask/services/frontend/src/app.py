import http.client
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

PUBLICO = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "public"))

TIPOS = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


def urls_padrao():
    return {
        "missoes": os.environ.get("MISSOES_URL", "http://localhost:3001"),
        "pontuacao": os.environ.get("PONTUACAO_URL", "http://localhost:3002"),
        "conquistas": os.environ.get("CONQUISTAS_URL", "http://localhost:3003"),
    }


def criar_app(host="127.0.0.1", porta=0, urls=None):
    urls = {**urls_padrao(), **(urls or {})}
    rotas = [
        ("/api/missoes", urls["missoes"], "/missoes"),
        ("/api/pontuacao", urls["pontuacao"], "/xp"),
        ("/api/conquistas", urls["conquistas"], "/conquistas"),
    ]

    class Handler(BaseHTTPRequestHandler):
        def _tratar(self):
            url = urlparse(self.path)
            if url.path == "/health":
                return self._json(200, {"status": "ok", "servico": "frontend"})

            for prefixo, base, destino in rotas:
                if url.path == prefixo or url.path.startswith(prefixo + "/"):
                    caminho = destino + url.path[len(prefixo):]
                    if url.query:
                        caminho += "?" + url.query
                    return self._encaminhar(base, caminho)

            if self.command != "GET":
                self.send_response(405)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            self._estatico(url.path)

        def _json(self, status, corpo):
            dados = json.dumps(corpo).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            self.wfile.write(dados)

        def _encaminhar(self, base, caminho):
            alvo = urlparse(base)
            tamanho = int(self.headers.get("Content-Length") or 0)
            corpo = self.rfile.read(tamanho) if tamanho else None
            cabecalhos = {}
            if self.headers.get("Content-Type"):
                cabecalhos["Content-Type"] = self.headers["Content-Type"]
            try:
                conexao = http.client.HTTPConnection(alvo.hostname, alvo.port, timeout=10)
                conexao.request(self.command, caminho, body=corpo, headers=cabecalhos)
                resposta = conexao.getresponse()
                dados = resposta.read()
                conexao.close()
            except (OSError, http.client.HTTPException):
                return self._json(502, {"erro": "servico_indisponivel"})

            self.send_response(resposta.status)
            tipo = resposta.getheader("Content-Type")
            if tipo:
                self.send_header("Content-Type", tipo)
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            if resposta.status != 204:
                self.wfile.write(dados)

        def _estatico(self, caminho):
            relativo = unquote(caminho)
            if relativo == "/":
                relativo = "/index.html"
            completo = os.path.realpath(os.path.join(PUBLICO, relativo.lstrip("/")))
            if not completo.startswith(PUBLICO + os.sep) or not os.path.isfile(completo):
                dados = b"nao encontrado"
                self.send_response(404)
                self.send_header("Content-Length", str(len(dados)))
                self.end_headers()
                self.wfile.write(dados)
                return
            with open(completo, "rb") as arquivo:
                dados = arquivo.read()
            tipo = TIPOS.get(os.path.splitext(completo)[1], "application/octet-stream")
            self.send_response(200)
            self.send_header("Content-Type", tipo)
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            self.wfile.write(dados)

        do_GET = do_POST = do_PUT = do_DELETE = _tratar

        def log_message(self, *args):
            pass

    return ThreadingHTTPServer((host, porta), Handler)
