const path = require('node:path');
const { criarApp } = require('./app');

const porta = Number(process.env.PORT) || 3001;
const arquivo = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'missoes.json') : null;

criarApp({ arquivo }).listen(porta, () => {
  console.log(`missoes na porta ${porta}`);
});
