const $ = (id) => document.getElementById(id);
let usuario = localStorage.getItem('bottask_usuario') || '';
let temporizador;

async function chamar(caminho, opcoes) {
  const resposta = await fetch('/api' + caminho, opcoes);
  if (resposta.status === 204) return null;
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(corpo.erro || 'erro');
  return corpo;
}

function enviarJson(metodo, corpo) {
  return {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  };
}

function avisar(texto) {
  const aviso = $('aviso');
  aviso.textContent = texto;
  aviso.classList.add('visivel');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => aviso.classList.remove('visivel'), 3000);
}

function mensagemErro(erro) {
  if (erro.message === 'servico_indisponivel' || erro.message === 'servico_pontuacao_indisponivel') {
    return 'Serviço fora do ar. Tente de novo.';
  }
  return 'Não foi possível concluir a ação.';
}

function mostrarStatus(dados) {
  $('nome-jogador').textContent = dados.usuario;
  $('nivel').textContent = `Nível ${dados.nivel}`;
  $('barra-xp').style.width = `${(dados.xpNoNivel / dados.xpParaProximoNivel) * 100}%`;
  $('texto-xp').textContent = `${dados.xpNoNivel} / ${dados.xpParaProximoNivel} XP (total: ${dados.xp})`;
}

function mostrarMissoes(missoes) {
  const lista = $('lista-missoes');
  lista.replaceChildren();
  $('vazio').hidden = missoes.length > 0;

  const ordenadas = [...missoes].sort((a, b) => Number(a.concluida) - Number(b.concluida));
  for (const missao of ordenadas) {
    const item = document.createElement('li');
    if (missao.concluida) item.className = 'feita';

    const titulo = document.createElement('span');
    titulo.className = 'titulo';
    titulo.textContent = missao.titulo;

    const xp = document.createElement('span');
    xp.className = 'xp';
    xp.textContent = `+${missao.xp} XP`;

    item.append(titulo, xp);

    if (!missao.concluida) {
      const concluir = document.createElement('button');
      concluir.textContent = 'Concluir';
      concluir.addEventListener('click', () => concluirMissao(missao.id));
      item.append(concluir);
    }

    const excluir = document.createElement('button');
    excluir.className = 'secundario';
    excluir.textContent = 'Excluir';
    excluir.addEventListener('click', () => excluirMissao(missao.id));
    item.append(excluir);

    lista.append(item);
  }
}

function mostrarConquistas(conquistas) {
  const lista = $('lista-conquistas');
  lista.replaceChildren();
  for (const c of conquistas) {
    const item = document.createElement('li');
    if (!c.conquistada) item.className = 'bloqueada';
    const nome = document.createElement('strong');
    nome.textContent = c.nome;
    const descricao = document.createElement('span');
    descricao.textContent = c.descricao;
    item.append(nome, descricao);
    lista.append(item);
  }
}

async function carregar() {
  const nome = encodeURIComponent(usuario);
  const [missoes, status, conquistas] = await Promise.all([
    chamar(`/missoes?usuario=${nome}`),
    chamar(`/pontuacao/${nome}`),
    chamar(`/conquistas/${nome}`),
  ]);
  mostrarMissoes(missoes);
  mostrarStatus(status);
  mostrarConquistas(conquistas);
}

async function concluirMissao(id) {
  try {
    const resultado = await chamar(`/missoes/${id}/concluir`, { method: 'PUT' });
    const novas = resultado.novasConquistas.map((c) => c.nome);
    avisar(`+${resultado.missao.xp} XP` + (novas.length ? ` | Nova conquista: ${novas.join(', ')}` : ''));
    await carregar();
  } catch (erro) {
    avisar(mensagemErro(erro));
  }
}

async function excluirMissao(id) {
  try {
    await chamar(`/missoes/${id}`, { method: 'DELETE' });
    await carregar();
  } catch (erro) {
    avisar(mensagemErro(erro));
  }
}

async function entrar(nome) {
  usuario = nome.trim();
  if (!usuario) return;
  localStorage.setItem('bottask_usuario', usuario);
  try {
    await carregar();
    $('painel').hidden = false;
  } catch (erro) {
    avisar(mensagemErro(erro));
  }
}

$('form-usuario').addEventListener('submit', (evento) => {
  evento.preventDefault();
  entrar($('usuario').value);
});

$('form-missao').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    await chamar('/missoes', enviarJson('POST', {
      usuario,
      titulo: $('titulo').value,
      dificuldade: $('dificuldade').value,
    }));
    $('titulo').value = '';
    await carregar();
  } catch (erro) {
    avisar(mensagemErro(erro));
  }
});

if (usuario) {
  $('usuario').value = usuario;
  entrar(usuario);
}
