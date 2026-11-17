# BotTask

Gerenciador de tarefas estilo RPG feito com microsserviços em Python.

## Serviços

- **missoes**: cadastro, listagem e conclusão de missões
- **pontuacao**: XP e nível de cada usuário
- **conquistas**: regras e medalhas
- **frontend**: página web e entrada única da API

Ao concluir uma missão: frontend, missoes, pontuacao (soma o XP) e conquistas (libera medalhas).

## Como rodar

1. `cd bottask`
2. `docker compose up --build`
3. Abrir http://localhost:8080

## Testes

`bash bottask/scripts/testar.sh`

## CI/CD

A esteira fica em `.github/workflows/ci.yml`. Ela testa cada serviço, sobe tudo com Docker Compose e publica as imagens no GitHub Packages.
