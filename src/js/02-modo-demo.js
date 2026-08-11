/* =========================================================
   02-modo-demo.js
   Controle do Modo Demo: ativação, saída e restauração dos dados reais do usuário.
   ========================================================= */

/* =========================================================
   MODO DEMO
   ========================================================= */
function atualizarBadgeDemo() {
  const badge = document.getElementById('demoBadge');
  const btnDemo = document.getElementById('btnCarregarDemo');
  if (!badge) return;
  const ativo = localStorage.getItem('meuDinheiro_demoAtivo') === '1';
  badge.classList.toggle('hidden', !ativo);
  if (btnDemo) btnDemo.classList.toggle('hidden', ativo);
}

function sairDoModoDemo() {
  const backup = localStorage.getItem('meuDinheiro_backupReal');
  localStorage.removeItem('meuDinheiro_demoAtivo');
  localStorage.removeItem('meuDinheiro_backupReal');

  if (backup) {
    try {
      const parsed = JSON.parse(backup);
      estado = {
        salario: Number(parsed.salario) || 0,
        mesReferencia: parsed.mesReferencia || '',
        despesas: Array.isArray(parsed.despesas) ? parsed.despesas : [],
        entradas: Array.isArray(parsed.entradas) ? parsed.entradas : [],
        percentualInvestimento: Number(parsed.percentualInvestimento) || 0,
        historico: Array.isArray(parsed.historico) ? parsed.historico.map(normalizarItemHistorico).filter(Boolean) : [],
        valorInvestidoAtual: Number(parsed.valorInvestidoAtual) || 0,
        taxaRentabilidade: parsed.taxaRentabilidade !== undefined ? Number(parsed.taxaRentabilidade) || 0 : 0.8,
        periodoProjecao: Number(parsed.periodoProjecao) || 12,
        metas: Array.isArray(parsed.metas) ? parsed.metas.map(normalizarMeta).filter(Boolean) : [],
        atividades: Array.isArray(parsed.atividades) ? parsed.atividades : []
      };
    } catch (e) {
      console.error('Erro ao restaurar dados reais:', e);
    }
  } else {
    estado = {
      salario: 0, mesReferencia: '', despesas: [], entradas: [], percentualInvestimento: 0, historico: [],
      valorInvestidoAtual: 0, taxaRentabilidade: 0.8, periodoProjecao: 12, metas: [], atividades: []
    };
  }

  salvarDados();
  document.getElementById('inputSalario').value = estado.salario > 0 ? estado.salario : '';
  document.getElementById('inputMesReferencia').value = estado.mesReferencia || '';
  document.getElementById('sliderInvestimento').value = estado.percentualInvestimento;
  document.getElementById('inputValorInvestidoAtual').value = estado.valorInvestidoAtual > 0 ? formatarMoeda(estado.valorInvestidoAtual) : '';
  document.getElementById('inputTaxaRentabilidade').value = estado.taxaRentabilidade || '';
  document.getElementById('inputPeriodoProjecao').value = estado.periodoProjecao || 12;

  atualizarDisplayMesReferencia();
  renderizarDespesas();
  renderizarEntradas();
  calcularResumo();
  renderizarHistorico();
  renderizarMetas();
  renderizarAtividades();
  atualizarDashboard();
  atualizarBadgeDemo();
  mostrarToast('Modo demo desativado. Seus dados reais foram restaurados.', 'success');
}

function abrirModalLimpar() {
  abrirModalConfirmar(
    'Isso apagará salário, outras entradas, despesas, metas, histórico e configurações de investimento. Deseja continuar?',
    limparTodosDados,
    'Reiniciar tudo'
  );
}

function limparTodosDados() {
  estado = {
    salario: 0, mesReferencia: '', despesas: [], entradas: [], percentualInvestimento: 0, historico: [],
    valorInvestidoAtual: 0, taxaRentabilidade: 0.8, periodoProjecao: 12, metas: [], atividades: []
  };
  localStorage.removeItem('meuDinheiro_estado');
  localStorage.removeItem('meuDinheiro_demoAtivo');
  localStorage.removeItem('meuDinheiro_backupReal');
  document.getElementById('inputSalario').value = '';
  document.getElementById('inputMesReferencia').value = '';
  document.getElementById('sliderInvestimento').value = 0;
  document.getElementById('inputValorInvestidoAtual').value = '';
  document.getElementById('inputTaxaRentabilidade').value = 0.8;
  document.getElementById('inputPeriodoProjecao').value = 12;
  limparFormularioDespesa();
  limparFormularioEntrada();
  limparFormularioMeta();
  atualizarDisplayMesReferencia();
  renderizarDespesas();
  renderizarEntradas();
  calcularResumo();
  renderizarHistorico();
  renderizarMetas();
  renderizarAtividades();
  atualizarDashboard();
  atualizarBadgeDemo();
  mostrarToast('Dados reiniciados com sucesso.', 'success');
}

