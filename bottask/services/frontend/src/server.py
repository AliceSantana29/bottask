import os

from .app import criar_app

porta = int(os.environ.get("PORT", 8080))

servidor = criar_app(host="0.0.0.0", porta=porta)
print(f"frontend na porta {porta}", flush=True)
servidor.serve_forever()
