/* =========================================================
   10-tour.js
   Tour guiado de boas-vindas (onboarding) pela interface do app.
   ========================================================= */

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

