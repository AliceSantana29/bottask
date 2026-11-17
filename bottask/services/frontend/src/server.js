const { criarApp } = require('./app');

const porta = Number(process.env.PORT) || 8080;

criarApp().listen(porta, () => {
  console.log(`frontend na porta ${porta}`);
});
