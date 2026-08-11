/* =========================================================
   13-tema.js
   Personalização de cor primária/fundo do app e o Modo Escuro (dark mode).
   ========================================================= */

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

  // Migração: versões antigas guardavam um "Fundo escuro" como opção de cor
  // (o que causava texto branco sobre cartões claros). Isso agora é tratado
  // pelo Modo Escuro dedicado, então normalizamos essa preferência antiga.
  if (tema.bg && (tema.bg.includes('0f172a') || tema.bg.includes('1e293b'))) {
    delete tema.bg; delete tema.bgAccent; delete tema.cardBg; delete tema.cardSolid;
    localStorage.setItem('cofrinho_tema', JSON.stringify(tema));
    if (localStorage.getItem('cofrinho_dark_mode') !== '1') {
      localStorage.setItem('cofrinho_dark_mode', '1');
    }
  }

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
   MODO ESCURO
   ========================================================= */
function estaModoEscuro() {
  return document.body.classList.contains('dark-mode');
}

function atualizarUIModoEscuro(ativo) {
  const switchEl = document.getElementById('darkSwitch');
  if (switchEl) switchEl.setAttribute('aria-checked', String(ativo));
  const toggleBtn = document.getElementById('btnDarkToggle');
  if (toggleBtn) toggleBtn.setAttribute('aria-pressed', String(ativo));
}

function aplicarModoEscuroSalvo() {
  const ativo = localStorage.getItem('cofrinho_dark_mode') === '1';
  document.body.classList.toggle('dark-mode', ativo);
  atualizarUIModoEscuro(ativo);
}

function alternarModoEscuro() {
  const ativo = document.body.classList.toggle('dark-mode');
  localStorage.setItem('cofrinho_dark_mode', ativo ? '1' : '0');
  atualizarUIModoEscuro(ativo);
  mostrarToast(ativo ? 'Modo escuro ativado!' : 'Modo escuro desativado!', 'success');
  // Redesenha os gráficos para que grade e legendas usem as cores corretas do tema
  if (typeof atualizarDashboardImediato === 'function') atualizarDashboardImediato();
}

