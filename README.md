# BotTask


## Serviços:

- **missoes**: cadastro, listagem e conclusão de missões
- **pontuacao**: XP e nível de cada usuário
- **conquistas**: regras e medalhas
- **frontend**: página web e entrada única da API


## Como abrir o jogo:

1. Va em codespace
2. No **Terminal**, embaixo, digite e aperte Enter:
``
cd bottask
docker compose up --build
``
3. Clique na aba **Portas**.
4. Na linha da porta **8080**, clique no ícone do globo.
5. Digite o seu nome e clique em **Entrar**.


## Como o gerenciador de tarefas funciona:

1. Você digita o nome do seu herói e entra.
2. Aceita missões, que são as suas tarefas. Cada uma pode ser fácil, média ou difícil.
3. Ao cumprir uma missão, ganha pontos: 10 na fácil, 25 na média e 50 na difícil.
4. A cada 100 pontos, você sobe de nível.
5. Algumas medalhas são liberadas sozinhas: ao cumprir 1, 5 e 10 missões, e ao chegar aos níveis 3 e 5.


## Para zerar o jogo: `docker compose down -v`

   
<img width="1595" height="764" alt="image" src="https://github.com/user-attachments/assets/b2fa15db-0eb6-4e68-84a1-bdcbd96f3723" />
