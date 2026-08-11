/* =========================================================
   06-pdf-export.js
   Geração do relatório em PDF (jsPDF): cabeçalho, cards de KPI, tabelas de entradas/despesas/histórico e rodapé.
   ========================================================= */

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

