/* =========================================================
   04-financas.js
   CRUD de salário, despesas e outras entradas, além da renderização da tabela/cards de despesas.
   ========================================================= */

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

