import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse


class ErroHttp(Exception):
    def __init__(self, status, erro):
        super().__init__(erro)
        self.status = status
        self.erro = erro


class Armazenamento:
    def __init__(self, arquivo, inicial):
        self.arquivo = arquivo
        self.dados = inicial
        if arquivo and os.path.exists(arquivo):
            try:
                with open(arquivo, encoding="utf-8") as f:
                    self.dados = json.load(f)
            except (OSError, ValueError):
                self.dados = inicial

    def salvar(self):
        if not self.arquivo:
            return
        os.makedirs(os.path.dirname(self.arquivo), exist_ok=True)
        with open(self.arquivo, "w", encoding="utf-8") as f:
            json.dump(self.dados, f)


def enviar_json(url, corpo, timeout=5):
    requisicao = urllib.request.Request(
        url,
        data=json.dumps(corpo).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(requisicao, timeout=timeout) as resposta:
        return json.loads(resposta.read())


def criar_servidor(rotear, host="127.0.0.1", porta=0):
    class Handler(BaseHTTPRequestHandler):
        def _tratar(self):
            url = urlparse(self.path)
            partes = [unquote(p) for p in url.path.split("/") if p]
            consulta = parse_qs(url.query)
            try:
                corpo = {}
                if self.command in ("POST", "PUT"):
                    tamanho = int(self.headers.get("Content-Length") or 0)
                    bruto = self.rfile.read(tamanho) if tamanho else b""
                    try:
                        corpo = json.loads(bruto) if bruto else {}
                    except ValueError:
                        raise ErroHttp(400, "json_invalido")
                    if not isinstance(corpo, dict):
                        raise ErroHttp(400, "json_invalido")
                status, resposta = rotear(self.command, partes, consulta, corpo)
            except ErroHttp as erro:
                status, resposta = erro.status, {"erro": erro.erro}
            except Exception:
                status, resposta = 500, {"erro": "erro_interno"}
            self._responder(status, resposta)

        def _responder(self, status, resposta):
            dados = b"" if resposta is None else json.dumps(resposta).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            if dados:
                self.wfile.write(dados)

        do_GET = do_POST = do_PUT = do_DELETE = _tratar

        def log_message(self, *args):
            pass

    return ThreadingHTTPServer((host, porta), Handler)
