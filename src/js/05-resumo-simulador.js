/* =========================================================
   05-resumo-simulador.js
   Cálculo de saúde financeira, resumo consolidado (renda x despesas) e o simulador de investimento (percentual a investir).
   ========================================================= */

/* =========================================================
   SAÚDE FINANCEIRA E RESUMO
   ========================================================= */
function atualizarBannerSaude(rendaTotal, totalDespesas, saldoRestante) {
  const banner = document.getElementById('healthBanner');
  const texto = document.getElementById('healthBannerText');
  const icon = banner.querySelector('i');

  banner.className = 'health-banner';

  if (rendaTotal <= 0) {
    banner.classList.add('neutral');
    icon.className = 'fa-solid fa-circle-info';
    texto.textContent = 'Informe seu salário e cadastre despesas para ver sua saúde financeira.';
    return;
  }

  const comprometimento = (totalDespesas / rendaTotal) * 100;

  if (saldoRestante < 0) {
    banner.classList.add('negative');
    icon.className = 'fa-solid fa-circle-exclamation';
    texto.textContent = `Atenção: suas despesas ultrapassam a renda em ${formatarMoeda(Math.abs(saldoRestante))}. Revise seus gastos.`;
  } else if (comprometimento >= 90) {
    banner.classList.add('warning');
    icon.className = 'fa-solid fa-triangle-exclamation';
    texto.textContent = `Cuidado: ${comprometimento.toFixed(0)}% da renda já está comprometido. Sobram apenas ${formatarMoeda(saldoRestante)}.`;
  } else if (comprometimento >= 70) {
    banner.classList.add('warning');
    icon.className = 'fa-solid fa-chart-line';
    texto.textContent = `Situação moderada: ${comprometimento.toFixed(0)}% comprometido. Saldo restante de ${formatarMoeda(saldoRestante)}.`;
  } else {
    banner.classList.add('positive');
    icon.className = 'fa-solid fa-circle-check';
    texto.textContent = `Boa saúde financeira! Você comprometeu ${comprometimento.toFixed(0)}% da renda e ainda tem ${formatarMoeda(saldoRestante)} disponíveis.`;
  }
}

function atualizarBarraComprometimento(rendaTotal, totalDespesas) {
  const percentEl = document.getElementById('budgetPercent');
  const fillEl = document.getElementById('budgetFill');

  if (rendaTotal <= 0) {
    percentEl.textContent = '0%';
    fillEl.style.width = '0%';
    fillEl.className = 'budget-fill';
    return;
  }

  const percentual = Math.min((totalDespesas / rendaTotal) * 100, 100);
  percentEl.textContent = `${percentual.toFixed(0)}%`;
  fillEl.style.width = `${percentual}%`;
  fillEl.className = 'budget-fill';
  if (percentual >= 90) fillEl.classList.add('danger');
  else if (percentual >= 70) fillEl.classList.add('warning');
}

function obterTotalEntradas() {
  return estado.entradas.reduce((soma, e) => soma + e.valor, 0);
}

function obterRendaTotal() {
  return estado.salario + obterTotalEntradas();
}

function calcularResumo() {
  const totalDespesas = estado.despesas.reduce((soma, d) => soma + d.valor, 0);
  const totalEntradas = obterTotalEntradas();
  const rendaTotal = obterRendaTotal();
  const saldoRestante = rendaTotal - totalDespesas;
  const qtdDespesas = estado.despesas.length;
  const qtdEntradas = estado.entradas.length;

  document.getElementById('cardSalario').textContent = formatarMoeda(rendaTotal);
  document.getElementById('cardRendaSub').textContent =
    totalEntradas > 0
      ? `Salário ${formatarMoeda(estado.salario)} + extras`
      : 'Apenas salário';
  document.getElementById('cardEntradas').textContent = formatarMoeda(totalEntradas);
  document.getElementById('cardEntradasSub').textContent =
    qtdEntradas > 0
      ? `${qtdEntradas} entrada${qtdEntradas !== 1 ? 's' : ''} além do salário`
      : 'Nenhuma entrada extra';
  document.getElementById('cardDespesas').textContent = formatarMoeda(totalDespesas);
  document.getElementById('cardDespesasSub').textContent = `${qtdDespesas} conta${qtdDespesas !== 1 ? 's' : ''}`;

  document.getElementById('salarioAtualDisplay').textContent = formatarMoeda(estado.salario);
  document.getElementById('totalEntradasDisplay').textContent = formatarMoeda(totalEntradas);
  document.getElementById('resumoSalario').textContent = formatarMoeda(estado.salario);
  document.getElementById('resumoEntradas').textContent = formatarMoeda(totalEntradas);
  document.getElementById('resumoRendaTotal').textContent = formatarMoeda(rendaTotal);
  document.getElementById('resumoDespesas').textContent = formatarMoeda(totalDespesas);
  document.getElementById('resumoSaldo').textContent = formatarMoeda(saldoRestante);
  document.getElementById('totalDespesasFooter').textContent = formatarMoeda(totalDespesas);

  const saldoItem = document.getElementById('resumoSaldoItem');
  saldoItem.classList.toggle('negative', saldoRestante < 0);

  atualizarBannerSaude(rendaTotal, totalDespesas, saldoRestante);
  atualizarBarraComprometimento(rendaTotal, totalDespesas);
  atualizarInvestimento(saldoRestante, totalDespesas);
  atualizarDashboard();
}

/* =========================================================
   SIMULADOR DE INVESTIMENTO
   ========================================================= */
function atualizarInvestimento(saldoPreCalculado, totalDespesasPre) {
  const totalDespesas = totalDespesasPre ?? estado.despesas.reduce((s, d) => s + d.valor, 0);
  const saldoRestante = saldoPreCalculado ?? (obterRendaTotal() - totalDespesas);

  const investAtivo = document.getElementById('investAtivo');
  const investDesativado = document.getElementById('investDesativado');
  const slider = document.getElementById('sliderInvestimento');

  if (saldoRestante <= 0) {
    investAtivo.classList.add('hidden');
    investDesativado.classList.remove('hidden');

    estado.percentualInvestimento = 0;
    slider.value = 0;

    const msgEl = document.getElementById('investDesativadoTexto');
    msgEl.textContent = saldoRestante < 0
      ? `Déficit de ${formatarMoeda(Math.abs(saldoRestante))}. Reduza despesas para simular investimentos.`
      : 'Não há saldo restante disponível para simular investimento.';

    document.getElementById('cardDisponivel').textContent = formatarMoeda(saldoRestante);
    document.getElementById('cardDisponivelSub').textContent = saldoRestante < 0 ? 'Déficit' : 'Livre para gastar';

    salvarDados();
    return;
  }

  investAtivo.classList.remove('hidden');
  investDesativado.classList.add('hidden');

  let percentual = parseInt(slider.value, 10);
  if (isNaN(percentual) || percentual < 0) percentual = 0;
  if (percentual > 100) percentual = 100;

  estado.percentualInvestimento = percentual;

  const valorInvestido = saldoRestante * (percentual / 100);
  const valorDisponivel = saldoRestante - valorInvestido;

  document.getElementById('percInvestimento').textContent = `${percentual}%`;
  document.getElementById('progressFill').style.width = `${percentual}%`;
  document.getElementById('valorInvestido').textContent = formatarMoeda(valorInvestido);
  document.getElementById('valorDisponivelInvest').textContent = formatarMoeda(valorDisponivel);

  document.getElementById('cardDisponivel').textContent = formatarMoeda(valorDisponivel);
  document.getElementById('cardDisponivelSub').textContent =
    percentual > 0 ? `Após investir ${percentual}%` : 'Livre para gastar';

  salvarDados();
}

