/* =========================================================
   14-main-init.js
   Ponto de entrada: inicialização do app no DOMContentLoaded (listeners de modais, atalhos de teclado etc.).
   ========================================================= */

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
  aplicarModoEscuroSalvo();
  inicializarIA();
});