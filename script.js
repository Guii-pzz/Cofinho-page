/* =========================================================
   ESTADO GLOBAL DA APLICAÇÃO
   ========================================================= */
let estado = {
  salario: 0,
  mesReferencia: '',
  despesas: [],
  entradas: [],
  percentualInvestimento: 0,
  historico: [],
  valorInvestidoAtual: 0,
  taxaRentabilidade: 0.8,
  periodoProjecao: 12,
  metas: [],
  atividades: []
};

let acaoConfirmacao = null;
let vistaHistorico = 'mensal';
let abaAtual = 'dashboard';
let chartPatrimonioInstancia = null;
let chartComparativoInstancia = null;
let chartProjecaoInstancia = null;
let _dashboardDebounceTimer = null;

const formatador = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function formatarMoeda(valor) {
  return formatador.format(Number(valor) || 0);
}

function formatarMesReferencia(yyyyMM) {
  if (!yyyyMM) return '';
  const [ano, mes] = yyyyMM.split('-');
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  const texto = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function atualizarDisplayMesReferencia() {
  const badge = document.getElementById('mesReferenciaDisplay');
  const texto = document.getElementById('mesReferenciaTexto');
  if (estado.mesReferencia) {
    texto.textContent = formatarMesReferencia(estado.mesReferencia);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

/* =========================================================
   TOAST DE FEEDBACK
   ========================================================= */
function mostrarToast(mensagem, tipo = 'error') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  const icone = tipo === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icone}"></i><span>${escaparHTML(mensagem)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

/* =========================================================
   MODAL DE CONFIRMAÇÃO
   ========================================================= */
function abrirModalConfirmar(texto, callback, tituloBtn = 'Confirmar') {
  document.getElementById('modalConfirmarTexto').textContent = texto;
  document.getElementById('modalConfirmarBtn').textContent = tituloBtn;
  acaoConfirmacao = callback;
  document.getElementById('modalConfirmar').classList.remove('hidden');
}

function fecharModalConfirmar() {
  document.getElementById('modalConfirmar').classList.add('hidden');
  acaoConfirmacao = null;
}

function executarConfirmacao() {
  if (typeof acaoConfirmacao === 'function') acaoConfirmacao();
  fecharModalConfirmar();
}

/* =========================================================
   LOCALSTORAGE
   ========================================================= */
function salvarDados() {
  localStorage.setItem('meuDinheiro_estado', JSON.stringify(estado));
}

function carregarDados() {
  const dados = localStorage.getItem('meuDinheiro_estado');
  if (dados) {
    try {
      const parsed = JSON.parse(dados);
      estado.salario = Number(parsed.salario) || 0;
      estado.mesReferencia = parsed.mesReferencia || '';
      estado.despesas = Array.isArray(parsed.despesas)
        ? parsed.despesas.map(d => ({
            ...d,
            valor: Number(d.valor) || 0,
            vencimento: d.vencimento || '',
            dataPagamento: d.dataPagamento || ''
          }))
        : [];
      estado.entradas = Array.isArray(parsed.entradas)
        ? parsed.entradas.map(e => ({
            ...e,
            valor: Number(e.valor) || 0,
            data: e.data || ''
          }))
        : [];
      estado.percentualInvestimento = Number(parsed.percentualInvestimento) || 0;
      estado.historico = Array.isArray(parsed.historico)
        ? parsed.historico.map(normalizarItemHistorico).filter(Boolean)
        : [];
      estado.valorInvestidoAtual = Number(parsed.valorInvestidoAtual) || 0;
      estado.taxaRentabilidade = parsed.taxaRentabilidade !== undefined && parsed.taxaRentabilidade !== null
        ? Number(parsed.taxaRentabilidade) || 0
        : 0.8;
      estado.periodoProjecao = Number(parsed.periodoProjecao) || 12;
      estado.metas = Array.isArray(parsed.metas)
        ? parsed.metas.map(normalizarMeta).filter(Boolean)
        : [];
      estado.atividades = Array.isArray(parsed.atividades) ? parsed.atividades : [];
    } catch (e) {
      console.error('Erro ao carregar dados salvos:', e);
      mostrarToast('Não foi possível carregar os dados salvos.');
    }
  }

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
}

function carregarDadosDemo() {
  if (localStorage.getItem('meuDinheiro_demoAtivo') !== '1') {
    localStorage.setItem('meuDinheiro_backupReal', JSON.stringify(estado));
  }
  localStorage.setItem('meuDinheiro_demoAtivo', '1');

  const hoje = new Date();
  const fmt = (dias) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
  };
  const fmtISO = (dias) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + dias);
    return d.toISOString();
  };

  const mesAtual = hoje.toISOString().slice(0, 7);
  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().slice(0, 7);
  const mesAnteanterior = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1).toISOString().slice(0, 7);

  estado = {
    salario: 6500,
    mesReferencia: mesAtual,
    despesas: [
      { id: gerarId(), nome: 'Aluguel', valor: 1800, pagamento: 'PIX', vencimento: fmt(5), dataPagamento: fmt(4), status: 'Pendente' },
      { id: gerarId(), nome: 'Supermercado', valor: 850, pagamento: 'Crédito', vencimento: fmt(-2), dataPagamento: fmt(0), status: 'Pendente' },
      { id: gerarId(), nome: 'Internet', valor: 120, pagamento: 'Débito', vencimento: fmt(10), dataPagamento: fmt(-1), status: 'Pago' },
      { id: gerarId(), nome: 'Academia', valor: 99, pagamento: 'Débito', vencimento: fmt(3), dataPagamento: '', status: 'Pendente' },
      { id: gerarId(), nome: 'Transporte', valor: 280, pagamento: 'PIX', vencimento: '', dataPagamento: fmt(2), status: 'Pendente' }
    ],
    entradas: [
      { id: gerarId(), nome: 'Freelance design', valor: 1200, data: fmt(-5) },
      { id: gerarId(), nome: 'Venda de usado', valor: 350, data: fmt(-12) },
      { id: gerarId(), nome: 'Cashback', valor: 45, data: fmt(-2) }
    ],
    percentualInvestimento: 30,
    historico: [
      {
        id: gerarId(),
        mes: mesAnteanterior,
        salario: 6500,
        totalEntradas: 900,
        rendaTotal: 7400,
        totalDespesas: 3100,
        saldoRestante: 4300,
        percentualInvestimento: 25,
        valorInvestido: 1075,
        valorDisponivel: 3225,
        qtdDespesas: 5,
        qtdEntradas: 2,
        arquivadoEm: new Date(hoje.getFullYear(), hoje.getMonth() - 2, 28).toISOString()
      },
      {
        id: gerarId(),
        mes: mesAnterior,
        salario: 6500,
        totalEntradas: 1500,
        rendaTotal: 8000,
        totalDespesas: 3450,
        saldoRestante: 4550,
        percentualInvestimento: 30,
        valorInvestido: 1365,
        valorDisponivel: 3185,
        qtdDespesas: 6,
        qtdEntradas: 3,
        arquivadoEm: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 28).toISOString()
      }
    ],
    valorInvestidoAtual: 8200,
    taxaRentabilidade: 0.8,
    periodoProjecao: 24,
    metas: [
      {
        id: gerarId(), nome: 'Comprar carro', icone: 'fa-car', prioridade: true,
        valorObjetivo: 35000, valorAtual: 12500,
        dataPrevista: new Date(hoje.getFullYear() + 1, hoje.getMonth(), 1).toISOString().split('T')[0],
        descricao: 'Entrada + parte do financiamento', criadaEm: fmtISO(-90),
        aportes: [
          { id: gerarId(), valor: 5000, data: fmtISO(-90) },
          { id: gerarId(), valor: 3500, data: fmtISO(-60) },
          { id: gerarId(), valor: 2000, data: fmtISO(-30) },
          { id: gerarId(), valor: 2000, data: fmtISO(-3) }
        ]
      },
      {
        id: gerarId(), nome: 'Comprar notebook', icone: 'fa-laptop', prioridade: false,
        valorObjetivo: 5500, valorAtual: 4015,
        dataPrevista: new Date(hoje.getFullYear(), hoje.getMonth() + 2, 1).toISOString().split('T')[0],
        descricao: 'Notebook para trabalho remoto', criadaEm: fmtISO(-45),
        aportes: [
          { id: gerarId(), valor: 2000, data: fmtISO(-45) },
          { id: gerarId(), valor: 1015, data: fmtISO(-20) },
          { id: gerarId(), valor: 1000, data: fmtISO(-1) }
        ]
      },
      {
        id: gerarId(), nome: 'Reserva de emergência', icone: 'fa-heart-pulse', prioridade: false,
        valorObjetivo: 15000, valorAtual: 15000,
        dataPrevista: fmt(-10),
        descricao: '6 meses de despesas fixas', criadaEm: fmtISO(-200),
        aportes: [
          { id: gerarId(), valor: 10000, data: fmtISO(-200) },
          { id: gerarId(), valor: 5000, data: fmtISO(-90) }
        ]
      },
      {
        id: gerarId(), nome: 'Viagem para o Nordeste', icone: 'fa-umbrella-beach', prioridade: false,
        valorObjetivo: 6000, valorAtual: 1800,
        dataPrevista: new Date(hoje.getFullYear(), hoje.getMonth() + 5, 1).toISOString().split('T')[0],
        descricao: '', criadaEm: fmtISO(-30),
        aportes: [
          { id: gerarId(), valor: 1000, data: fmtISO(-30) },
          { id: gerarId(), valor: 800, data: fmtISO(-6) }
        ]
      }
    ],
    atividades: [
      { id: gerarId(), tipo: 'aporte', descricao: 'Valor já investido atualizado', valor: 8200, data: fmt(-1) },
      { id: gerarId(), tipo: 'meta', descricao: 'Meta "Comprar carro" criada', valor: 35000, data: fmt(-90) },
      { id: gerarId(), tipo: 'aporte', descricao: 'Aporte na meta "Comprar carro"', valor: 2000, data: fmt(-3) },
      { id: gerarId(), tipo: 'meta', descricao: 'Meta "Comprar notebook" criada', valor: 5500, data: fmt(-45) },
      { id: gerarId(), tipo: 'aporte', descricao: 'Aporte na meta "Comprar notebook"', valor: 1000, data: fmt(-1) },
      { id: gerarId(), tipo: 'aporte', descricao: 'Aporte na meta "Reserva de emergência"', valor: 5000, data: fmt(-90) },
      { id: gerarId(), tipo: 'valor', descricao: 'Despesa "Aluguel" adicionada', valor: 1800, data: fmt(-20) }
    ]
  };

  document.getElementById('inputSalario').value = estado.salario;
  document.getElementById('inputMesReferencia').value = estado.mesReferencia;
  document.getElementById('sliderInvestimento').value = estado.percentualInvestimento;
  document.getElementById('inputValorInvestidoAtual').value = formatarMoeda(estado.valorInvestidoAtual);
  document.getElementById('inputTaxaRentabilidade').value = estado.taxaRentabilidade;
  document.getElementById('inputPeriodoProjecao').value = estado.periodoProjecao;
  salvarDados();
  atualizarDisplayMesReferencia();
  renderizarDespesas();
  renderizarEntradas();
  calcularResumo();
  renderizarHistorico();
  renderizarMetas();
  renderizarAtividades();
  atualizarDashboard();
  atualizarBadgeDemo();
  mudarAba('dashboard');
  mostrarToast('Cenário de demonstração carregado! Explore as abas para ver tudo em ação.', 'success');
}

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

/* =========================================================
   HISTÓRICO MENSAL / ANUAL
   ========================================================= */
function normalizarItemHistorico(item) {
  if (!item || !item.mes) return null;
  return {
    id: item.id || gerarId(),
    mes: item.mes,
    salario: Number(item.salario) || 0,
    totalEntradas: Number(item.totalEntradas) || 0,
    rendaTotal: Number(item.rendaTotal) || 0,
    totalDespesas: Number(item.totalDespesas) || 0,
    saldoRestante: Number(item.saldoRestante) || 0,
    percentualInvestimento: Number(item.percentualInvestimento) || 0,
    valorInvestido: Number(item.valorInvestido) || 0,
    valorDisponivel: Number(item.valorDisponivel) || 0,
    qtdDespesas: Number(item.qtdDespesas) || 0,
    qtdEntradas: Number(item.qtdEntradas) || 0,
    arquivadoEm: item.arquivadoEm || new Date().toISOString()
  };
}

/* =========================================================
   METAS — normalização
   ========================================================= */
function normalizarMeta(item) {
  if (!item || !item.nome) return null;
  return {
    id: item.id || gerarId(),
    nome: item.nome,
    icone: item.icone || 'fa-piggy-bank',
    valorObjetivo: Number(item.valorObjetivo) || 0,
    valorAtual: Number(item.valorAtual) || 0,
    dataPrevista: item.dataPrevista || '',
    descricao: item.descricao || '',
    prioridade: !!item.prioridade,
    criadaEm: item.criadaEm || new Date().toISOString(),
    aportes: Array.isArray(item.aportes)
      ? item.aportes.map(a => ({
          id: a.id || gerarId(),
          valor: Number(a.valor) || 0,
          data: a.data || new Date().toISOString()
        }))
      : []
  };
}

/* =========================================================
   HISTÓRICO DE ATIVIDADES
   ========================================================= */
function registrarAtividade(tipo, descricao, valor) {
  estado.atividades = estado.atividades || [];
  estado.atividades.unshift({
    id: gerarId(),
    tipo,
    descricao,
    valor: typeof valor === 'number' ? valor : null,
    data: new Date().toISOString()
  });
  if (estado.atividades.length > 60) {
    estado.atividades = estado.atividades.slice(0, 60);
  }
}

function formatarDataHora(iso) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderizarAtividades() {
  const lista = document.getElementById('listaAtividades');
  const empty = document.getElementById('emptyAtividades');
  if (!lista || !empty) return;

  lista.innerHTML = '';
  const atividades = estado.atividades || [];

  if (atividades.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const icones = {
    aporte: { classe: 'aporte', icone: 'fa-seedling' },
    meta: { classe: 'meta', icone: 'fa-bullseye' },
    valor: { classe: '', icone: 'fa-pen' }
  };

  atividades.slice(0, 30).forEach(a => {
    const conf = icones[a.tipo] || icones.valor;
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-icon ${conf.classe}"><i class="fa-solid ${conf.icone}"></i></div>
      <div class="activity-body">
        <div class="activity-desc">${escaparHTML(a.descricao)}</div>
        <div class="activity-meta">${formatarDataHora(a.data)}</div>
      </div>
      ${a.valor !== null ? `<div class="activity-valor">${formatarMoeda(a.valor)}</div>` : ''}
    `;
    lista.appendChild(item);
  });
}

function criarSnapshotMes() {
  const resumo = obterResumoAtual();
  return {
    id: gerarId(),
    mes: estado.mesReferencia,
    salario: estado.salario,
    totalEntradas: resumo.totalEntradas,
    rendaTotal: resumo.rendaTotal,
    totalDespesas: resumo.totalDespesas,
    saldoRestante: resumo.saldoRestante,
    percentualInvestimento: estado.percentualInvestimento || 0,
    valorInvestido: resumo.valorInvestido,
    valorDisponivel: resumo.valorDisponivel,
    qtdDespesas: estado.despesas.length,
    qtdEntradas: estado.entradas.length,
    arquivadoEm: new Date().toISOString()
  };
}

function obterHistoricoOrdenado() {
  return [...estado.historico].sort((a, b) => b.mes.localeCompare(a.mes));
}

function agruparHistoricoPorAno() {
  const mapa = {};
  estado.historico.forEach(item => {
    const ano = item.mes.slice(0, 4);
    if (!mapa[ano]) {
      mapa[ano] = {
        ano,
        rendaTotal: 0,
        totalDespesas: 0,
        saldoRestante: 0,
        valorInvestido: 0,
        totalEntradas: 0,
        meses: 0
      };
    }
    mapa[ano].rendaTotal += item.rendaTotal;
    mapa[ano].totalDespesas += item.totalDespesas;
    mapa[ano].saldoRestante += item.saldoRestante;
    mapa[ano].valorInvestido += item.valorInvestido;
    mapa[ano].totalEntradas += item.totalEntradas;
    mapa[ano].meses += 1;
  });
  return Object.values(mapa).sort((a, b) => b.ano.localeCompare(a.ano));
}

function definirVistaHistorico(vista) {
  vistaHistorico = vista === 'anual' ? 'anual' : 'mensal';
  document.getElementById('btnVistaMensal').classList.toggle('active', vistaHistorico === 'mensal');
  document.getElementById('btnVistaAnual').classList.toggle('active', vistaHistorico === 'anual');
  renderizarHistorico();
}

function arquivarMesAtual() {
  const mesInput = document.getElementById('inputMesReferencia').value || estado.mesReferencia;
  if (!mesInput) {
    mostrarToast('Informe o mês de referência antes de arquivar.');
    return;
  }
  if (estado.salario <= 0 && estado.despesas.length === 0 && estado.entradas.length === 0) {
    mostrarToast('Cadastre salário, entradas ou despesas antes de arquivar.');
    return;
  }

  estado.mesReferencia = mesInput;
  document.getElementById('inputMesReferencia').value = mesInput;
  atualizarDisplayMesReferencia();

  const existente = estado.historico.find(h => h.mes === mesInput);
  const nomeMes = formatarMesReferencia(mesInput);

  if (existente) {
    abrirModalConfirmar(
      `Já existe um arquivamento para ${nomeMes}. Deseja substituir pelos dados atuais?`,
      () => salvarSnapshotHistorico(true),
      'Substituir'
    );
    return;
  }

  salvarSnapshotHistorico(false);
}

function salvarSnapshotHistorico(substituir) {
  const snapshot = criarSnapshotMes();
  if (substituir) {
    estado.historico = estado.historico.filter(h => h.mes !== snapshot.mes);
  }
  estado.historico.push(snapshot);
  registrarAtividade('valor', `Mês ${formatarMesReferencia(snapshot.mes)} arquivado`, snapshot.saldoRestante);
  salvarDados();
  renderizarHistorico();
  renderizarAtividades();
  mostrarToast(
    substituir
      ? `${formatarMesReferencia(snapshot.mes)} atualizado no histórico.`
      : `${formatarMesReferencia(snapshot.mes)} arquivado com sucesso!`,
    'success'
  );
}

function confirmarRemocaoHistorico(id) {
  const item = estado.historico.find(h => h.id === id);
  if (!item) return;
  abrirModalConfirmar(
    `Remover ${formatarMesReferencia(item.mes)} do histórico?`,
    () => removerHistorico(id),
    'Remover'
  );
}

function removerHistorico(id) {
  estado.historico = estado.historico.filter(h => h.id !== id);
  salvarDados();
  renderizarHistorico();
  mostrarToast('Mês removido do histórico.', 'success');
}

function htmlMetricasHistorico(entrou, saiu, sobrou, investiu, investSub) {
  return `
    <div class="historico-metrics">
      <div class="historico-metric entrou">
        <div class="m-lbl">Entrou</div>
        <div class="m-val">${formatarMoeda(entrou)}</div>
      </div>
      <div class="historico-metric saiu">
        <div class="m-lbl">Saiu</div>
        <div class="m-val">${formatarMoeda(saiu)}</div>
      </div>
      <div class="historico-metric sobrou">
        <div class="m-lbl">Sobrou</div>
        <div class="m-val">${formatarMoeda(sobrou)}</div>
      </div>
      <div class="historico-metric investiu">
        <div class="m-lbl">Investiu ${investSub ? `(${escaparHTML(investSub)})` : ''}</div>
        <div class="m-val">${formatarMoeda(investiu)}</div>
      </div>
    </div>
  `;
}

function renderizarHistorico() {
  const grid = document.getElementById('historicoGrid');
  const empty = document.getElementById('emptyHistorico');
  if (!grid || !empty) return;

  grid.innerHTML = '';

  if (!estado.historico.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  if (vistaHistorico === 'anual') {
    agruparHistoricoPorAno().forEach(ano => {
      const card = document.createElement('article');
      card.className = 'historico-card anual';
      card.innerHTML = `
        <div class="historico-card-header">
          <div>
            <div class="historico-card-titulo">${escaparHTML(ano.ano)}</div>
            <div class="historico-card-sub">${ano.meses} mês${ano.meses !== 1 ? 'es' : ''} arquivado${ano.meses !== 1 ? 's' : ''}</div>
          </div>
        </div>
        ${htmlMetricasHistorico(ano.rendaTotal, ano.totalDespesas, ano.saldoRestante, ano.valorInvestido, '')}
      `;
      grid.appendChild(card);
    });
    return;
  }

  obterHistoricoOrdenado().forEach(item => {
    const card = document.createElement('article');
    card.className = 'historico-card';
    card.innerHTML = `
      <div class="historico-card-header">
        <div>
          <div class="historico-card-titulo">${escaparHTML(formatarMesReferencia(item.mes))}</div>
          <div class="historico-card-sub">
            ${item.qtdDespesas} despesa${item.qtdDespesas !== 1 ? 's' : ''} · ${item.qtdEntradas} entrada${item.qtdEntradas !== 1 ? 's' : ''} extra${item.qtdEntradas !== 1 ? 's' : ''}
          </div>
        </div>
        <button class="btn-icon delete" data-action="delete-historico" data-id="${escaparHTML(item.id)}" title="Remover do histórico" aria-label="Remover ${escaparHTML(formatarMesReferencia(item.mes))}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      ${htmlMetricasHistorico(
        item.rendaTotal,
        item.totalDespesas,
        item.saldoRestante,
        item.valorInvestido,
        `${item.percentualInvestimento}%`
      )}
    `;
    grid.appendChild(card);
  });
}

/* =========================================================
   SALÁRIO
   ========================================================= */
function salvarSalario() {
  const input = document.getElementById('inputSalario');
  const valor = parseFloat(input.value);

  if (input.value.trim() === '' || isNaN(valor)) {
    mostrarToast('Informe um valor de salário válido.');
    return;
  }
  if (valor < 0) {
    mostrarToast('O salário não pode ser negativo.');
    return;
  }
  if (valor === 0) {
    mostrarToast('O salário deve ser maior que zero.');
    return;
  }

  estado.salario = valor;
  estado.mesReferencia = document.getElementById('inputMesReferencia').value || '';
  registrarAtividade('valor', 'Salário atualizado', valor);
  salvarDados();
  atualizarDisplayMesReferencia();
  calcularResumo();
  renderizarAtividades();
  mostrarToast('Salário salvo com sucesso!', 'success');
}

/* =========================================================
   DESPESAS - CRUD
   ========================================================= */
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function validarCamposDespesa(nome, valor) {
  if (!nome || nome.trim() === '') {
    mostrarToast('O nome da conta não pode ficar vazio.');
    return false;
  }
  if (isNaN(valor) || valor <= 0) {
    mostrarToast('Informe um valor maior que zero para a despesa.');
    return false;
  }
  return true;
}

function adicionarDespesa() {
  const nome = document.getElementById('despesaNome').value.trim();
  const valor = parseFloat(document.getElementById('despesaValor').value);
  const pagamento = document.getElementById('despesaPagamento').value;
  const vencimento = document.getElementById('despesaVencimento').value;
  const dataPagamento = document.getElementById('despesaDataPagamento').value;
  const status = document.getElementById('despesaStatus').value;

  if (!validarCamposDespesa(nome, valor)) return;

  estado.despesas.push({
    id: gerarId(),
    nome,
    valor,
    pagamento,
    vencimento,
    dataPagamento,
    status
  });

  registrarAtividade('valor', `Despesa "${nome}" adicionada`, valor);
  salvarDados();
  renderizarDespesas();
  calcularResumo();
  renderizarAtividades();
  limparFormularioDespesa();
  mostrarToast('Despesa adicionada com sucesso!', 'success');
}

function limparFormularioDespesa() {
  document.getElementById('despesaNome').value = '';
  document.getElementById('despesaValor').value = '';
  document.getElementById('despesaPagamento').value = 'Débito';
  document.getElementById('despesaVencimento').value = '';
  document.getElementById('despesaDataPagamento').value = '';
  document.getElementById('despesaStatus').value = 'Pendente';
}

function confirmarExclusao(id) {
  const despesa = estado.despesas.find(d => d.id === id);
  if (!despesa) return;

  abrirModalConfirmar(
    `Deseja remover a despesa "${despesa.nome}" (${formatarMoeda(despesa.valor)})?`,
    () => excluirDespesa(id),
    'Remover'
  );
}

function excluirDespesa(id) {
  estado.despesas = estado.despesas.filter(d => d.id !== id);
  salvarDados();
  renderizarDespesas();
  calcularResumo();
  mostrarToast('Despesa removida.', 'success');
}

function abrirModalEdicao(id) {
  const despesa = estado.despesas.find(d => d.id === id);
  if (!despesa) return;

  document.getElementById('editId').value = despesa.id;
  document.getElementById('editNome').value = despesa.nome;
  document.getElementById('editValor').value = despesa.valor;
  document.getElementById('editPagamento').value = despesa.pagamento;
  document.getElementById('editVencimento').value = despesa.vencimento || '';
  document.getElementById('editDataPagamento').value = despesa.dataPagamento || '';
  document.getElementById('editStatus').value = despesa.status;

  document.getElementById('modalEditar').classList.remove('hidden');
}

function fecharModalEdicao() {
  document.getElementById('modalEditar').classList.add('hidden');
}

function editarDespesa(id) {
  abrirModalEdicao(id);
}

function salvarEdicaoDespesa() {
  const id = document.getElementById('editId').value;
  const nome = document.getElementById('editNome').value.trim();
  const valor = parseFloat(document.getElementById('editValor').value);
  const pagamento = document.getElementById('editPagamento').value;
  const vencimento = document.getElementById('editVencimento').value;
  const dataPagamento = document.getElementById('editDataPagamento').value;
  const status = document.getElementById('editStatus').value;

  if (!validarCamposDespesa(nome, valor)) return;

  const despesa = estado.despesas.find(d => d.id === id);
  if (!despesa) return;

  Object.assign(despesa, { nome, valor, pagamento, vencimento, dataPagamento, status });

  salvarDados();
  renderizarDespesas();
  calcularResumo();
  fecharModalEdicao();
  mostrarToast('Despesa atualizada com sucesso!', 'success');
}

/* =========================================================
   OUTRAS ENTRADAS - CRUD
   ========================================================= */
function validarCamposEntrada(nome, valor) {
  if (!nome || nome.trim() === '') {
    mostrarToast('A descrição da entrada não pode ficar vazia.');
    return false;
  }
  if (isNaN(valor) || valor <= 0) {
    mostrarToast('Informe um valor maior que zero para a entrada.');
    return false;
  }
  return true;
}

function adicionarEntrada() {
  const nome = document.getElementById('entradaNome').value.trim();
  const valor = parseFloat(document.getElementById('entradaValor').value);
  const data = document.getElementById('entradaData').value;

  if (!validarCamposEntrada(nome, valor)) return;

  estado.entradas.push({
    id: gerarId(),
    nome,
    valor,
    data
  });

  registrarAtividade('valor', `Entrada "${nome}" adicionada`, valor);
  salvarDados();
  renderizarEntradas();
  calcularResumo();
  renderizarAtividades();
  limparFormularioEntrada();
  mostrarToast('Entrada adicionada com sucesso!', 'success');
}

function limparFormularioEntrada() {
  document.getElementById('entradaNome').value = '';
  document.getElementById('entradaValor').value = '';
  document.getElementById('entradaData').value = '';
}

function confirmarExclusaoEntrada(id) {
  const entrada = estado.entradas.find(e => e.id === id);
  if (!entrada) return;

  abrirModalConfirmar(
    `Deseja remover a entrada "${entrada.nome}" (${formatarMoeda(entrada.valor)})?`,
    () => excluirEntrada(id),
    'Remover'
  );
}

function excluirEntrada(id) {
  estado.entradas = estado.entradas.filter(e => e.id !== id);
  salvarDados();
  renderizarEntradas();
  calcularResumo();
  mostrarToast('Entrada removida.', 'success');
}

function renderizarEntradas() {
  const lista = document.getElementById('listaEntradas');
  const empty = document.getElementById('emptyEntradas');
  lista.innerHTML = '';

  if (estado.entradas.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  estado.entradas.forEach(entrada => {
    const item = document.createElement('div');
    item.className = 'entrada-item';
    item.innerHTML = `
      <div class="info">
        <div class="nome">${escaparHTML(entrada.nome)}</div>
        <div class="meta">${entrada.data ? formatarData(entrada.data) : 'Sem data'}</div>
      </div>
      <div class="valor">${formatarMoeda(entrada.valor)}</div>
      <div class="acoes">
        <button class="btn-icon delete" data-action="delete-entrada" data-id="${escaparHTML(entrada.id)}" title="Excluir" aria-label="Excluir ${escaparHTML(entrada.nome)}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    lista.appendChild(item);
  });
}

/* =========================================================
   RENDERIZAÇÃO DA TABELA
   ========================================================= */
function formatarData(dataISO) {
  if (!dataISO) return '-';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

function classificarVencimento(dataISO, status) {
  if (!dataISO || status === 'Pago') return { classe: '', rowClass: '', label: '' };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataISO + 'T00:00:00');
  const diff = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { classe: 'overdue', rowClass: 'overdue', label: 'Vencida' };
  if (diff <= 3) return { classe: 'soon', rowClass: '', label: 'Vence em breve' };
  return { classe: '', rowClass: '', label: '' };
}

function classificarDataPagamento(dataISO, status) {
  if (!dataISO || status === 'Pago') return { classe: '', label: '' };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const pag = new Date(dataISO + 'T00:00:00');
  const diff = Math.ceil((pag - hoje) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { classe: 'overdue', label: 'Pagamento atrasado' };
  if (diff === 0) return { classe: 'soon', label: 'Pagamento hoje' };
  if (diff <= 3) return { classe: 'soon', label: 'Pagamento em breve' };
  return { classe: '', label: '' };
}

function renderizarDespesas() {
  const tbody = document.getElementById('tabelaDespesas');
  const listaMobile = document.getElementById('listaDespesasMobile');
  const emptyState = document.getElementById('emptyState');

  tbody.innerHTML = '';
  listaMobile.innerHTML = '';

  if (estado.despesas.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const iconesPagamento = {
    'Débito': 'fa-credit-card',
    'Crédito': 'fa-credit-card',
    'PIX': 'fa-bolt',
    'Dinheiro': 'fa-money-bill'
  };

  estado.despesas.forEach(despesa => {
    const statusClass = despesa.status === 'Pago' ? 'pago' : 'pendente';
    const statusIcon = despesa.status === 'Pago' ? 'fa-circle-check' : 'fa-clock';
    const vencInfo = classificarVencimento(despesa.vencimento, despesa.status);
    const pagInfo = classificarDataPagamento(despesa.dataPagamento, despesa.status);
    const iconePag = iconesPagamento[despesa.pagamento] || 'fa-wallet';

    const tr = document.createElement('tr');
    if (vencInfo.rowClass) tr.classList.add(vencInfo.rowClass);

    tr.innerHTML = `
      <td>${escaparHTML(despesa.nome)}</td>
      <td>${formatarMoeda(despesa.valor)}</td>
      <td><span class="payment-tag"><i class="fa-solid ${iconePag}"></i> ${escaparHTML(despesa.pagamento)}</span></td>
      <td class="date-cell ${vencInfo.classe}" title="${escaparHTML(vencInfo.label)}">${formatarData(despesa.vencimento)}</td>
      <td class="date-cell ${pagInfo.classe}" title="${escaparHTML(pagInfo.label)}">${formatarData(despesa.dataPagamento)}</td>
      <td><span class="badge ${statusClass}"><i class="fa-solid ${statusIcon}"></i> ${escaparHTML(despesa.status)}</span></td>
      <td style="text-align:center;">
        <button class="btn-icon edit" data-action="edit" data-id="${escaparHTML(despesa.id)}" title="Editar" aria-label="Editar ${escaparHTML(despesa.nome)}">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn-icon delete" data-action="delete" data-id="${escaparHTML(despesa.id)}" title="Excluir" aria-label="Excluir ${escaparHTML(despesa.nome)}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);

    const card = document.createElement('article');
    card.className = `despesa-card${vencInfo.rowClass ? ' overdue' : ''}`;

    card.innerHTML = `
      <div class="despesa-card-header">
        <div class="despesa-card-nome">${escaparHTML(despesa.nome)}</div>
        <div class="despesa-card-valor">${formatarMoeda(despesa.valor)}</div>
      </div>
      <div class="despesa-card-grid">
        <div class="meta-item">
          <span class="meta-lbl">Pagamento</span>
          <span class="meta-val"><i class="fa-solid ${iconePag}"></i> ${escaparHTML(despesa.pagamento)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">Status</span>
          <span class="meta-val"><span class="badge ${statusClass}"><i class="fa-solid ${statusIcon}"></i> ${escaparHTML(despesa.status)}</span></span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">Vencimento</span>
          <span class="meta-val ${vencInfo.classe}">${formatarData(despesa.vencimento)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">Dia pagamento</span>
          <span class="meta-val ${pagInfo.classe}">${formatarData(despesa.dataPagamento)}</span>
        </div>
      </div>
      <div class="despesa-card-footer">
        ${vencInfo.label || pagInfo.label
          ? `<span class="payment-tag" style="color:var(--danger);font-weight:600;font-size:12px;"><i class="fa-solid fa-triangle-exclamation"></i> ${escaparHTML(vencInfo.label || pagInfo.label)}</span>`
          : '<span></span>'}
        <div class="despesa-card-actions">
          <button class="btn-icon edit" data-action="edit" data-id="${escaparHTML(despesa.id)}" title="Editar" aria-label="Editar ${escaparHTML(despesa.nome)}">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-icon delete" data-action="delete" data-id="${escaparHTML(despesa.id)}" title="Excluir" aria-label="Excluir ${escaparHTML(despesa.nome)}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    listaMobile.appendChild(card);
  });
}

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

/* =========================================================
   EXPORTAÇÃO PDF
   ========================================================= */

// Paleta de cores do PDF, espelhando as variáveis de :root em style.css
const PDF_CORES = {
  primary: [15, 118, 110],
  primaryDark: [13, 92, 86],
  primaryLight: [230, 247, 245],
  success: [5, 150, 105],
  successBg: [236, 253, 245],
  danger: [225, 29, 72],
  dangerBg: [255, 241, 242],
  warning: [217, 119, 6],
  warningBg: [255, 251, 235],
  text: [15, 23, 42],
  muted: [100, 116, 139],
  soft: [232, 239, 237],
  line: [226, 232, 240],
  white: [255, 255, 255],
  zebra: [247, 250, 249]
};

function obterDimensoesPagina(doc) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margem = 14;
  return { width, height, margem };
}

function obterResumoAtual() {
  const totalDespesas = estado.despesas.reduce((soma, d) => soma + d.valor, 0);
  const totalEntradas = obterTotalEntradas();
  const rendaTotal = obterRendaTotal();
  const saldoRestante = rendaTotal - totalDespesas;
  const percentualInvestimento = estado.percentualInvestimento || 0;
  const valorInvestido = saldoRestante > 0 ? saldoRestante * (percentualInvestimento / 100) : 0;
  const valorDisponivel = saldoRestante > 0 ? saldoRestante - valorInvestido : saldoRestante;
  const comprometimento = rendaTotal > 0 ? (totalDespesas / rendaTotal) * 100 : 0;
  const pendentes = estado.despesas.filter(d => d.status !== 'Pago').length;
  const pagas = estado.despesas.filter(d => d.status === 'Pago').length;

  return {
    totalDespesas,
    totalEntradas,
    rendaTotal,
    saldoRestante,
    valorInvestido,
    valorDisponivel,
    comprometimento,
    pendentes,
    pagas
  };
}

function obterSaudeFinanceira(resumo) {
  if (resumo.rendaTotal <= 0) {
    return {
      bg: PDF_CORES.soft,
      cor: PDF_CORES.muted,
      texto: 'Informe seu salário e cadastre despesas para ver sua saúde financeira.'
    };
  }

  if (resumo.saldoRestante < 0) {
    return {
      bg: PDF_CORES.dangerBg,
      cor: PDF_CORES.danger,
      texto: `Atenção: despesas ultrapassam a renda em ${formatarMoeda(Math.abs(resumo.saldoRestante))}.`
    };
  }
  if (resumo.comprometimento >= 90) {
    return {
      bg: PDF_CORES.warningBg,
      cor: PDF_CORES.warning,
      texto: `Cuidado: ${resumo.comprometimento.toFixed(0)}% da renda comprometido. Sobram ${formatarMoeda(resumo.saldoRestante)}.`
    };
  }
  if (resumo.comprometimento >= 70) {
    return {
      bg: PDF_CORES.warningBg,
      cor: PDF_CORES.warning,
      texto: `Situação moderada: ${resumo.comprometimento.toFixed(0)}% comprometido. Saldo de ${formatarMoeda(resumo.saldoRestante)}.`
    };
  }
  return {
    bg: PDF_CORES.successBg,
    cor: PDF_CORES.success,
    texto: `Boa saúde financeira! ${resumo.comprometimento.toFixed(0)}% comprometido, ${formatarMoeda(resumo.saldoRestante)} disponíveis.`
  };
}

function desenharCabecalhoPDF(doc, { mesReferencia, dataGeracao, landscape }) {
  const { width, margem } = obterDimensoesPagina(doc);
  const boxH = 24;

  doc.setFillColor(...PDF_CORES.primary);
  doc.rect(0, 0, width, boxH, 'F');

  doc.setTextColor(...PDF_CORES.white);
  doc.setFontSize(landscape ? 15 : 16);
  doc.setFont('helvetica', 'bold');
  doc.text('Meu Dinheiro', margem, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const subtitulo = mesReferencia ? `Relatório de ${formatarMesReferencia(mesReferencia)}` : 'Relatório financeiro';
  doc.text(subtitulo, margem, 20);

  doc.setFontSize(8);
  doc.text(`Gerado em ${dataGeracao}`, width - margem, 20, { align: 'right' });

  return boxH + 10;
}

function desenharTituloSecao(doc, y, titulo) {
  const { width, margem } = obterDimensoesPagina(doc);

  doc.setTextColor(...PDF_CORES.primaryDark);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, margem, y);

  doc.setDrawColor(...PDF_CORES.line);
  doc.setLineWidth(0.4);
  doc.line(margem, y + 2, width - margem, y + 2);

  return y + 8;
}

function desenharRodapePDF(doc, pagina, totalPaginas, { dataGeracao }) {
  const { width, height, margem } = obterDimensoesPagina(doc);
  const y = height - 8;

  doc.setDrawColor(...PDF_CORES.line);
  doc.setLineWidth(0.2);
  doc.line(margem, y - 4, width - margem, y - 4);

  doc.setTextColor(...PDF_CORES.muted);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Meu Dinheiro · Relatório financeiro pessoal', margem, y);
  doc.text(`Gerado em ${dataGeracao}`, width / 2, y, { align: 'center' });
  doc.text(`Página ${pagina} de ${totalPaginas}`, width - margem, y, { align: 'right' });
}

function abrirModalExportar() {
  const mesInput = document.getElementById('exportMes');
  if (mesInput) mesInput.value = estado.mesReferencia || '';
  document.getElementById('modalExportar').classList.remove('hidden');
}

function fecharModalExportar() {
  document.getElementById('modalExportar').classList.add('hidden');
}

function desenharCardsKPI(doc, y, resumo, landscape) {
  const { width, margem } = obterDimensoesPagina(doc);
  const usable = width - margem * 2;
  const gap = 4;
  const cardW = (usable - gap * 3) / 4;
  const cardH = landscape ? 18 : 20;

  const cards = [
    { label: 'Entrou', value: formatarMoeda(resumo.rendaTotal), bg: PDF_CORES.primaryLight, cor: PDF_CORES.primary },
    { label: 'Extras', value: formatarMoeda(resumo.totalEntradas), bg: PDF_CORES.successBg, cor: PDF_CORES.success },
    { label: 'Saiu', value: formatarMoeda(resumo.totalDespesas), bg: PDF_CORES.dangerBg, cor: PDF_CORES.danger },
    { label: 'Disponível', value: formatarMoeda(resumo.valorDisponivel), bg: PDF_CORES.warningBg, cor: PDF_CORES.warning }
  ];

  cards.forEach((card, i) => {
    const x = margem + i * (cardW + gap);
    doc.setFillColor(...card.bg);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');
    doc.setTextColor(...card.cor);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(card.label, x + 4, y + 7);
    doc.setTextColor(...PDF_CORES.text);
    doc.setFontSize(landscape ? 10 : 11);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, x + 4, y + cardH - 6);
  });

  return y + cardH + 7;
}

function desenharBannerSaude(doc, y, resumo) {
  const { width, margem } = obterDimensoesPagina(doc);
  const saude = obterSaudeFinanceira(resumo);
  const boxH = 11;

  doc.setFillColor(...saude.bg);
  doc.roundedRect(margem, y, width - margem * 2, boxH, 2, 2, 'F');
  doc.setTextColor(...saude.cor);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(saude.texto, margem + 5, y + 7);

  return y + boxH + 7;
}

function desenharBarraComprometimento(doc, y, resumo) {
  const { width, margem } = obterDimensoesPagina(doc);
  const boxW = width - margem * 2;
  const boxH = 16;

  doc.setFillColor(...PDF_CORES.soft);
  doc.roundedRect(margem, y, boxW, boxH, 2, 2, 'F');

  doc.setTextColor(...PDF_CORES.muted);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Quanto da renda foi usada em despesas', margem + 5, y + 5.5);

  const perc = Math.min(resumo.comprometimento, 100);
  doc.setTextColor(...PDF_CORES.text);
  doc.setFontSize(9);
  doc.text(`${perc.toFixed(0)}%`, margem + boxW - 5, y + 5.5, { align: 'right' });

  const barY = y + 9;
  const barW = boxW - 10;
  doc.setFillColor(...PDF_CORES.line);
  doc.roundedRect(margem + 5, barY, barW, 3.5, 1.5, 1.5, 'F');

  let corBarra = PDF_CORES.primary;
  if (perc >= 90) corBarra = PDF_CORES.danger;
  else if (perc >= 70) corBarra = PDF_CORES.warning;
  else if (perc < 50) corBarra = PDF_CORES.success;

  if (perc > 0) {
    doc.setFillColor(...corBarra);
    doc.roundedRect(margem + 5, barY, Math.max(barW * (perc / 100), 0.8), 3.5, 1.5, 1.5, 'F');
  }

  return y + boxH + 7;
}

function desenharBlocoResumo(doc, x, y, w, titulo, linhas) {
  const h = 10 + linhas.length * 7.2 + 4;

  doc.setFillColor(...PDF_CORES.white);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...PDF_CORES.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');

  doc.setFillColor(...PDF_CORES.primary);
  doc.roundedRect(x, y, w, 7.5, 2, 2, 'F');
  doc.setFillColor(...PDF_CORES.primary);
  doc.rect(x, y + 4, w, 3.5, 'F');
  doc.setTextColor(...PDF_CORES.white);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, x + 4, y + 5.2);

  let ly = y + 13;
  linhas.forEach(([lbl, val]) => {
    doc.setTextColor(...PDF_CORES.muted);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(lbl, x + 4, ly);
    doc.setTextColor(...PDF_CORES.text);
    doc.setFont('helvetica', 'bold');
    doc.text(val, x + w - 4, ly, { align: 'right' });
    ly += 7.2;
  });

  return h;
}

function desenharSecaoResumos(doc, y, resumo, landscape) {
  const { width, margem } = obterDimensoesPagina(doc);
  const gap = 5;
  const usable = width - margem * 2;

  y = desenharTituloSecao(doc, y, 'Resumo do mês');

  const linhasFinanceiro = [
    ['Salário', formatarMoeda(estado.salario)],
    ['Outras entradas', formatarMoeda(resumo.totalEntradas)],
    ['Renda total (entrou)', formatarMoeda(resumo.rendaTotal)],
    ['Total de despesas (saiu)', formatarMoeda(resumo.totalDespesas)],
    ['Saldo restante (sobrou)', formatarMoeda(resumo.saldoRestante)],
    ['Contas pendentes', String(resumo.pendentes)],
    ['Contas pagas', String(resumo.pagas)]
  ];

  const linhasInvestimento = [
    ['% do saldo investido', `${estado.percentualInvestimento || 0}%`],
    ['Valor investido', formatarMoeda(resumo.valorInvestido)],
    ['Disponível para gastar', formatarMoeda(resumo.valorDisponivel)],
    ['Qtd. de despesas', String(estado.despesas.length)],
    ['Qtd. de entradas extras', String(estado.entradas.length)]
  ];

  if (landscape) {
    const colW = (usable - gap) / 2;
    const h1 = desenharBlocoResumo(doc, margem, y, colW, 'Entradas e saídas', linhasFinanceiro);
    const h2 = desenharBlocoResumo(doc, margem + colW + gap, y, colW, 'Investimento simulado', linhasInvestimento);
    return y + Math.max(h1, h2) + 8;
  }

  const h1 = desenharBlocoResumo(doc, margem, y, usable, 'Entradas e saídas', linhasFinanceiro);
  const h2 = desenharBlocoResumo(doc, margem, y + h1 + gap, usable, 'Investimento simulado', linhasInvestimento);
  return y + h1 + gap + h2 + 8;
}

function estilosTabelaSimples(landscape) {
  return {
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: landscape ? 8.5 : 8,
      cellPadding: landscape ? 2.8 : 2.4,
      overflow: 'linebreak',
      textColor: PDF_CORES.text,
      lineColor: PDF_CORES.line,
      lineWidth: 0.15,
      valign: 'middle'
    },
    headStyles: {
      fillColor: PDF_CORES.primary,
      textColor: PDF_CORES.white,
      fontStyle: 'bold',
      fontSize: landscape ? 8 : 7.5
    },
    footStyles: {
      fillColor: PDF_CORES.soft,
      textColor: PDF_CORES.text,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: PDF_CORES.zebra
    },
    margin: { left: 14, right: 14, bottom: 18 }
  };
}

function desenharTabelaEntradas(doc, y, resumo, landscape) {
  const { margem } = obterDimensoesPagina(doc);
  y = desenharTituloSecao(doc, y, 'Outras entradas (além do salário)');

  if (estado.entradas.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...PDF_CORES.muted);
    doc.text('Nenhuma entrada extra neste mês.', margem, y + 4);
    return y + 12;
  }

  const corpoTabela = estado.entradas.map(e => [
    e.nome,
    formatarMoeda(e.valor),
    formatarData(e.data)
  ]);

  doc.autoTable({
    startY: y,
    head: [['Descrição', 'Valor', 'Data']],
    body: corpoTabela,
    foot: [['Total de extras', formatarMoeda(resumo.totalEntradas), `${estado.entradas.length} item(ns)`]],
    ...estilosTabelaSimples(landscape),
    columnStyles: landscape
      ? { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 40 }, 2: { cellWidth: 32, halign: 'center' } }
      : { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 36 }, 2: { cellWidth: 28, halign: 'center' } }
  });

  return doc.lastAutoTable.finalY + 8;
}

function desenharTabelaDespesas(doc, y, resumo, landscape) {
  const { margem } = obterDimensoesPagina(doc);
  y = desenharTituloSecao(doc, y, 'Minhas despesas');

  if (estado.despesas.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...PDF_CORES.muted);
    doc.text('Nenhuma despesa neste mês.', margem, y + 4);
    return y + 12;
  }

  const corpoTabela = estado.despesas.map(d => [
    d.nome,
    formatarMoeda(d.valor),
    d.pagamento,
    formatarData(d.vencimento),
    formatarData(d.dataPagamento),
    d.status
  ]);

  const colStyles = landscape
    ? {
        0: { cellWidth: 52 },
        1: { halign: 'right', cellWidth: 30 },
        2: { cellWidth: 28 },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 32, halign: 'center' },
        5: { cellWidth: 24, halign: 'center' }
      }
    : {
        0: { cellWidth: 36 },
        1: { halign: 'right', cellWidth: 26 },
        2: { cellWidth: 22 },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 28, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' }
      };

  doc.autoTable({
    startY: y,
    head: [['Conta', 'Valor', 'Pagamento', 'Vencimento', 'Pago em', 'Status']],
    body: corpoTabela,
    foot: [['Total das despesas', formatarMoeda(resumo.totalDespesas), '', '', '', `${estado.despesas.length} conta(s)`]],
    ...estilosTabelaSimples(landscape),
    columnStyles: colStyles,
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 5) {
        const status = String(data.cell.raw || '');
        if (status === 'Pago') {
          data.cell.styles.textColor = PDF_CORES.success;
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'Pendente') {
          data.cell.styles.textColor = PDF_CORES.warning;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  return doc.lastAutoTable.finalY + 6;
}

function desenharTabelaHistorico(doc, y, landscape) {
  const { height } = obterDimensoesPagina(doc);

  if (!estado.historico.length) return y;

  if (y > height - 50) {
    doc.addPage();
    y = 18;
  }

  y = desenharTituloSecao(doc, y, 'Histórico mês a mês');

  const ordenado = obterHistoricoOrdenado().slice().reverse();
  const corpoTabela = ordenado.map(item => [
    formatarMesReferencia(item.mes),
    formatarMoeda(item.rendaTotal),
    formatarMoeda(item.totalDespesas),
    formatarMoeda(item.saldoRestante),
    formatarMoeda(item.valorInvestido)
  ]);

  const totais = ordenado.reduce((acc, item) => {
    acc.rendaTotal += item.rendaTotal;
    acc.totalDespesas += item.totalDespesas;
    acc.saldoRestante += item.saldoRestante;
    acc.valorInvestido += item.valorInvestido;
    return acc;
  }, { rendaTotal: 0, totalDespesas: 0, saldoRestante: 0, valorInvestido: 0 });

  doc.autoTable({
    startY: y,
    head: [['Mês', 'Entrou', 'Saiu', 'Sobrou', 'Investiu']],
    body: corpoTabela,
    foot: [[
      'Total',
      formatarMoeda(totais.rendaTotal),
      formatarMoeda(totais.totalDespesas),
      formatarMoeda(totais.saldoRestante),
      formatarMoeda(totais.valorInvestido)
    ]],
    ...estilosTabelaSimples(landscape),
    columnStyles: landscape
      ? {
          0: { cellWidth: 50 },
          1: { halign: 'right', cellWidth: 40 },
          2: { halign: 'right', cellWidth: 40 },
          3: { halign: 'right', cellWidth: 40 },
          4: { halign: 'right', cellWidth: 40 }
        }
      : {
          0: { cellWidth: 36 },
          1: { halign: 'right', cellWidth: 32 },
          2: { halign: 'right', cellWidth: 32 },
          3: { halign: 'right', cellWidth: 32 },
          4: { halign: 'right', cellWidth: 32 }
        }
  });

  y = doc.lastAutoTable.finalY + 8;

  const anos = agruparHistoricoPorAno();
  if (anos.length > 0) {
    if (y > height - 45) {
      doc.addPage();
      y = 18;
    }
    y = desenharTituloSecao(doc, y, 'Resumo por ano');

    const corpoAnual = anos.map(ano => [
      ano.ano,
      `${ano.meses} mês(es)`,
      formatarMoeda(ano.rendaTotal),
      formatarMoeda(ano.totalDespesas),
      formatarMoeda(ano.saldoRestante),
      formatarMoeda(ano.valorInvestido)
    ]);

    doc.autoTable({
      startY: y,
      head: [['Ano', 'Meses', 'Entrou', 'Saiu', 'Sobrou', 'Investiu']],
      body: corpoAnual,
      ...estilosTabelaSimples(landscape),
      columnStyles: landscape
        ? {
            0: { cellWidth: 24 },
            1: { cellWidth: 28 },
            2: { halign: 'right', cellWidth: 38 },
            3: { halign: 'right', cellWidth: 38 },
            4: { halign: 'right', cellWidth: 38 },
            5: { halign: 'right', cellWidth: 38 }
          }
        : {
            0: { cellWidth: 18 },
            1: { cellWidth: 22 },
            2: { halign: 'right', cellWidth: 28 },
            3: { halign: 'right', cellWidth: 28 },
            4: { halign: 'right', cellWidth: 28 },
            5: { halign: 'right', cellWidth: 28 }
          }
    });

    y = doc.lastAutoTable.finalY + 6;
  }

  return y;
}

function gerarPDF() {
  if (typeof window.jspdf === 'undefined') {
    mostrarToast('Biblioteca de PDF não carregada. Verifique sua conexão.');
    return;
  }

  const mesReferencia = document.getElementById('exportMes').value || '';
  const orientacao = document.querySelector('input[name="exportOrient"]:checked')?.value || 'portrait';
  const landscape = orientacao === 'landscape';
  const incluirHistorico = document.getElementById('exportHistorico')?.checked && estado.historico.length > 0;

  fecharModalExportar();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: orientacao, unit: 'mm', format: 'a4' });
  const resumo = obterResumoAtual();
  const agora = new Date();
  const dataGeracao = agora.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  let y = desenharCabecalhoPDF(doc, { mesReferencia, dataGeracao, landscape });
  y = desenharCardsKPI(doc, y, resumo, landscape);
  y = desenharBannerSaude(doc, y, resumo);
  y = desenharBarraComprometimento(doc, y, resumo);
  y = desenharSecaoResumos(doc, y, resumo, landscape);
  y = desenharTabelaEntradas(doc, y, resumo, landscape);
  y = desenharTabelaDespesas(doc, y, resumo, landscape);
  if (incluirHistorico) {
    y = desenharTabelaHistorico(doc, y, landscape);
  }

  const totalPaginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    desenharRodapePDF(doc, i, totalPaginas, { dataGeracao });
  }

  const sufixoMes = mesReferencia ? `-${mesReferencia}` : '';
  const nomeArquivo = `cofrinho${sufixoMes}-${agora.toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
  mostrarToast('PDF exportado com sucesso!', 'success');
}

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

/* =========================================================
   METAS FINANCEIRAS — CRUD
   ========================================================= */
function limparFormularioMeta() {
  document.getElementById('metaNome').value = '';
  document.getElementById('metaIcone').value = 'fa-car';
  document.getElementById('metaValorObjetivo').value = '';
  document.getElementById('metaValorAtual').value = '';
  document.getElementById('metaData').value = '';
  document.getElementById('metaDescricao').value = '';
}

function adicionarMeta() {
  const nome = document.getElementById('metaNome').value.trim();
  const icone = document.getElementById('metaIcone').value;
  const valorObjetivo = valorMascaraParaNumero(document.getElementById('metaValorObjetivo').value);
  const valorAtual = valorMascaraParaNumero(document.getElementById('metaValorAtual').value);
  const dataPrevista = document.getElementById('metaData').value;
  const descricao = document.getElementById('metaDescricao').value.trim();

  if (!nome) {
    mostrarToast('Informe um nome para a meta.');
    return;
  }
  if (isNaN(valorObjetivo) || valorObjetivo <= 0) {
    mostrarToast('Informe um valor objetivo maior que zero.');
    return;
  }
  if (valorAtual < 0) {
    mostrarToast('O valor atual não pode ser negativo.');
    return;
  }

  const agora = new Date().toISOString();
  estado.metas.push({
    id: gerarId(),
    nome,
    icone,
    valorObjetivo,
    valorAtual,
    dataPrevista,
    descricao,
    prioridade: false,
    criadaEm: agora,
    aportes: valorAtual > 0 ? [{ id: gerarId(), valor: valorAtual, data: agora }] : []
  });

  registrarAtividade('meta', `Meta "${nome}" criada`, valorObjetivo);
  salvarDados();
  renderizarMetas();
  renderizarAtividades();
  atualizarDashboard();
  limparFormularioMeta();
  mostrarToast('Meta criada com sucesso!', 'success');
}

function confirmarExclusaoMeta(id) {
  const meta = estado.metas.find(m => m.id === id);
  if (!meta) return;
  abrirModalConfirmar(
    `Deseja remover a meta "${meta.nome}"? Todo o histórico de aportes será perdido.`,
    () => excluirMeta(id),
    'Remover'
  );
}

function excluirMeta(id) {
  const meta = estado.metas.find(m => m.id === id);
  estado.metas = estado.metas.filter(m => m.id !== id);
  if (meta) registrarAtividade('meta', `Meta "${meta.nome}" removida`, null);
  salvarDados();
  renderizarMetas();
  renderizarAtividades();
  atualizarDashboard();
  mostrarToast('Meta removida.', 'success');
}

function adicionarAporteMeta(id) {
  const input = document.getElementById(`meta-aporte-${id}`);
  if (!input) return;
  const valor = valorMascaraParaNumero(input.value);
  if (isNaN(valor) || valor <= 0) {
    mostrarToast('Informe um valor válido para adicionar à meta.');
    return;
  }

  const meta = estado.metas.find(m => m.id === id);
  if (!meta) return;

  const jaConcluida = meta.valorAtual >= meta.valorObjetivo;
  meta.valorAtual += valor;
  meta.aportes = meta.aportes || [];
  meta.aportes.push({ id: gerarId(), valor, data: new Date().toISOString() });
  input.value = '';

  registrarAtividade('aporte', `Aporte na meta "${meta.nome}"`, valor);
  salvarDados();
  renderizarMetas();
  renderizarAtividades();
  atualizarDashboard();
  pulsarElemento(`meta-card-${id}`);

  const valorEl = document.querySelector(`#meta-card-${id} .atual`);
  if (valorEl) {
    valorEl.classList.remove('valor-animado');
    void valorEl.offsetWidth;
    valorEl.classList.add('valor-animado');
  }

  if (!jaConcluida && meta.valorAtual >= meta.valorObjetivo) {
    mostrarToast(`Parabéns! Meta "${meta.nome}" concluída! 🎉`, 'success');
  } else {
    mostrarToast('Valor adicionado à meta!', 'success');
  }
}

let metaEmEdicaoId = null;

function abrirModalEditarMeta(id) {
  const meta = estado.metas.find(m => m.id === id);
  if (!meta) return;
  metaEmEdicaoId = id;

  document.getElementById('editMetaNome').value = meta.nome;
  document.getElementById('editMetaIcone').value = meta.icone;
  document.getElementById('editMetaPrioridade').value = meta.prioridade ? 'sim' : 'nao';
  document.getElementById('editMetaValorObjetivo').value = formatarMoeda(meta.valorObjetivo).replace('R$', '').trim();
  document.getElementById('editMetaValorAtual').value = formatarMoeda(meta.valorAtual).replace('R$', '').trim();
  document.getElementById('editMetaData').value = meta.dataPrevista || '';
  document.getElementById('editMetaDescricao').value = meta.descricao || '';

  document.getElementById('modalEditarMeta').classList.remove('hidden');
}

function fecharModalEditarMeta() {
  document.getElementById('modalEditarMeta').classList.add('hidden');
  metaEmEdicaoId = null;
}

function salvarEdicaoMeta() {
  if (!metaEmEdicaoId) return;
  const meta = estado.metas.find(m => m.id === metaEmEdicaoId);
  if (!meta) return;

  const nome = document.getElementById('editMetaNome').value.trim();
  const icone = document.getElementById('editMetaIcone').value;
  const prioridade = document.getElementById('editMetaPrioridade').value === 'sim';
  const valorObjetivo = valorMascaraParaNumero(document.getElementById('editMetaValorObjetivo').value);
  const novoValorAtual = valorMascaraParaNumero(document.getElementById('editMetaValorAtual').value);
  const dataPrevista = document.getElementById('editMetaData').value;
  const descricao = document.getElementById('editMetaDescricao').value.trim();

  if (!nome) { mostrarToast('Informe um nome para a meta.'); return; }
  if (isNaN(valorObjetivo) || valorObjetivo <= 0) { mostrarToast('Informe um valor objetivo maior que zero.'); return; }
  if (isNaN(novoValorAtual) || novoValorAtual < 0) { mostrarToast('O valor atual não pode ser negativo.'); return; }

  const valorAjustado = novoValorAtual !== meta.valorAtual;

  meta.nome = nome;
  meta.icone = icone;
  meta.prioridade = prioridade;
  meta.valorObjetivo = valorObjetivo;
  meta.valorAtual = novoValorAtual;
  meta.dataPrevista = dataPrevista;
  meta.descricao = descricao;

  registrarAtividade('meta', `Meta "${nome}" editada`, null);
  if (valorAjustado) {
    registrarAtividade('valor', `Valor atual da meta "${nome}" ajustado manualmente`, novoValorAtual);
  }

  salvarDados();
  fecharModalEditarMeta();
  renderizarMetas();
  renderizarAtividades();
  atualizarDashboard();
  mostrarToast('Meta atualizada com sucesso!', 'success');
}

let metaHistoricoAbertoId = null;

function abrirModalHistoricoMeta(id) {
  metaHistoricoAbertoId = id;
  renderizarTimelineMeta();
  document.getElementById('modalHistoricoMeta').classList.remove('hidden');
}

function fecharModalHistoricoMeta() {
  document.getElementById('modalHistoricoMeta').classList.add('hidden');
  metaHistoricoAbertoId = null;
}

function renderizarTimelineMeta() {
  const meta = estado.metas.find(m => m.id === metaHistoricoAbertoId);
  const container = document.getElementById('timelineMetaConteudo');
  const titulo = document.getElementById('modalHistoricoMetaTitulo');
  if (!meta || !container) return;

  titulo.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Aportes — ${escaparHTML(meta.nome)}`;

  const aportes = (meta.aportes || []).slice().sort((a, b) => new Date(b.data) - new Date(a.data));

  if (!aportes.length) {
    container.innerHTML = `
      <div class="timeline-meta-empty">
        <i class="fa-solid fa-inbox"></i>
        <p>Nenhum aporte registrado ainda para esta meta.</p>
      </div>`;
    return;
  }

  container.innerHTML = aportes.map(a => `
    <div class="timeline-item">
      <div class="timeline-item-top">
        <span class="timeline-item-valor">+ ${formatarMoeda(a.valor)}</span>
        <button class="timeline-item-remove" title="Remover este aporte" onclick="excluirMovimentoMeta('${meta.id}','${a.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      <div class="timeline-item-data">${formatarDataHora(a.data)}</div>
    </div>
  `).join('');
}

function excluirMovimentoMeta(metaId, aporteId) {
  const meta = estado.metas.find(m => m.id === metaId);
  if (!meta) return;
  const aporte = (meta.aportes || []).find(a => a.id === aporteId);
  if (!aporte) return;

  meta.aportes = meta.aportes.filter(a => a.id !== aporteId);
  meta.valorAtual = Math.max(meta.valorAtual - aporte.valor, 0);

  registrarAtividade('aporte', `Aporte removido da meta "${meta.nome}"`, -aporte.valor);
  salvarDados();
  renderizarTimelineMeta();
  renderizarMetas();
  renderizarAtividades();
  atualizarDashboard();
  mostrarToast('Aporte removido.', 'success');
}

function calcularMediaMensalMeta(meta) {
  const aportes = meta.aportes || [];
  if (!aportes.length) return 0;
  const primeira = new Date(Math.min(...aportes.map(a => new Date(a.data).getTime())));
  const meses = Math.max(
    (new Date().getFullYear() - primeira.getFullYear()) * 12 + (new Date().getMonth() - primeira.getMonth()) + 1,
    1
  );
  const total = aportes.reduce((s, a) => s + a.valor, 0);
  return total / meses;
}

function calcularPrevisaoConclusao(meta) {
  const faltam = meta.valorObjetivo - meta.valorAtual;
  if (faltam <= 0) return { texto: 'Concluída', faltam: 0 };

  let media = calcularMediaMensalMeta(meta);
  if (media <= 0) media = calcularAporteMensalAtual();
  if (media <= 0) return { texto: 'Sem previsão', faltam };

  const mesesRestantes = Math.ceil(faltam / media);
  const data = new Date();
  data.setMonth(data.getMonth() + mesesRestantes);
  const texto = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return { texto: texto.charAt(0).toUpperCase() + texto.slice(1), faltam };
}

function obterIconeCategoria(icone) {
  return icone || 'fa-piggy-bank';
}

function renderizarMetas() {
  const grid = document.getElementById('metasGrid');
  const empty = document.getElementById('emptyMetas');
  if (!grid || !empty) return;

  grid.innerHTML = '';

  if (!estado.metas.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const raio = 28;
  const circunferencia = 2 * Math.PI * raio;

  estado.metas.forEach(meta => {
    const percentual = meta.valorObjetivo > 0
      ? Math.min((meta.valorAtual / meta.valorObjetivo) * 100, 100)
      : 0;
    const concluida = meta.valorAtual >= meta.valorObjetivo && meta.valorObjetivo > 0;
    const offset = circunferencia - (percentual / 100) * circunferencia;

    let infoPrazo = '';
    if (meta.dataPrevista) {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const prazo = new Date(meta.dataPrevista + 'T00:00:00');
      const atrasada = prazo < hoje && !concluida;
      infoPrazo = `<div class="meta-prazo ${atrasada ? 'atrasada' : ''}">
        <i class="fa-solid ${atrasada ? 'fa-triangle-exclamation' : 'fa-calendar'}"></i>
        ${atrasada ? 'Prazo vencido: ' : 'Previsão: '}${formatarData(meta.dataPrevista)}
      </div>`;
    }

    const card = document.createElement('article');
    card.className = `meta-card${concluida ? ' concluida' : ''}`;
    card.id = `meta-card-${meta.id}`;

    const previsao = calcularPrevisaoConclusao(meta);

    card.innerHTML = `
      <div class="meta-card-top">
        <div class="meta-ring${concluida ? ' concluida' : ''}">
          <svg viewBox="0 0 64 64">
            <circle class="track" cx="32" cy="32" r="${raio}"></circle>
            <circle class="fill" cx="32" cy="32" r="${raio}"
              stroke-dasharray="${circunferencia}" stroke-dashoffset="${offset}"></circle>
          </svg>
          <div class="ring-content">
            <i class="fa-solid ${obterIconeCategoria(meta.icone)} ring-icon"></i>
            <span class="ring-perc">${percentual.toFixed(0)}%</span>
          </div>
        </div>
        <div class="meta-card-info">
          <div class="nome">${meta.prioridade ? '<i class="fa-solid fa-star" style="color:var(--warning);font-size:12px;margin-right:5px;" title="Meta prioritária"></i>' : ''}${escaparHTML(meta.nome)}</div>
          ${meta.descricao ? `<div class="desc">${escaparHTML(meta.descricao)}</div>` : ''}
        </div>
      </div>
      ${concluida ? '<span class="meta-badge-concluida"><i class="fa-solid fa-circle-check"></i> Meta concluída</span>' : ''}
      <div class="meta-card-valores">
        <span class="atual">${formatarMoeda(meta.valorAtual)}</span>
        <span class="objetivo">de ${formatarMoeda(meta.valorObjetivo)}</span>
      </div>
      <div class="meta-bar-track"><div class="meta-bar-fill" style="width:${percentual}%"></div></div>
      <div class="meta-stats-grid">
        <div class="meta-stat faltam">
          <div class="lbl">Faltam</div>
          <div class="val">${concluida ? formatarMoeda(0) : formatarMoeda(previsao.faltam)}</div>
        </div>
        <div class="meta-stat previsao">
          <div class="lbl">Previsão</div>
          <div class="val">${concluida ? 'Concluída 🎉' : previsao.texto}</div>
        </div>
      </div>
      ${!concluida ? `
      <div class="meta-aporte-form">
        <input type="text" inputmode="decimal" id="meta-aporte-${meta.id}" placeholder="Adicionar valor" data-money
               onkeydown="if(event.key==='Enter') adicionarAporteMeta('${meta.id}')">
        <button class="btn btn-primary btn-sm" onclick="adicionarAporteMeta('${meta.id}')">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>` : ''}
      <div class="meta-card-toolbar">
        <button onclick="abrirModalHistoricoMeta('${meta.id}')"><i class="fa-solid fa-clock-rotate-left"></i> Histórico</button>
        <button onclick="abrirModalEditarMeta('${meta.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
      </div>
      <div class="meta-card-footer">
        ${infoPrazo || '<span></span>'}
        <div class="meta-card-actions">
          <button class="btn-icon delete" title="Remover meta" aria-label="Remover ${escaparHTML(meta.nome)}"
            onclick="confirmarExclusaoMeta('${meta.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);

    const novoInput = card.querySelector(`#meta-aporte-${meta.id}`);
    if (novoInput) novoInput.addEventListener('input', () => aplicarMascaraMoeda(novoInput));
  });
}

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
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { font: { family: "'Plus Jakarta Sans', sans-serif" }, boxWidth: 12, usePointStyle: true } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } } },
      y: { grid: { color: '#eef2f1' }, ticks: {
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
      plugins: { legend: { position: 'bottom', labels: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11.5 }, boxWidth: 10, usePointStyle: true } } }
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

/* =========================================================
   TOUR DE BOAS-VINDAS
   ========================================================= */
const tourSlides = [
  {
    icone: 'fa-wallet',
    pagina: 'dashboard',
    pageNome: 'Dashboard',
    destaque: null,
    titulo: 'Bem-vindo ao Cofrinho',
    texto: 'Seu painel completo para organizar salário, despesas, investimentos e metas em um só lugar. Vamos fazer um tour rápido.'
  },
  {
    icone: 'fa-chart-pie',
    pagina: 'dashboard',
    pageNome: 'Dashboard',
    destaque: '.hero-grid',
    titulo: 'Dashboard',
    texto: 'Estes cartões mostram em tempo real: total investido, patrimônio projetado, rendimentos e aporte mensal.'
  },
  {
    icone: 'fa-bullseye',
    pagina: 'dashboard',
    pageNome: 'Dashboard',
    destaque: '#dashResumoMetasCard',
    titulo: 'Resumo de metas',
    texto: 'Aqui você acompanha o progresso de todas as suas metas de uma vez.'
  },
  {
    icone: 'fa-wallet',
    pagina: 'financas',
    pageNome: 'Finanças',
    destaque: '.cards-grid',
    titulo: 'Finanças',
    texto: 'Cadastre salário, outras entradas e despesas com controle de saúde financeira.'
  },
  {
    icone: 'fa-seedling',
    pagina: 'simulador',
    pageNome: 'Simulador',
    destaque: '#painelValorInvestido',
    titulo: 'Simulador',
    texto: 'Informe quanto já tem investido e a rentabilidade mensal esperada para projeção de juros compostos.'
  },
  {
    icone: 'fa-bullseye',
    pagina: 'metas',
    pageNome: 'Metas',
    destaque: '#painelNovaMeta',
    titulo: 'Metas',
    texto: 'Defina objetivos, valores e datas para acompanhar suas conquistas.'
  },
  {
    icone: 'fa-file-pdf',
    pagina: 'config',
    pageNome: 'Configurações',
    destaque: '#configExportarItem',
    titulo: 'Exportar dados',
    texto: 'Gere um relatório completo em PDF direto no app.'
  },
  {
    icone: 'fa-wand-magic-sparkles',
    pagina: 'dashboard',
    pageNome: 'Dashboard',
    destaque: '#btnCarregarDemo',
    titulo: 'Modo Demo',
    texto: 'Explore dados fictícios para testar a aplicação a qualquer momento.'
  }
];
let tourIndice = 0;

function aplicarDestaqueTour(selector) {
  document.querySelectorAll('.tour-target-highlight').forEach(el => el.classList.remove('tour-target-highlight'));
  if (!selector) return;
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.add('tour-target-highlight');
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
}

function abrirTour() {
  tourIndice = 0;
  renderizarTourSlide();
  document.getElementById('modalTour').classList.remove('hidden');
}

function fecharTour() {
  document.getElementById('modalTour').classList.add('hidden');
  document.querySelectorAll('.tour-target-highlight').forEach(el => el.classList.remove('tour-target-highlight'));
  localStorage.setItem('meuDinheiro_tourVisto', '1');
}

function renderizarTourSlide() {
  const slide = tourSlides[tourIndice];
  mudarAba(slide.pagina);
  document.getElementById('tourPageNome').textContent = slide.pageNome;
  aplicarDestaqueTour(slide.destaque);

  document.getElementById('tourIcone').innerHTML = `<i class="fa-solid ${slide.icone}"></i>`;
  document.getElementById('tourTitulo').textContent = slide.titulo;
  document.getElementById('tourTexto').textContent = slide.texto;

  const dots = document.getElementById('tourDots');
  dots.innerHTML = tourSlides.map((_, i) =>
    `<span class="${i === tourIndice ? 'active' : ''}" onclick="tourIrPara(${i})"></span>`
  ).join('');

  document.getElementById('tourBtnVoltar').classList.toggle('hidden', tourIndice === 0);
  const btnProximo = document.getElementById('tourBtnProximo');
  const ultimo = tourIndice === tourSlides.length - 1;
  btnProximo.innerHTML = ultimo
    ? '<i class="fa-solid fa-check"></i> Começar a usar'
    : 'Próximo <i class="fa-solid fa-arrow-right"></i>';
}

function tourProximo() {
  if (tourIndice < tourSlides.length - 1) {
    tourIndice++;
    renderizarTourSlide();
  } else {
    fecharTour();
  }
}

function tourAnterior() {
  if (tourIndice > 0) {
    tourIndice--;
    renderizarTourSlide();
  }
}

function tourIrPara(i) {
  tourIndice = i;
  renderizarTourSlide();
}

/* =========================================================
   IA DO COFRINHO (Suporte Groq e Gemini)
   ========================================================= */
let iaMensagens = [];

function atualizarUIProvedor() {
  const prov = document.getElementById('configProvedor').value;
  const label = document.getElementById('iaKeyLabel');
  const desc = document.getElementById('iaKeyDesc');
  const fieldLabel = document.getElementById('iaKeyFieldLabel');
  const modeloSelect = document.getElementById('configModelo');

  if (prov === 'groq') {
    label.textContent = 'Chave da API Groq';
    desc.innerHTML = '100% gratuita! Obtenha em <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com</a>.';
    fieldLabel.textContent = 'Chave Groq (gsk_...)';
    modeloSelect.innerHTML = `
      <option value="llama-3.3-70b-versatile">(Recomendado) llama-3.3-70b — inteligente e gratuito</option>
      <option value="llama-3.1-8b-instant">llama-3.1-8b — ultra rápido</option>
      <option value="mixtral-8x7b-32768">mixtral-8x7b — alternativa gratuita</option>
    `;
  } else {
    label.textContent = 'Chave da API Gemini';
    desc.innerHTML = 'Obtenha em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">aistudio.google.com</a>.';
    fieldLabel.textContent = 'Chave Gemini (AIza...)';
    modeloSelect.innerHTML = `
      <option value="gemini-2.0-flash">(Recomendado) Gemini 2.0 Flash</option>
      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
    `;
  }
}

function salvarConfigIA() {
  const chave = document.getElementById('configApiKey').value.trim();
  const provedor = document.getElementById('configProvedor').value;
  const modelo = document.getElementById('configModelo').value;
  if (!chave) {
    mostrarToast('Insira uma chave de API antes de salvar.');
    return;
  }
  localStorage.setItem('cofrinho_provedor_ia', provedor);
  localStorage.setItem('cofrinho_apiKey', chave);
  localStorage.setItem('cofrinho_modelo', modelo);
  mostrarToast('Configurações da IA salvas!', 'success');
  inicializarIA();
}

function inicializarIA() {
  const chave = localStorage.getItem('cofrinho_apiKey');
  const provedor = localStorage.getItem('cofrinho_provedor_ia') || 'groq';
  const modelo = localStorage.getItem('cofrinho_modelo') || 'llama-3.3-70b-versatile';

  const keyInput = document.getElementById('configApiKey');
  const provSelect = document.getElementById('configProvedor');
  const modelSelect = document.getElementById('configModelo');

  if (provSelect) provSelect.value = provedor;
  atualizarUIProvedor(); 
  if (keyInput && chave) keyInput.value = chave;
  if (modelSelect) modelSelect.value = modelo;

  const noKey = document.getElementById('iaNoKey');
  const chatContainer = document.getElementById('iaChatContainer');
  const inputRow = document.getElementById('iaInputRow');

  if (noKey && chatContainer && inputRow) {
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

  atualizarEstadoIAFlutuante();
}

function construirContextoFinanceiro() {
  const totalDespesas = estado.despesas.reduce((s, d) => s + d.valor, 0);
  const totalEntradas = obterTotalEntradas();
  const rendaTotal = obterRendaTotal();
  const saldoRestante = rendaTotal - totalDespesas;
  const aporteMensal = calcularAporteMensalAtual();
  const comprometimento = rendaTotal > 0 ? ((totalDespesas / rendaTotal) * 100).toFixed(1) : '0';

  const despesasTexto = estado.despesas.length > 0
    ? estado.despesas.map(d => `  - ${d.nome}: ${formatarMoeda(d.valor)} (${d.status})`).join('\n')
    : '  (nenhuma despesa cadastrada)';

  const metasTexto = estado.metas.length > 0
    ? estado.metas.map(m => {
        const perc = m.valorObjetivo > 0 ? ((m.valorAtual / m.valorObjetivo) * 100).toFixed(0) : 0;
        return `  - ${m.nome}: ${formatarMoeda(m.valorAtual)} de ${formatarMoeda(m.valorObjetivo)} (${perc}%)${m.prioridade ? ' ⭐ prioridade' : ''}`;
      }).join('\n')
    : '  (nenhuma meta cadastrada)';

  return `Você é o assistente financeiro pessoal do app Cofrinho. Responda SEMPRE em português brasileiro, seja objetivo, amigável e use emojis com moderação.

DADOS FINANCEIROS ATUAIS DO USUÁRIO:
- Salário mensal: ${formatarMoeda(estado.salario)}
- Outras entradas extras: ${formatarMoeda(totalEntradas)}
- Renda total: ${formatarMoeda(rendaTotal)}
- Total de despesas: ${formatarMoeda(totalDespesas)} (${estado.despesas.length} conta(s))
- Comprometimento da renda: ${comprometimento}%
- Saldo livre após despesas: ${formatarMoeda(saldoRestante)}
- Percentual investido do saldo: ${estado.percentualInvestimento}%
- Aporte mensal atual: ${formatarMoeda(aporteMensal)}
- Valor já investido: ${formatarMoeda(estado.valorInvestidoAtual)}
- Rentabilidade mensal: ${estado.taxaRentabilidade}% a.m.
- Período de projeção configurado: ${estado.periodoProjecao} meses

DESPESAS:
${despesasTexto}

METAS FINANCEIRAS:
${metasTexto}

Use esses dados para responder perguntas, calcular prazos, fazer simulações e dar conselhos financeiros personalizados. Quando calcular juros compostos, use a fórmula M = P(1+i)^n + A*[(1+i)^n - 1]/i. Seja preciso nos cálculos.

VOCÊ TAMBÉM PODE ALTERAR OS DADOS DO USUÁRIO DIRETAMENTE, quando ele pedir algo como "adicione", "coloque", "aumente", "registre", "atualize", "crie", "some mais X". Para isso, além da sua resposta normal em texto, inclua uma ou mais TAGS DE AÇÃO no seguinte formato exato, cada uma em sua própria linha:

[[ACAO]]{"tipo":"NOME_DA_ACAO", ...campos...}[[/ACAO]]

Ações disponíveis:
- aportar_meta: {"tipo":"aportar_meta","meta":"NOME_EXATO_DA_META","valor":150} — soma um valor ao valor atual de uma meta específica que já existe (use o nome exatamente como aparece em METAS FINANCEIRAS acima).
- investir: {"tipo":"investir","valor":150} — soma (ou subtrai, se negativo) um valor ao "Valor já investido" geral do usuário, quando o pedido for sobre investimentos de forma genérica, sem citar uma meta específica.
- criar_meta: {"tipo":"criar_meta","nome":"Nome","valorObjetivo":1000,"valorAtual":0,"icone":"fa-car"} — cria uma meta nova. Ícones válidos: fa-car, fa-house, fa-plane, fa-graduation-cap, fa-umbrella-beach, fa-heart-pulse, fa-laptop, fa-mobile-screen, fa-gift, fa-piggy-bank.
- adicionar_despesa: {"tipo":"adicionar_despesa","nome":"Nome","valor":100,"pagamento":"PIX"}
- adicionar_entrada: {"tipo":"adicionar_entrada","nome":"Nome","valor":100}
- ajustar_salario: {"tipo":"ajustar_salario","valor":5000}
- definir_percentual_investimento: {"tipo":"definir_percentual_investimento","percentual":30}

REGRAS IMPORTANTES PARA AÇÕES:
1. Se o pedido citar o nome de uma meta (ex: "meta Carro", "fundo de emergência", "viagem"), use "aportar_meta" com esse nome, buscando o mais parecido entre as METAS FINANCEIRAS existentes.
2. Se o pedido falar apenas em "investimentos" de forma genérica, sem citar meta, use "investir".
3. Nunca invente o nome de uma meta que não existe na lista de METAS FINANCEIRAS — se o usuário quiser aportar em uma meta inexistente, pergunte se ele quer criá-la (com "criar_meta") ou confirme o nome antes de agir.
4. Você pode usar mais de uma tag [[ACAO]] na mesma resposta, uma para cada alteração pedida.
5. Sempre escreva também uma frase curta e natural confirmando o que você vai fazer, fora da tag. As tags são processadas pelo sistema e removidas antes de exibir a mensagem, então nunca refira-se a elas ou explique o formato JSON ao usuário.
6. Nunca use a tag de ação apenas para responder perguntas ou fazer simulações — use somente quando o usuário realmente pedir para alterar/adicionar/atualizar algo.`;
}

/* =========================================================
   IA — EXECUÇÃO DE AÇÕES (ALTERAÇÃO DE DADOS PELO CHAT)
   ========================================================= */
function normalizarTextoBusca(txt) {
  return (txt || '').toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
}

function encontrarMetaPorNome(nomeBusca) {
  if (!nomeBusca) return null;
  const alvo = normalizarTextoBusca(nomeBusca);
  let meta = estado.metas.find(m => normalizarTextoBusca(m.nome) === alvo);
  if (meta) return meta;
  meta = estado.metas.find(m => {
    const n = normalizarTextoBusca(m.nome);
    return n.includes(alvo) || alvo.includes(n);
  });
  return meta || null;
}

function listaNomesMetas() {
  return estado.metas.length ? estado.metas.map(m => `"${m.nome}"`).join(', ') : '(nenhuma meta cadastrada)';
}

function executarAcaoIA(acao) {
  try {
    const tipo = (acao && acao.tipo || '').toString();

    switch (tipo) {
      case 'aportar_meta': {
        const meta = encontrarMetaPorNome(acao.meta);
        const valor = Number(acao.valor);
        if (!meta) return { ok: false, mensagem: `Não encontrei a meta "${acao.meta}". Metas disponíveis: ${listaNomesMetas()}.` };
        if (isNaN(valor) || valor <= 0) return { ok: false, mensagem: `Valor inválido para o aporte na meta "${meta.nome}".` };

        const concluidaAntes = meta.valorAtual >= meta.valorObjetivo;
        meta.valorAtual += valor;
        meta.aportes = meta.aportes || [];
        meta.aportes.push({ id: gerarId(), valor, data: new Date().toISOString() });
        registrarAtividade('aporte', `Aporte via IA na meta "${meta.nome}"`, valor);

        let msg = `Adicionei ${formatarMoeda(valor)} à meta "${meta.nome}" (agora em ${formatarMoeda(meta.valorAtual)} de ${formatarMoeda(meta.valorObjetivo)}).`;
        if (!concluidaAntes && meta.valorAtual >= meta.valorObjetivo) msg += ' 🎉 Meta concluída!';
        return { ok: true, mensagem: msg };
      }

      case 'investir': {
        const valor = Number(acao.valor);
        if (isNaN(valor)) return { ok: false, mensagem: 'Valor inválido para ajuste do investimento.' };
        estado.valorInvestidoAtual = Math.max((estado.valorInvestidoAtual || 0) + valor, 0);
        registrarAtividade('aporte', 'Valor investido atualizado via IA', valor);
        return { ok: true, mensagem: `Atualizei seu valor investido em ${formatarMoeda(valor)}. Total agora: ${formatarMoeda(estado.valorInvestidoAtual)}.` };
      }

      case 'criar_meta': {
        const nome = (acao.nome || '').toString().trim();
        const valorObjetivo = Number(acao.valorObjetivo);
        const valorAtual = Number(acao.valorAtual) || 0;
        if (!nome) return { ok: false, mensagem: 'Nome da meta não informado.' };
        if (isNaN(valorObjetivo) || valorObjetivo <= 0) return { ok: false, mensagem: `Valor objetivo inválido para a meta "${nome}".` };

        const agora = new Date().toISOString();
        estado.metas.push({
          id: gerarId(),
          nome,
          icone: acao.icone || 'fa-piggy-bank',
          valorObjetivo,
          valorAtual,
          dataPrevista: acao.dataPrevista || '',
          descricao: acao.descricao || '',
          prioridade: !!acao.prioridade,
          criadaEm: agora,
          aportes: valorAtual > 0 ? [{ id: gerarId(), valor: valorAtual, data: agora }] : []
        });
        registrarAtividade('meta', `Meta "${nome}" criada via IA`, valorObjetivo);
        return { ok: true, mensagem: `Criei a meta "${nome}" com objetivo de ${formatarMoeda(valorObjetivo)}.` };
      }

      case 'adicionar_despesa': {
        const nome = (acao.nome || '').toString().trim();
        const valor = Number(acao.valor);
        if (!nome || isNaN(valor) || valor <= 0) return { ok: false, mensagem: 'Dados inválidos para adicionar a despesa.' };
        estado.despesas.push({
          id: gerarId(),
          nome,
          valor,
          pagamento: acao.pagamento || 'PIX',
          vencimento: acao.vencimento || '',
          dataPagamento: '',
          status: acao.status || 'Pendente'
        });
        registrarAtividade('valor', `Despesa "${nome}" adicionada via IA`, valor);
        return { ok: true, mensagem: `Adicionei a despesa "${nome}" de ${formatarMoeda(valor)}.` };
      }

      case 'adicionar_entrada': {
        const nome = (acao.nome || '').toString().trim();
        const valor = Number(acao.valor);
        if (!nome || isNaN(valor) || valor <= 0) return { ok: false, mensagem: 'Dados inválidos para adicionar a entrada.' };
        estado.entradas.push({ id: gerarId(), nome, valor, data: acao.data || '' });
        registrarAtividade('valor', `Entrada "${nome}" adicionada via IA`, valor);
        return { ok: true, mensagem: `Adicionei a entrada "${nome}" de ${formatarMoeda(valor)}.` };
      }

      case 'ajustar_salario': {
        const valor = Number(acao.valor);
        if (isNaN(valor) || valor <= 0) return { ok: false, mensagem: 'Valor de salário inválido.' };
        estado.salario = valor;
        registrarAtividade('valor', 'Salário atualizado via IA', valor);
        return { ok: true, mensagem: `Atualizei seu salário para ${formatarMoeda(valor)}.` };
      }

      case 'definir_percentual_investimento': {
        let percentual = Number(acao.percentual);
        if (isNaN(percentual)) return { ok: false, mensagem: 'Percentual inválido.' };
        percentual = Math.min(Math.max(percentual, 0), 100);
        const slider = document.getElementById('sliderInvestimento');
        if (slider) slider.value = percentual;
        estado.percentualInvestimento = percentual;
        return { ok: true, mensagem: `Ajustei o percentual investido do saldo para ${percentual}%.` };
      }

      default:
        return { ok: false, mensagem: `Não reconheci a ação "${tipo}".` };
    }
  } catch (e) {
    console.error('Erro ao executar ação da IA:', e, acao);
    return { ok: false, mensagem: 'Não consegui aplicar essa alteração (dados inválidos).' };
  }
}

function processarAcoesIA(texto) {
  const regex = /\[\[ACAO\]\]([\s\S]*?)\[\[\/ACAO\]\]/g;
  const resultados = [];
  let match;
  let houveAcao = false;

  while ((match = regex.exec(texto)) !== null) {
    houveAcao = true;
    let acaoObj = null;
    try {
      acaoObj = JSON.parse(match[1].trim());
    } catch (e) {
      resultados.push({ ok: false, mensagem: 'Não consegui interpretar uma das alterações solicitadas.' });
      continue;
    }
    const lista = Array.isArray(acaoObj) ? acaoObj : [acaoObj];
    lista.forEach(a => resultados.push(executarAcaoIA(a)));
  }

  const textoLimpo = texto.replace(regex, '').replace(/\n{3,}/g, '\n\n').trim();

  if (houveAcao) {
    salvarDados();
    if (typeof calcularResumo === 'function') calcularResumo();
    if (typeof renderizarMetas === 'function') renderizarMetas();
    if (typeof renderizarDespesas === 'function') renderizarDespesas();
    if (typeof renderizarEntradas === 'function') renderizarEntradas();
    if (typeof renderizarAtividades === 'function') renderizarAtividades();
    if (typeof atualizarDashboard === 'function') atualizarDashboard();

    const inputValor = document.getElementById('inputValorInvestidoAtual');
    if (inputValor) inputValor.value = estado.valorInvestidoAtual > 0 ? formatarMoeda(estado.valorInvestidoAtual) : '';
    const displayInvestido = document.getElementById('valorInvestidoAtualDisplay');
    if (displayInvestido) displayInvestido.textContent = formatarMoeda(estado.valorInvestidoAtual);
  }

  return { textoLimpo, resultados, houveAcao };
}

/* Mapa de elementos por "origem" do chat: aba normal (tab) ou widget flutuante (float) */
function elementosChatIA(origem) {
  if (origem === 'float') {
    return {
      input: document.getElementById('iaFloatInput'),
      sendBtn: document.getElementById('iaFloatSendBtn'),
      welcome: document.getElementById('iaFloatWelcome'),
      messagesEl: document.getElementById('iaFloatMessages'),
      chatContainer: document.getElementById('iaFloatChatContainer')
    };
  }
  return {
    input: document.getElementById('iaInput'),
    sendBtn: document.getElementById('iaSendBtn'),
    welcome: document.getElementById('iaWelcome'),
    messagesEl: document.getElementById('iaMessages'),
    chatContainer: document.getElementById('iaChatContainer')
  };
}

async function enviarMensagemIA(origem = 'tab') {
  const chave = localStorage.getItem('cofrinho_apiKey');
  const provedor = localStorage.getItem('cofrinho_provedor_ia') || 'groq';
  const modelo = localStorage.getItem('cofrinho_modelo') || 'llama-3.3-70b-versatile';

  if (!chave) {
    mostrarToast('Configure sua chave de API nas Configurações.', 'error');
    if (origem === 'float') fecharIAFlutuante();
    mudarAba('config');
    return;
  }

  const { input, sendBtn, welcome } = elementosChatIA(origem);
  if (!input) return;
  const texto = input.value.trim();
  if (!texto) return;

  if (welcome) welcome.style.display = 'none';
  const outroWelcome = elementosChatIA(origem === 'float' ? 'tab' : 'float').welcome;
  if (outroWelcome) outroWelcome.style.display = 'none';

  iaMensagens.push({ role: 'user', content: texto });
  renderizarMensagensIA();
  input.value = '';
  input.style.height = 'auto';

  mostrarDigitandoIA();
  scrollIAChat();
  document.querySelectorAll('#iaSendBtn, #iaFloatSendBtn').forEach(b => b.disabled = true);

  try {
    const systemPrompt = construirContextoFinanceiro();
    let conteudoResposta = '';

    if (provedor === 'groq') {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const body = {
        model: modelo,
        messages: [
          { role: 'system', content: systemPrompt },
          ...iaMensagens
        ],
        temperature: 0.7,
        max_tokens: 800
      };

      const resposta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chave}`
        },
        body: JSON.stringify(body)
      });

      if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({}));
        throw new Error(erro?.error?.message || `Erro HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();
      conteudoResposta = dados?.choices?.[0]?.message?.content || 'Não consegui gerar uma resposta.';

    } else {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}`;
      const historicoGemini = iaMensagens.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const body = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...historicoGemini,
          { role: 'user', parts: [{ text: texto }] }
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
      };

      const resposta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({}));
        throw new Error(erro?.error?.message || `Erro HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();
      conteudoResposta = dados?.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui gerar uma resposta.';
    }

    // Processa possíveis ações (alteração de dados) embutidas na resposta da IA
    const { textoLimpo, resultados, houveAcao } = processarAcoesIA(conteudoResposta);
    let conteudoFinal = textoLimpo || 'Feito!';

    if (houveAcao && resultados.length) {
      const linhas = resultados.map(r => `${r.ok ? '✅' : '⚠️'} ${r.mensagem}`);
      conteudoFinal += `\n\n${linhas.join('\n')}`;
      mostrarToast(resultados.every(r => r.ok) ? 'Dados atualizados pela IA!' : 'A IA atualizou alguns dados — veja os detalhes na conversa.', resultados.every(r => r.ok) ? 'success' : 'error');
    }

    iaMensagens.push({ role: 'assistant', content: conteudoFinal });
    if (iaMensagens.length > 20) iaMensagens = iaMensagens.slice(iaMensagens.length - 20);

  } catch (err) {
    console.error('Erro IA:', err);
    iaMensagens.push({ role: 'assistant', content: `❌ Erro ao conectar com a IA: ${err.message}` });
  } finally {
    removerDigitandoIA();
    document.querySelectorAll('#iaSendBtn, #iaFloatSendBtn').forEach(b => b.disabled = false);
    renderizarMensagensIA();
    scrollIAChat();
  }
}

function mostrarDigitandoIA() {
  document.querySelectorAll('#iaMessages, #iaFloatMessages').forEach(messagesEl => {
    if (!messagesEl) return;
    const typing = document.createElement('div');
    typing.className = 'ia-message assistant ia-typing-msg';
    typing.innerHTML = `
      <div class="ia-message-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="ia-typing"><span></span><span></span><span></span></div>
    `;
    messagesEl.appendChild(typing);
  });
}

function removerDigitandoIA() {
  document.querySelectorAll('.ia-typing-msg').forEach(t => t.remove());
}

function renderizarMensagensIA() {
  const html = iaMensagens.map(m => {
    const isUser = m.role === 'user';
    const avatar = isUser ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
    const texto = escaparHTML(m.content)
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:4px;font-size:12px;">$1</code>');
    return `
      <div class="ia-message ${m.role}">
        <div class="ia-message-avatar">${avatar}</div>
        <div class="ia-message-bubble">${texto}</div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('#iaMessages, #iaFloatMessages').forEach(el => { el.innerHTML = html; });

  if (iaMensagens.length) {
    document.querySelectorAll('#iaWelcome, #iaFloatWelcome').forEach(w => { if (w) w.style.display = 'none'; });
  }
}

function scrollIAChat() {
  document.querySelectorAll('#iaChatContainer, #iaFloatChatContainer').forEach(c => {
    if (c) c.scrollTop = c.scrollHeight;
  });
}

function usarSugestao(texto, origem = 'tab') {
  const { input } = elementosChatIA(origem);
  if (input) {
    input.value = texto;
    input.focus();
    enviarMensagemIA(origem);
  }
}

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

/* =========================================================
   PERSONALIZAÇÃO DE CORES
   ========================================================= */
function aplicarTema(primaria, primaryMid, primaryDark, primaryLight, bg, bgAccent, cardBg, cardSolid) {
  const r = document.documentElement.style;
  if (primaria)     r.setProperty('--primary',       primaria);
  if (primaryMid)   r.setProperty('--primary-mid',   primaryMid);
  if (primaryDark)  r.setProperty('--primary-dark',  primaryDark);
  if (primaryLight) r.setProperty('--primary-light', primaryLight);
  if (bg)           r.setProperty('--bg',            bg);
  if (bgAccent)     r.setProperty('--bg-accent',     bgAccent);
  if (cardBg)       r.setProperty('--card-bg',       cardBg);
  if (cardSolid)    r.setProperty('--card-solid',    cardSolid);

  if (bg && (bg.includes('0f172a') || bg.includes('1e293b'))) {
    r.setProperty('--text-main',  '#f1f5f9');
    r.setProperty('--text-muted', '#94a3b8');
    r.setProperty('--border',     '#334155');
  } else {
    r.setProperty('--text-main',  '#0f172a');
    r.setProperty('--text-muted', '#64748b');
    r.setProperty('--border',     '#e2e8f0');
  }

  if (primaria) {
    const hex = primaria.replace('#', '');
    const r2 = parseInt(hex.substring(0, 2), 16);
    const g2 = parseInt(hex.substring(2, 4), 16);
    const b2 = parseInt(hex.substring(4, 6), 16);
    document.documentElement.style.setProperty('--ring', `rgba(${r2},${g2},${b2},0.2)`);
  }
}

function salvarTema(tipo, dados) {
  const temaAtual = JSON.parse(localStorage.getItem('cofrinho_tema') || '{}');
  localStorage.setItem('cofrinho_tema', JSON.stringify({ ...temaAtual, ...dados }));
}

function carregarTema() {
  const tema = JSON.parse(localStorage.getItem('cofrinho_tema') || '{}');
  if (Object.keys(tema).length === 0) return;
  aplicarTema(
    tema.primary, tema.primaryMid, tema.primaryDark, tema.primaryLight,
    tema.bg, tema.bgAccent, tema.cardBg, tema.cardSolid
  );
  if (tema.primary) {
    document.querySelectorAll('.color-chip').forEach(el => {
      el.classList.toggle('active', el.dataset.primary === tema.primary);
    });
  }
  if (tema.bg) {
    document.querySelectorAll('.color-chip-bg').forEach(el => {
      el.classList.toggle('active', el.dataset.bg === tema.bg);
    });
  }
}

function inicializarColorPicker() {
  document.querySelectorAll('.color-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const p = chip.dataset.primary;
      const pm = chip.dataset.primaryMid;
      const pd = chip.dataset.primaryDark;
      const pl = chip.dataset.primaryLight;
      aplicarTema(p, pm, pd, pl, null, null, null, null);
      salvarTema('primary', { primary: p, primaryMid: pm, primaryDark: pd, primaryLight: pl });
      mostrarToast('Cor primária aplicada!', 'success');
    });
  });

  document.querySelectorAll('.color-chip-bg').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.color-chip-bg').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const bg = chip.dataset.bg;
      const bga = chip.dataset.bgAccent;
      const cb = chip.dataset.cardBg;
      const cs = chip.dataset.cardSolid;
      aplicarTema(null, null, null, null, bg, bga, cb, cs);
      salvarTema('bg', { bg, bgAccent: bga, cardBg: cb, cardSolid: cs });
      mostrarToast('Fundo do app alterado!', 'success');
    });
  });

  carregarTema();
}

/* =========================================================
   INICIALIZAÇÃO DO APP
   ========================================================= */
window.addEventListener('DOMContentLoaded', () => {
  carregarDados();
  inicializarMascarasMonetarias();

  if (!localStorage.getItem('meuDinheiro_tourVisto')) {
    setTimeout(abrirTour, 500);
  }

  document.getElementById('modalTour').addEventListener('click', (e) => {
    if (e.target.id === 'modalTour') fecharTour();
  });
  document.getElementById('modalEditarMeta').addEventListener('click', (e) => {
    if (e.target.id === 'modalEditarMeta') fecharModalEditarMeta();
  });
  document.getElementById('modalHistoricoMeta').addEventListener('click', (e) => {
    if (e.target.id === 'modalHistoricoMeta') fecharModalHistoricoMeta();
  });
  document.getElementById('modalEditar').addEventListener('click', (e) => {
    if (e.target.id === 'modalEditar') fecharModalEdicao();
  });
  document.getElementById('modalConfirmar').addEventListener('click', (e) => {
    if (e.target.id === 'modalConfirmar') fecharModalConfirmar();
  });
  document.getElementById('modalExportar').addEventListener('click', (e) => {
    if (e.target.id === 'modalExportar') fecharModalExportar();
  });

  document.getElementById('despesasContent').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') editarDespesa(id);
    if (btn.dataset.action === 'delete') confirmarExclusao(id);
  });

  document.getElementById('listaEntradas').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="delete-entrada"]');
    if (!btn) return;
    confirmarExclusaoEntrada(btn.dataset.id);
  });

  document.getElementById('historicoGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="delete-historico"]');
    if (!btn) return;
    confirmarRemocaoHistorico(btn.dataset.id);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('modalEditar').classList.contains('hidden')) fecharModalEdicao();
    else if (!document.getElementById('modalConfirmar').classList.contains('hidden')) fecharModalConfirmar();
    else if (!document.getElementById('modalExportar').classList.contains('hidden')) fecharModalExportar();
    else if (!document.getElementById('modalEditarMeta').classList.contains('hidden')) fecharModalEditarMeta();
    else if (!document.getElementById('modalHistoricoMeta').classList.contains('hidden')) fecharModalHistoricoMeta();
    else if (!document.getElementById('modalTour').classList.contains('hidden')) fecharTour();
  });

  inicializarColorPicker();
  inicializarIA();
});