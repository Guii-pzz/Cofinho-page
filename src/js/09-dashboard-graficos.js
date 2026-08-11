/* =========================================================
   09-dashboard-graficos.js
   Projeção de patrimônio e os gráficos do Dashboard (Chart.js): patrimônio, comparativo investido x rendimentos e projeção.
   ========================================================= */

/* =========================================================
   DASHBOARD E GRÁFICOS
   ========================================================= */
function calcularAporteMensalAtual() {
  const totalDespesas = estado.despesas.reduce((s, d) => s + d.valor, 0);
  const saldoRestante = obterRendaTotal() - totalDespesas;
  if (saldoRestante <= 0) return 0;
  const percentual = estado.percentualInvestimento || 0;
  return saldoRestante * (percentual / 100);
}

function projetarPatrimonio(valorInicial, aporteMensal, taxaMensalPercentual, meses) {
  const taxa = (taxaMensalPercentual || 0) / 100;
  const pontos = [{ mes: 0, valor: valorInicial, investido: valorInicial, rendimentos: 0 }];
  let saldo = valorInicial;
  let totalAportado = valorInicial;

  for (let m = 1; m <= meses; m++) {
    saldo = saldo * (1 + taxa) + aporteMensal;
    totalAportado += aporteMensal;
    const rendimentos = Math.max(saldo - totalAportado, 0);
    pontos.push({ mes: m, valor: saldo, investido: totalAportado, rendimentos });
  }
  return pontos;
}

function atualizarDashboard() {
  if (typeof Chart === 'undefined') return;
  clearTimeout(_dashboardDebounceTimer);
  _dashboardDebounceTimer = setTimeout(_executarAtualizacaoDashboard, 80);
}

function _executarAtualizacaoDashboard() {
  const aporteMensal = calcularAporteMensalAtual();
  const periodo = Math.max(parseInt(document.getElementById('inputPeriodoProjecao')?.value, 10) || 12, 1);
  const pontos = projetarPatrimonio(estado.valorInvestidoAtual, aporteMensal, estado.taxaRentabilidade, periodo);
  const ultimo = pontos[pontos.length - 1];

  const totalInvestidoHoje = estado.valorInvestidoAtual;
  document.getElementById('dashTotalInvestido').textContent = formatarMoeda(totalInvestidoHoje);
  document.getElementById('dashTotalInvestidoSub').textContent = aporteMensal > 0
    ? `+${formatarMoeda(aporteMensal)}/mês`
    : 'Nenhum aporte mensal ativo';

  document.getElementById('dashPatrimonioProjetado').textContent = formatarMoeda(ultimo.valor);
  document.getElementById('dashPatrimonioProjetadoSub').textContent = `Em ${periodo} meses`;

  document.getElementById('dashRendimentos').textContent = formatarMoeda(ultimo.rendimentos);
  document.getElementById('dashRendimentosSub').textContent = `Rentabilidade de ${estado.taxaRentabilidade || 0}% a.m.`;

  document.getElementById('dashAporteMensal').textContent = formatarMoeda(aporteMensal);
  document.getElementById('dashProximoAporte').textContent = formatarMoeda(aporteMensal);

  const totalDespesas = estado.despesas.reduce((s, d) => s + d.valor, 0);
  const rendaTotal = obterRendaTotal();
  document.getElementById('dashRendaTotalMini').textContent = formatarMoeda(rendaTotal);
  document.getElementById('dashDespesasMini').textContent = formatarMoeda(totalDespesas);
  document.getElementById('dashSaldoMini').textContent = formatarMoeda(rendaTotal - totalDespesas);

  renderizarMetaPrincipal();
  renderizarChartPatrimonio(pontos);
  renderizarChartComparativo(ultimo);
  renderizarChartProjecao(pontos);
}

function atualizarDashboardImediato() {
  if (typeof Chart === 'undefined') return;
  _executarAtualizacaoDashboard();
}

function renderizarMetaPrincipal() {
  const destaque = document.getElementById('dashMetaPrincipal');
  const lista = document.getElementById('dashResumoMetas');
  if (!destaque || !lista) return;

  if (!estado.metas.length) {
    destaque.innerHTML = `
      <div class="meta-principal-vazio">
        <i class="fa-solid fa-bullseye"></i>
        <p>Você ainda não tem metas cadastradas.</p>
        <small>Crie uma na aba Metas para acompanhar aqui.</small>
      </div>`;
    lista.innerHTML = '';
    return;
  }

  const emDestaque = estado.metas.find(m => m.prioridade && m.valorAtual < m.valorObjetivo);

  if (emDestaque) {
    const percentual = emDestaque.valorObjetivo > 0
      ? Math.min((emDestaque.valorAtual / emDestaque.valorObjetivo) * 100, 100)
      : 0;
    destaque.innerHTML = `
      <div class="meta-principal-card">
        <div class="meta-ring${percentual >= 100 ? ' concluida' : ''}" style="width:64px;height:64px;">
          <svg viewBox="0 0 64 64">
            <circle class="track" cx="32" cy="32" r="26"></circle>
            <circle class="fill" cx="32" cy="32" r="26"
              stroke-dasharray="${2 * Math.PI * 26}"
              stroke-dashoffset="${2 * Math.PI * 26 - (percentual / 100) * 2 * Math.PI * 26}"></circle>
          </svg>
          <div class="ring-content">
            <i class="fa-solid ${obterIconeCategoria(emDestaque.icone)} ring-icon" style="font-size:14px;"></i>
            <span class="ring-perc">${percentual.toFixed(0)}%</span>
          </div>
        </div>
        <div class="meta-principal-info">
          <div class="nome"><i class="fa-solid fa-star" style="color:var(--warning);font-size:11px;margin-right:5px;"></i>${escaparHTML(emDestaque.nome)}</div>
          <div class="sub">${formatarMoeda(emDestaque.valorAtual)} de ${formatarMoeda(emDestaque.valorObjetivo)}</div>
        </div>
      </div>`;
  } else {
    destaque.innerHTML = '';
  }

  lista.innerHTML = estado.metas.map(meta => {
    const percentual = meta.valorObjetivo > 0
      ? Math.min((meta.valorAtual / meta.valorObjetivo) * 100, 100)
      : 0;
    return `
      <div class="dash-meta-mini${meta.prioridade ? ' prioridade' : ''}">
        <div class="icone"><i class="fa-solid ${obterIconeCategoria(meta.icone)}"></i></div>
        <div class="dash-meta-mini-body">
          <div class="dash-meta-mini-top">
            <span class="nome">${meta.prioridade ? '<i class="fa-solid fa-star dash-meta-mini-star"></i>' : ''}${escaparHTML(meta.nome)}</span>
            <span class="perc">${percentual.toFixed(0)}%</span>
          </div>
          <div class="dash-meta-mini-bar"><div style="width:${percentual}%"></div></div>
          <div class="dash-meta-mini-valores">${formatarMoeda(meta.valorAtual)} de ${formatarMoeda(meta.valorObjetivo)}</div>
        </div>
      </div>`;
  }).join('');
}

function obterOpcoesChartBase() {
  const escuro = estaModoEscuro();
  const corTexto = escuro ? '#94a3b8' : '#64748b';
  const corGrade = escuro ? 'rgba(148,163,184,0.15)' : '#eef2f1';
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { color: corTexto, font: { family: "'Plus Jakarta Sans', sans-serif" }, boxWidth: 12, usePointStyle: true } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: corTexto, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } } },
      y: { grid: { color: corGrade }, ticks: {
        color: corTexto,
        font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
        callback: (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
      } }
    }
  };
}

function renderizarChartPatrimonio(pontos) {
  const canvas = document.getElementById('chartPatrimonio');
  if (!canvas) return;
  const labels = pontos.map(p => `Mês ${p.mes}`);
  const dados = pontos.map(p => p.valor);

  if (chartPatrimonioInstancia) chartPatrimonioInstancia.destroy();
  chartPatrimonioInstancia = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Patrimônio projetado',
        data: dados,
        borderColor: '#0f766e',
        backgroundColor: 'rgba(20,184,166,0.14)',
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5
      }]
    },
    options: obterOpcoesChartBase()
  });
}

function renderizarChartComparativo(ultimo) {
  const canvas = document.getElementById('chartComparativo');
  if (!canvas) return;

  if (chartComparativoInstancia) chartComparativoInstancia.destroy();
  chartComparativoInstancia = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Valor investido', 'Rendimentos'],
      datasets: [{
        data: [ultimo.investido, ultimo.rendimentos],
        backgroundColor: ['#0f766e', '#fbbf24'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { position: 'bottom', labels: { color: estaModoEscuro() ? '#94a3b8' : '#64748b', font: { family: "'Plus Jakarta Sans', sans-serif", size: 11.5 }, boxWidth: 10, usePointStyle: true } } }
    }
  });
}

function renderizarChartProjecao(pontos) {
  const canvas = document.getElementById('chartProjecao');
  if (!canvas) return;
  const labels = pontos.map(p => `Mês ${p.mes}`);

  if (chartProjecaoInstancia) chartProjecaoInstancia.destroy();
  chartProjecaoInstancia = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Investido (aportes)',
          data: pontos.map(p => p.investido),
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15,118,110,0.08)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          fill: true
        },
        {
          label: 'Patrimônio total',
          data: pontos.map(p => p.valor),
          borderColor: '#d97706',
          backgroundColor: 'rgba(217,119,6,0.08)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          fill: true
        }
      ]
    },
    options: obterOpcoesChartBase()
  });
}

