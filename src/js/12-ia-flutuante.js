/* =========================================================
   12-ia-flutuante.js
   Painel flutuante da IA, acessível a partir de qualquer aba do app.
   ========================================================= */

/* =========================================================
   IA FLUTUANTE — SUPORTE RÁPIDO EM QUALQUER TELA
   ========================================================= */
function abrirIAFlutuante() {
  const painel = document.getElementById('iaFloatPanel');
  const btn = document.getElementById('iaFloatBtn');
  if (!painel) return;
  painel.classList.remove('hidden');
  if (btn) btn.classList.add('hidden');
  atualizarEstadoIAFlutuante();
  renderizarMensagensIA();
  scrollIAChat();
  const input = document.getElementById('iaFloatInput');
  if (input) setTimeout(() => input.focus(), 150);
}

function fecharIAFlutuante() {
  const painel = document.getElementById('iaFloatPanel');
  const btn = document.getElementById('iaFloatBtn');
  if (painel) painel.classList.add('hidden');
  if (btn) btn.classList.remove('hidden');
}

function atualizarEstadoIAFlutuante() {
  const chave = localStorage.getItem('cofrinho_apiKey');
  const noKey = document.getElementById('iaFloatNoKey');
  const chatContainer = document.getElementById('iaFloatChatContainer');
  const inputRow = document.getElementById('iaFloatInputRow');
  if (!noKey || !chatContainer || !inputRow) return;

  if (!chave) {
    noKey.classList.remove('hidden');
    chatContainer.style.display = 'none';
    inputRow.style.display = 'none';
  } else {
    noKey.classList.add('hidden');
    chatContainer.style.display = '';
    inputRow.style.display = '';
  }
}

function irParaConfigViaFlutuante() {
  fecharIAFlutuante();
  mudarAba('config');
}

