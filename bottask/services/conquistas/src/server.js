const path = require('node:path');
const { criarApp } = require('./app');

const porta = Number(process.env.PORT) || 3003;
const arquivo = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'conquistas.json') : null;

criarApp({ arquivo }).listen(porta, () => {
  console.log(`conquistas na porta ${porta}`);
});
