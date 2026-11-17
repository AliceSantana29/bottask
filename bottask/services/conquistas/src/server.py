import os

from .app import criar_app

porta = int(os.environ.get("PORT", 3003))
diretorio = os.environ.get("DATA_DIR")
arquivo = os.path.join(diretorio, "conquistas.json") if diretorio else None

servidor = criar_app(host="0.0.0.0", porta=porta, arquivo=arquivo)
print(f"conquistas na porta {porta}", flush=True)
servidor.serve_forever()
