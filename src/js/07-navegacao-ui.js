/* =========================================================
   07-navegacao-ui.js
   Navegação entre abas, máscara de valores monetários nos inputs, pequenas animações de feedback visual e atualização do valor já investido.
   ========================================================= */

/* =========================================================
   NAVEGAÇÃO POR ABAS
   ========================================================= */
function mudarAba(aba) {
  abaAtual = aba;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tabnav button').forEach(b => b.classList.remove('active'));

  const pagina = document.getElementById(`page-${aba}`);
  const botao = document.querySelector(`.tabnav button[data-tab="${aba}"]`);
  if (pagina) pagina.classList.add('active');
  if (botao) botao.classList.add('active');

  if (aba === 'dashboard') atualizarDashboard();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Esconde o botão flutuante quando o usuário já está na aba de IA (evita redundância)
  const fabIA = document.getElementById('iaFloatBtn');
  if (fabIA) fabIA.classList.toggle('hidden-page-ia', aba === 'ia');
  if (typeof fecharIAFlutuante === 'function') fecharIAFlutuante();
}

/* =========================================================
   MÁSCARA MONETÁRIA
   ========================================================= */
function aplicarMascaraMoeda(input) {
  let digitos = input.value.replace(/\D/g, '');
  if (digitos === '') { input.value = ''; return; }
  digitos = digitos.replace(/^0+(?=\d)/, '');
  const numero = Number(digitos) / 100;
  input.value = numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function valorMascaraParaNumero(valorTexto) {
  if (!valorTexto) return 0;
  const limpo = valorTexto.toString().replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  return parseFloat(limpo) || 0;
}

function inicializarMascarasMonetarias() {
  document.querySelectorAll('input[data-money]').forEach(input => {
    input.addEventListener('input', () => aplicarMascaraMoeda(input));
  });
}

/* =========================================================
   FEEDBACK VISUAL
   ========================================================= */
function pulsarElemento(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('pulse-save');
  void el.offsetWidth;
  el.classList.add('pulse-save');
}

/* =========================================================
   VALOR JÁ INVESTIDO / RENTABILIDADE
   ========================================================= */
function salvarValorInvestidoAtual() {
  const inputValor = document.getElementById('inputValorInvestidoAtual');
  const inputTaxa = document.getElementById('inputTaxaRentabilidade');

  const valor = valorMascaraParaNumero(inputValor.value);
  const taxa = parseFloat(inputTaxa.value);
  const taxaValida = !isNaN(taxa) && taxa >= 0;

  if (valor < 0) {
    mostrarToast('O valor já investido não pode ser negativo.');
    return;
  }
  if (!taxaValida) {
    mostrarToast('Informe uma rentabilidade mensal válida (ex: 0,8 para 0,8% ao mês).');
    inputTaxa.focus();
    return;
  }

  const valorAnterior = estado.valorInvestidoAtual;
  estado.valorInvestidoAtual = valor;
  estado.taxaRentabilidade = taxa;

  salvarDados();
  document.getElementById('valorInvestidoAtualDisplay').textContent = formatarMoeda(valor);
  pulsarElemento('valorInvestidoAtualDisplay');

  if (valor !== valorAnterior) {
    registrarAtividade('aporte', 'Valor já investido atualizado', valor);
    renderizarAtividades();
  }

  atualizarDashboard();
  mostrarToast('Valores de investimento salvos!', 'success');
}

