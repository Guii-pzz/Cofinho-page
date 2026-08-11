/* =========================================================
   01-estado-core.js
   Estado global da aplicação, toasts, modal de confirmação genérico e persistência em localStorage (salvar/carregar/dados de demonstração).
   ========================================================= */

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

