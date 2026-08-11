/* =========================================================
   03-historico.js
   Histórico mensal/anual (snapshots arquivados), normalização de itens legados e o log de atividades recentes.
   ========================================================= */

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

