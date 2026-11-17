import os

from .app import criar_app

porta = int(os.environ.get("PORT", 3001))
diretorio = os.environ.get("DATA_DIR")
arquivo = os.path.join(diretorio, "missoes.json") if diretorio else None

servidor = criar_app(host="0.0.0.0", porta=porta, arquivo=arquivo)
print(f"missoes na porta {porta}", flush=True)
servidor.serve_forever()
