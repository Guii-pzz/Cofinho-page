/* =========================================================
   11-ia-assistente.js
   Assistente de IA do Cofrinho: contexto financeiro, chat com Groq/Gemini e execução de ações solicitadas pelo usuário (ex.: adicionar aporte a uma meta).
   ========================================================= */

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

