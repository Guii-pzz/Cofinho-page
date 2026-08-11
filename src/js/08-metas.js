/* =========================================================
   08-metas.js
   CRUD de metas financeiras: criação, edição, aportes, timeline de movimentações e cálculo de previsão de conclusão.
   ========================================================= */

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

