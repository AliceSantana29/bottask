# BotTask

Gerenciador de tarefas estilo RPG. Cada tarefa é uma missão que rende XP, o XP sobe o nível e certos marcos liberam conquistas.

Backend em Python 3.12, usando apenas a biblioteca padrão. Frontend em HTML, CSS e JavaScript.

## Arquitetura

| Serviço | Porta | Função |
|---|---|---|
| frontend | 8080 | Página web e entrada única da API (`/api/...`) |
| missoes | 3001 | Cadastro, listagem, conclusão e exclusão de missões |
| pontuacao | 3002 | XP acumulado e nível por usuário, ranking |
| conquistas | 3003 | Regras e registro das medalhas |

Fluxo ao concluir uma missão: `frontend` → `missoes` → `pontuacao` (soma o XP) → `conquistas` (verifica medalhas novas).

Cada serviço tem código, testes, Dockerfile e dados próprios.

## Regras

- Fácil: 10 XP, Média: 25 XP, Difícil: 50 XP
- 100 XP por nível
- Conquistas: 1, 5 e 10 missões concluídas; níveis 3 e 5

## Rodar com Docker

```bash
docker compose up --build
```

Abrir http://localhost:8080

## Rodar sem Docker

Em quatro terminais, a partir da raiz do projeto:

```bash
cd services/pontuacao && python3 -m src.server
cd services/conquistas && python3 -m src.server
cd services/missoes && python3 -m src.server
cd services/frontend && python3 -m src.server
```

## Testes

```bash
bash scripts/testar.sh
```

Teste de ponta a ponta (com os serviços no ar):

```bash
bash scripts/smoke.sh http://localhost:8080
```

## API

```
GET    /api/missoes?usuario=ana
POST   /api/missoes                 {"usuario","titulo","dificuldade"}
PUT    /api/missoes/:id/concluir
DELETE /api/missoes/:id
GET    /api/pontuacao/:usuario
GET    /api/pontuacao               ranking
GET    /api/conquistas/:usuario
```

## CI/CD

Arquivo: `.github/workflows/ci.yml`

1. `testes`: roda os testes de cada serviço, em paralelo
2. `integracao`: sobe tudo com `docker compose` e executa `scripts/smoke.sh`
3. `publicar`: em push na `main`, gera as imagens Docker e envia para o GitHub Container Registry (`ghcr.io`)

## Variáveis de ambiente

| Variável | Serviço | Padrão |
|---|---|---|
| PORT | todos | porta da tabela acima |
| DATA_DIR | missoes, pontuacao, conquistas | vazio (dados só em memória) |
| PONTUACAO_URL | missoes, frontend | http://localhost:3002 |
| CONQUISTAS_URL | missoes, frontend | http://localhost:3003 |
| MISSOES_URL | frontend | http://localhost:3001 |
