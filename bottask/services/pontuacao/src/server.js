const path = require('node:path');
const { criarApp } = require('./app');

const porta = Number(process.env.PORT) || 3002;
const arquivo = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'pontuacao.json') : null;

criarApp({ arquivo }).listen(porta, () => {
  console.log(`pontuacao na porta ${porta}`);
});
