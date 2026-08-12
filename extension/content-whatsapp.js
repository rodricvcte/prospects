// Só a Função 3 roda no WhatsApp Web (Funções 1 e 2 são específicas do Instagram).
//
// Este arquivo está temporariamente cheio de console.log — todos prefixados com
// "[Prospects]" — pra diagnosticar nome comercial, região e mensagem no WhatsApp
// Web real. NÃO REMOVER até confirmar visualmente, com print/transcrição do
// console, que os 3 campos preenchem certo num teste real.

const PADRAO_TELEFONE = /^[+\d][\d\s()+-]{6,}$/;

// Textos genéricos do próprio WhatsApp Web que podem aparecer no cabeçalho e
// não identificam o contato de verdade: convite pra abrir dados do contato
// ("clique para mostrar..."), ou o badge de conta comercial ("Conta comercial",
// "Business Account"). Nenhum desses deve virar o "nome" do prospect.
function textoPareceLixo(texto) {
  if (!texto) return true;
  if (texto.length > 40) return true;
  const minusculo = texto.toLowerCase();
  if (minusculo.includes("clique")) return true;
  if (minusculo.includes("conta comercial")) return true;
  if (minusculo.includes("business account")) return true;
  // Status de presença que aparece embaixo do nome no cabeçalho — não é o nome
  // do contato. Sem esse filtro, "visto por último hoje às 13:42" já foi salvo
  // como nome_prospect.
  if (minusculo.includes("visto por último")) return true;
  if (minusculo.includes("last seen")) return true;
  if (minusculo === "online") return true;
  if (minusculo.includes("digitando")) return true;
  if (minusculo.includes("gravando áudio")) return true;
  return false;
}

// Junta todo texto candidato de um container (cabeçalho ou painel de dados do
// contato) sem repetição, na ordem em que aparecem no DOM.
function candidatosTexto(container) {
  const elementos = container.querySelectorAll("span[title], span[dir='auto']");
  const vistos = new Set();
  const candidatos = [];
  elementos.forEach((el) => {
    const texto = (el.getAttribute("title") || el.textContent || "").trim();
    if (texto && !vistos.has(texto)) {
      vistos.add(texto);
      candidatos.push(texto);
    }
  });
  return candidatos;
}

function extrairContatoWhatsapp(header) {
  if (!header) {
    console.log("[Prospects] extrairContatoWhatsapp: #main header NÃO encontrado");
    return { nome: "", numero: "", ehContaComercial: false };
  }

  const candidatos = candidatosTexto(header);
  console.log("[Prospects] extrairContatoWhatsapp: candidatos brutos no cabeçalho =", candidatos);

  const ehContaComercial = candidatos.some((t) => {
    const m = t.toLowerCase();
    return m.includes("conta comercial") || m.includes("business account");
  });
  console.log("[Prospects] extrairContatoWhatsapp: badge de conta comercial detectado?", ehContaComercial);

  const candidatosLimpos = candidatos.filter((t) => !textoPareceLixo(t));
  console.log("[Prospects] extrairContatoWhatsapp: candidatos após filtro de lixo =", candidatosLimpos);

  const numeroCandidato = candidatosLimpos.find((t) => PADRAO_TELEFONE.test(t)) || "";
  const nomeCandidato = candidatosLimpos.find((t) => t !== numeroCandidato) || "";

  let nome;
  if (nomeCandidato) {
    nome = nomeCandidato;
  } else if (ehContaComercial) {
    // Não usa o número como "nome" aqui de propósito: vamos tentar o painel de
    // Dados do contato pra achar o nome do negócio; se falhar, fica vazio mesmo.
    nome = "";
  } else {
    // Contato comum não salvo, sem nome separado: o próprio número serve de nome.
    nome = numeroCandidato;
  }

  const resultado = { nome, numero: numeroCandidato, ehContaComercial };
  console.log("[Prospects] extrairContatoWhatsapp: resultado final =", resultado);
  return resultado;
}

// Heurística: pega a última bolha de mensagem ENVIADA (não recebida) na conversa
// aberta. Como o fluxo de prospecção normalmente começa com uma única mensagem,
// isso costuma corresponder à mensagem de approach — mas se houver troca de
// mensagens na conversa, pode pegar a mensagem errada (por isso o campo continua
// editável). Se não encontrar nada (inclusive quando ainda não foi enviada
// nenhuma mensagem nessa conversa, ou quando a última mensagem é uma mídia sem
// texto), retorna string vazia sem lançar erro.
//
// Pega a PRIMEIRA (não a última) porque essa é a mensagem de approach de
// verdade — se a conversa já teve troca de mensagens desde então, a última
// pode ser uma resposta do prospect ou um follow-up, não o approach inicial.
//
// A classe .message-out/.message-in não existe mais no WhatsApp Web atual
// (confirmado inspecionando o DOM real - retornava sempre 0 elementos). O sinal
// confiável hoje é o ícone da "cauda" da bolha: data-icon="tail-out" pra
// mensagem enviada por mim, "tail-in" pra recebida. .selectable-text continua
// funcionando normalmente pra extrair o texto.
//
// Mensagens de texto carregam um atributo data-pre-plain-text no formato
// "[HH:MM, DD/MM/YYYY] Nome: " (confirmado no DOM real) — usamos isso pra
// extrair a data/hora exata do approach. Mensagens de mídia (imagem, GIF,
// figurinha) não têm esse atributo, só um span solto com a hora (sem data) —
// nesse caso não dá pra reconstruir a data com segurança, então data/hora fica
// vazia e o campo do formulário (editável) assume "agora" como padrão.
function parseDataHoraPrePlainText(prePlainText) {
  const match = prePlainText && prePlainText.match(/\[(\d{1,2}):(\d{2}), (\d{1,2})\/(\d{1,2})\/(\d{4})\]/);
  if (!match) return null;
  const [, hh, mm, dd, mo, yyyy] = match;
  const data = new Date(Number(yyyy), Number(mo) - 1, Number(dd), Number(hh), Number(mm));
  return Number.isNaN(data.getTime()) ? null : data;
}

// O WhatsApp Web só mantém no DOM as mensagens perto da posição de rolagem
// atual (virtualização) — mensagens antigas simplesmente não existem ali até
// rolar pra cima (confirmado no DOM real: uma conversa com histórico mostrava
// só 1 mensagem enviada até rolar). Esta função rola o painel de mensagens até
// o topo repetidamente até o histórico parar de crescer (ou um limite de
// tentativas), pra aumentar a chance de achar a mensagem realmente mais antiga.
// Não é garantia absoluta pra conversas muito longas — o campo de data/hora no
// formulário continua editável justamente por causa desse limite.
async function rolarAteInicioDaConversa() {
  const container = document.querySelector('[data-testid="conversation-panel-messages"]');
  if (!container) {
    console.log("[Prospects] rolarAteInicioDaConversa: container de mensagens não encontrado");
    return;
  }

  let ultimaAltura = -1;
  for (let tentativa = 0; tentativa < 15; tentativa++) {
    container.scrollTop = 0;
    await aguardar(300);
    const alturaAtual = container.scrollHeight;
    console.log(`[Prospects] rolarAteInicioDaConversa: tentativa ${tentativa + 1}/15, scrollHeight =`, alturaAtual);
    if (alturaAtual === ultimaAltura) break;
    ultimaAltura = alturaAtual;
  }
}

async function extrairPrimeiraMensagemEnviada() {
  try {
    await rolarAteInicioDaConversa();
    const mensagensEnviadas = document.querySelectorAll('#main [role="row"]:has([data-icon="tail-out"])');
    console.log(
      `[Prospects] extrairPrimeiraMensagemEnviada: ${mensagensEnviadas.length} linhas com data-icon="tail-out" encontradas`
    );
    if (!mensagensEnviadas.length) return { texto: "", dataHora: null };

    const primeira = mensagensEnviadas[0];
    const textoEl = primeira.querySelector(".selectable-text");
    console.log("[Prospects] extrairPrimeiraMensagemEnviada: .selectable-text encontrado na primeira bolha?", !!textoEl);
    const texto = textoEl ? extrairTextoComEmojis(textoEl).trim() : "";
    console.log("[Prospects] extrairPrimeiraMensagemEnviada: texto extraído =", JSON.stringify(texto));

    const prePlainTextEl = primeira.querySelector("[data-pre-plain-text]");
    const prePlainText = prePlainTextEl ? prePlainTextEl.getAttribute("data-pre-plain-text") : null;
    console.log("[Prospects] extrairPrimeiraMensagemEnviada: data-pre-plain-text bruto =", JSON.stringify(prePlainText));
    const dataHora = parseDataHoraPrePlainText(prePlainText);
    console.log("[Prospects] extrairPrimeiraMensagemEnviada: data/hora parseada =", dataHora);

    return { texto, dataHora };
  } catch (erro) {
    console.log("[Prospects] extrairPrimeiraMensagemEnviada: erro =", erro);
    return { texto: "", dataHora: null };
  }
}

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Extrai um número de telefone de dentro de um WID do WhatsApp (formato
// "<numero>:<device>@c.us" ou "<numero>@c.us"). Retorna null se o texto não
// tiver o formato esperado ou o número tiver poucos dígitos pra ser válido.
function extrairNumeroDeWid(texto) {
  const match = texto.match(/(\d{10,15}):?\d*@c\.us/);
  if (!match) return null;
  return match[1];
}

// Detecta automaticamente o número da conta de WhatsApp conectada nesta aba
// (o "Sender"), pra não depender da seleção manual no popup da extensão.
// Tenta primeiro a chave "last-wid-md" (onde o WhatsApp Web historicamente
// grava o WID da conta logada em multi-device) e, se não achar nada
// utilizável ali, varre TODAS as chaves do localStorage procurando qualquer
// valor no formato de WID — a chave certa pode ter mudado de nome numa
// atualização do WhatsApp. Log pesado em cada etapa: não é API
// pública/documentada, então quando parar de funcionar de novo os logs
// devem apontar exatamente o que está (ou não está) disponível. Best-effort:
// qualquer falha retorna null e o formulário cai de volta pra seleção manual salva.
function obterNumeroProprioWhatsapp() {
  try {
    const bruto = localStorage.getItem("last-wid-md");
    console.log("[Prospects] obterNumeroProprioWhatsapp: localStorage['last-wid-md'] =", JSON.stringify(bruto));

    let numero = bruto ? extrairNumeroDeWid(bruto) : null;

    if (!numero) {
      console.log("[Prospects] obterNumeroProprioWhatsapp: 'last-wid-md' não serviu, escaneando todo o localStorage...");
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        const valor = localStorage.getItem(chave);
        if (!valor) continue;
        const candidato = extrairNumeroDeWid(valor);
        if (candidato) {
          console.log(`[Prospects] obterNumeroProprioWhatsapp: candidato achado em localStorage['${chave}'] =`, valor.slice(0, 200));
          numero = candidato;
          break;
        }
      }
    }

    console.log("[Prospects] obterNumeroProprioWhatsapp: número final extraído =", numero);
    if (!numero) return null;

    const resultado = `+${numero}`;
    console.log("[Prospects] obterNumeroProprioWhatsapp: resultado final =", resultado);
    return resultado;
  } catch (erro) {
    console.log("[Prospects] obterNumeroProprioWhatsapp: erro =", erro);
    return null;
  }
}

// O cabeçalho da conversa nem sempre mostra nome E número ao mesmo tempo:
// contato salvo mostra só o nome; conta comercial não salva pode esconder o
// nome do negócio atrás de um clique. O painel "Dados do contato" mostra os
// dois (confirmado inspecionando o DOM real). Esta função abre esse painel
// programaticamente, tenta extrair o que estiver faltando, e SEMPRE fecha o
// painel de volta antes de retornar, pra não deixar a UI do WhatsApp alterada.
// Só é chamada depois que mensagem e cabeçalho já foram extraídos, pra não
// arriscar que a abertura/fechamento do painel bagunce o DOM da área de
// mensagens no meio de outra extração. É best-effort: qualquer falha (painel
// não abre, seletor não bate) retorna campos vazios silenciosamente, sem
// travar o fluxo — nunca um texto genérico fixo.
// Esconde visualmente o painel de "Dados do contato" (opacity, não
// display:none, pra não interferir na lógica de abrir/fechar que depende
// dele estar montado no DOM) enquanto extrairDadosViaPainel abre/fecha ele
// em segundo plano. Sem isso, o usuário via um flash da tela de detalhes do
// contato toda vez que a checagem automática rodava num contato salvo.
function ocultarPainelTemporariamente() {
  const style = document.createElement("style");
  style.textContent = `
    [data-testid="drawer-right"], div[role="complementary"] {
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
  return () => style.remove();
}

async function extrairDadosViaPainel(header) {
  console.log("[Prospects] extrairDadosViaPainel: iniciando...");
  const removerEstiloOculto = ocultarPainelTemporariamente();
  try {
    const alvoClique = header.querySelector('[role="button"]') || header;
    console.log(
      "[Prospects] extrairDadosViaPainel: elemento clicável =",
      alvoClique === header ? "header inteiro (fallback, não achou [role=button])" : "achou [role=button] dentro do header"
    );

    alvoClique.click();
    console.log("[Prospects] extrairDadosViaPainel: clique disparado, aguardando painel...");

    let painel = null;
    for (let tentativa = 0; tentativa < 10; tentativa++) {
      await aguardar(150);
      painel =
        document.querySelector('[data-testid="drawer-right"]') ||
        document.querySelector('div[role="complementary"]');
      console.log(`[Prospects] extrairDadosViaPainel: tentativa ${tentativa + 1}/10, painel encontrado?`, !!painel);
      if (painel) break;
    }

    let nome = "";
    let numero = "";
    if (painel) {
      const candidatos = candidatosTexto(painel);
      console.log("[Prospects] extrairDadosViaPainel: candidatos no painel =", candidatos);

      const candidatosLimpos = candidatos.filter((t) => !textoPareceLixo(t));
      numero = candidatosLimpos.find((t) => PADRAO_TELEFONE.test(t)) || "";
      nome = candidatosLimpos.find((t) => t !== numero) || "";
    } else {
      console.log("[Prospects] extrairDadosViaPainel: painel nunca apareceu (timeout de 1.5s)");
    }
    console.log("[Prospects] extrairDadosViaPainel: nome =", JSON.stringify(nome), "| número =", JSON.stringify(numero));

    if (painel) {
      const botaoFechar =
        painel.querySelector('[data-testid="btn-back"]') ||
        painel.querySelector('[aria-label="Fechar"]') ||
        painel.querySelector('[aria-label="Close"]');
      console.log("[Prospects] extrairDadosViaPainel: botão de fechar encontrado?", !!botaoFechar);
      if (botaoFechar) {
        botaoFechar.click();
      } else {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        console.log("[Prospects] extrairDadosViaPainel: botão de fechar não encontrado, disparei Escape como fallback");
      }
    }

    return { nome, numero };
  } catch (erro) {
    console.log("[Prospects] extrairDadosViaPainel: erro =", erro);
    return { nome: "", numero: "" };
  } finally {
    removerEstiloOculto();
  }
}

// --- Checagem automática ao abrir/trocar de conversa (equivalente à Função 1
// do Instagram, mas pro WhatsApp Web) ---
//
// O WhatsApp Web não muda a URL por conversa (fica em /), então não dá pra
// detectar troca de conversa pela URL como no Instagram — em vez disso,
// comparamos o texto bruto do cabeçalho a cada checagem. Só rodamos a
// extração completa (com logs) quando esse texto muda de verdade, pra não
// spammar o console a cada 1.2s sem necessidade.
//
// Contato salvo (com nome) normalmente NÃO mostra o número no cabeçalho — só
// o nome. Nesse caso abrimos o painel de "Dados do contato" (mesma função
// usada no fluxo manual de Registrar Approach) só pra pegar o número, e
// fechamos de novo em seguida; isso causa um flash rápido do painel na
// primeira vez que a conversa é aberta, mas é o único jeito confiável de
// achar o número pra contato salvo. Só roda uma vez por troca de conversa
// (guardado pelo chaveRapida acima), não a cada 1.2s.
let ultimaChaveHeaderVerificada = undefined;

async function verificarConversaAtual() {
  const header = document.querySelector("#main header");
  const chaveRapida = header ? header.textContent.trim() : "";
  if (chaveRapida === ultimaChaveHeaderVerificada) return;
  ultimaChaveHeaderVerificada = chaveRapida;

  hideBanner();
  if (!header) return;

  const contato = extrairContatoWhatsapp(header);
  let numero = contato.numero;

  if (!numero) {
    console.log("[Prospects] verificarConversaAtual: sem número no cabeçalho, tentando painel de Dados do contato...");
    const doPainel = await extrairDadosViaPainel(header);
    numero = doPainel.numero;
  }

  if (!numero) return;

  console.log("[Prospects] verificarConversaAtual: checando duplicidade pro número", JSON.stringify(numero));
  chrome.runtime.sendMessage({ type: "CHECK_PROSPECT", canal: "whatsapp", valor: numero }, (resposta) => {
    if (chrome.runtime.lastError) {
      console.log("[Prospects] verificarConversaAtual: erro de comunicação =", chrome.runtime.lastError);
      return;
    }
    console.log("[Prospects] verificarConversaAtual: resposta =", resposta);
    if (resposta && resposta.found) {
      showBanner(formatarAvisoDuplicidade(resposta.prospect));
    }
  });
}

setInterval(verificarConversaAtual, 1200);
verificarConversaAtual();

// Múltiplos seletores em ordem de preferência porque a estrutura exata da
// caixa de texto do WhatsApp Web muda entre versões — sem DOM real pra
// confirmar no momento em que isso foi escrito, então o fallback mais
// genérico (qualquer contenteditable dentro do <footer>) cobre o caso dos
// mais específicos pararem de bater depois de uma atualização do WhatsApp.
function obterCaixaDeTextoWhatsapp() {
  return (
    document.querySelector('#main footer div[contenteditable="true"][data-lexical-editor="true"]') ||
    document.querySelector('#main footer div[contenteditable="true"][role="textbox"]') ||
    document.querySelector('#main footer div[contenteditable="true"]')
  );
}

criarBotaoColarMensagem(async () => {
  console.log("[Prospects] === Colar mensagem clicado (WhatsApp) ===");
  const caixaTexto = obterCaixaDeTextoWhatsapp();
  if (!caixaTexto) {
    showToast("Não encontrei a caixa de mensagem — abra uma conversa e tente de novo.");
    return;
  }
  const opcoes = await obterOpcoesMensagem();
  if (opcoes.length === 0) {
    showToast("Não consegui carregar a mensagem (msg.txt).");
    return;
  }
  if (opcoes.length === 1) {
    inserirTextoNoCampo(caixaTexto, opcoes[0].texto);
    return;
  }
  mostrarMenuOpcoesMensagem(opcoes, (texto) => {
    const caixaAtual = obterCaixaDeTextoWhatsapp() || caixaTexto;
    inserirTextoNoCampo(caixaAtual, texto);
  });
});

criarBotaoFlutuante(async () => {
  console.log("[Prospects] === Registrar Approach clicado (WhatsApp) ===");
  const header = document.querySelector("#main header");
  console.log("[Prospects] header (#main header) encontrado?", !!header);

  // Mensagem e cabeçalho são lidos ANTES de qualquer interação com o painel de
  // contato, pra abertura/fechamento do painel (função 1) não arriscar
  // bagunçar essas extrações.
  const contato = extrairContatoWhatsapp(header);
  const { texto: msgUtilizada, dataHora: dataHoraApproach } = await extrairPrimeiraMensagemEnviada();

  let nomeProspect = contato.nome;
  let numeroProspect = contato.numero;

  const faltaNome = !nomeProspect || PADRAO_TELEFONE.test(nomeProspect);
  const faltaNumero = !numeroProspect;
  console.log("[Prospects] vai tentar abrir painel de Dados do contato?", (faltaNome || faltaNumero) && !!header, {
    faltaNome,
    faltaNumero,
  });

  if (header && (faltaNome || faltaNumero)) {
    const doPainel = await extrairDadosViaPainel(header);
    // Só melhora o resultado (nunca piora): se o painel não achar algo, o
    // valor original é mantido (número/nome do cabeçalho, ou vazio — nunca um
    // texto genérico fixo).
    if (doPainel.nome) nomeProspect = doPainel.nome;
    if (doPainel.numero) numeroProspect = doPainel.numero;
  }

  const regiao = regiaoPorTelefone(numeroProspect);
  console.log("[Prospects] região calculada a partir do número", JSON.stringify(numeroProspect), "=", regiao);
  console.log(
    "[Prospects] data/hora do approach (1ª mensagem enviada):",
    dataHoraApproach ? dataHoraApproach.toString() : "não identificada, formulário vai usar 'agora' como padrão"
  );

  const numeroNormalizado = normalizarContaDestino("whatsapp", numeroProspect);
  let origemInstagram = await buscarHandoffInstagram(numeroNormalizado);
  console.log("[Prospects] origem_instagram via handoff (número", JSON.stringify(numeroNormalizado), ") =", origemInstagram);

  // "baixa" porque o fallback abaixo não está ligado a este número específico
  // (é só "o último perfil que o usuário clicou em algum lugar nos últimos 15
  // min") — o formulário deve deixar isso visível pro usuário conferir antes
  // de salvar, em vez de aplicar silenciosamente como se fosse confirmado.
  let origemInstagramConfianca = "alta";

  if (!origemInstagram) {
    // Sem handoff preciso por número (ex: link de bio passou por um
    // agregador externo tipo Beacons/Linktree, sem como extrair o número de
    // lá) — cai pro fallback de curta duração: último perfil do Instagram em
    // que o usuário clicou um link parecido com WhatsApp.
    origemInstagram = await buscarUltimoPerfilInstagramVisitado();
    origemInstagramConfianca = "baixa";
    console.log("[Prospects] origem_instagram via fallback (último perfil visitado) =", origemInstagram);
  }

  const contaOrigemAuto = obterNumeroProprioWhatsapp();

  console.log("[Prospects] prefill final enviado ao formulário:", {
    contaOrigemAuto,
    contaDestino: numeroProspect,
    nomeProspect,
    msgUtilizada,
    regiao,
    dataHoraApproach,
    origemInstagram,
    origemInstagramConfianca,
  });

  abrirFormularioApproach({
    canal: "whatsapp",
    contaOrigem: contaOrigemAuto || undefined,
    contaDestino: numeroProspect,
    nomeProspect,
    msgUtilizada,
    regiao,
    dataHoraApproach,
    origemInstagram,
    origemInstagramConfianca: origemInstagram ? origemInstagramConfianca : undefined,
  });
});

// --- Arquivar conversa: captura o histórico completo da conversa aberta e
// salva no prospect correspondente (ver salvarHistoricoConversaWhatsapp no
// servidor). Reaproveita extrairContatoWhatsapp/extrairDadosViaPainel (achar
// o telefone) e rolarAteInicioDaConversa (garantir que tudo foi carregado)
// da Função 3 acima, em vez de duplicar essa lógica — mas, diferente da
// Função 3, não basta rolar até o topo e ler o DOM uma vez: a lista é
// virtualizada (só uma janela de mensagens fica montada por vez), então
// depois de garantir que carregou tudo, ainda é preciso varrer a conversa
// inteira coletando a cada passo (ver extrairHistoricoConversa abaixo). ---

const TEXTO_BOTAO_ARQUIVAR_PADRAO = "🗂️ Arquivar conversa";

function mostrarStatusArquivar(botao, texto, { finalizar = false, atraso = 3000 } = {}) {
  botao.textContent = texto;
  if (finalizar) {
    setTimeout(() => {
      botao.disabled = false;
      botao.textContent = TEXTO_BOTAO_ARQUIVAR_PADRAO;
    }, atraso);
  }
}

// Descoberta comparando a captura com o texto real copiado do WhatsApp: o
// WhatsApp Web agrupa várias mensagens CONSECUTIVAS do mesmo remetente
// dentro da MESMA linha [role="row"] (só a última bolha do grupo mostra o
// ícone de cauda) — um querySelector(".selectable-text") escopado na row
// (singular) só pegava a PRIMEIRA bolha de cada grupo, descartando o resto
// em silêncio. Por isso não usamos mais [role="row"] pra extrair o TEXTO das
// mensagens: cada mensagem de texto individual — mesmo agrupada — tem seu
// próprio elemento [data-pre-plain-text] no formato
// "[HH:MM, DD/MM/YYYY] Nome: ", então varrer esse seletor direto na página
// (sem passar pela row) dá uma leitura por mensagem de verdade, já com nome
// e hora exatos, não importa como o WhatsApp agrupou as bolhas visualmente.
function extrairNomeDoPrePlainText(prePlainText) {
  const match = prePlainText && prePlainText.match(/^\[\d{1,2}:\d{2}, \d{1,2}\/\d{1,2}\/\d{4}\] (.+): $/);
  return match ? match[1] : null;
}

// Uma conversa 1:1 só tem dois remetentes possíveis. Descobrimos qual Nome
// corresponde a "Agência" (mensagem enviada, tem tail-out) e qual a "Lead"
// (recebida, tail-in) varrendo as linhas que ainda têm o ícone de cauda —
// mesmo pegando só a última bolha de cada grupo, isso já basta pra mapear o
// Nome pro remetente certo, porque o Nome é o mesmo em todas as bolhas do
// grupo. Esse mapa depois resolve o remetente de QUALQUER mensagem
// individual encontrada via [data-pre-plain-text], grupada ou não.
// Mescla no mapa existente (não recria do zero) porque nomes novos podem
// aparecer só depois de rolar mais — chamado a cada passo da varredura,
// nunca esquece um nome já resolvido antes mesmo que a row original saia do
// DOM de novo.
function atualizarMapaRemetentePorNome(mapaRemetentePorNome) {
  document.querySelectorAll('#main [role="row"]').forEach((linha) => {
    const enviada = !!linha.querySelector('[data-icon="tail-out"]');
    const recebida = !!linha.querySelector('[data-icon="tail-in"]');
    if (!enviada && !recebida) return;
    const prePlainTextEl = linha.querySelector('[data-pre-plain-text]');
    const prePlainText = prePlainTextEl ? prePlainTextEl.getAttribute('data-pre-plain-text') : null;
    const nome = extrairNomeDoPrePlainText(prePlainText);
    if (nome && !mapaRemetentePorNome.has(nome)) {
      mapaRemetentePorNome.set(nome, enviada ? "Agência" : "Lead");
    }
  });
}

function resolverRemetente(nome, mapaRemetentePorNome, contatoNome) {
  const doMapa = nome ? mapaRemetentePorNome.get(nome) : undefined;
  if (doMapa) return doMapa;
  if (nome && contatoNome && nome.trim().toLowerCase() === contatoNome.trim().toLowerCase()) return "Lead";
  return "Agência";
}

// Passo 1: mensagens de TEXTO — uma leitura por [data-pre-plain-text] direto
// na página (ver comentário acima), não por row.
function coletarMensagensDeTexto(mapa, estado, mapaRemetentePorNome, contatoNome) {
  document.querySelectorAll('[data-pre-plain-text]').forEach((el) => {
    const prePlainText = el.getAttribute('data-pre-plain-text');
    const dataHora = parseDataHoraPrePlainText(prePlainText);
    const nome = extrairNomeDoPrePlainText(prePlainText);
    if (!dataHora || !nome) return;

    const textoEl = el.querySelector('.selectable-text') || (el.classList.contains('selectable-text') ? el : null);
    const texto = textoEl ? extrairTextoComEmojis(textoEl).trim() : "";
    if (!texto) return;

    estado.ultimaDataConhecida = dataHora;
    const remetente = resolverRemetente(nome, mapaRemetentePorNome, contatoNome);

    if (!mapa.has(prePlainText)) {
      mapa.set(prePlainText, { remetente, texto, data_hora: dataHora.toISOString() });
    }
  });
}

// Passo 2: mensagens de MÍDIA sem legenda — não têm data-pre-plain-text, só
// dá pra achar via a própria row com ícone de cauda. Só entra aqui quando a
// row não tem NENHUM [data-pre-plain-text] dentro (senão já foi coberta pelo
// passo 1, mensagem de texto de verdade). Usa a última data conhecida como
// aproximação. Chave de dedup SEM contador/índice de propósito: um índice
// que muda a cada nova chamada (a varredura re-coleta a mesma mídia a cada
// passo de rolagem) faria a MESMA mídia entrar várias vezes como linhas
// diferentes — pior que o problema oposto. O trade-off aceito aqui é
// subcontar (duas mídias sem legenda do mesmo remetente no mesmo minuto
// colapsam numa só) em vez de duplicar.
function coletarMensagensDeMidia(mapa, estado) {
  document.querySelectorAll('#main [role="row"]').forEach((linha) => {
    const enviada = !!linha.querySelector('[data-icon="tail-out"]');
    const recebida = !!linha.querySelector('[data-icon="tail-in"]');
    if (!enviada && !recebida) return;
    if (linha.querySelector('[data-pre-plain-text]')) return;

    const remetente = enviada ? "Agência" : "Lead";
    const dataHoraIso = estado.ultimaDataConhecida ? estado.ultimaDataConhecida.toISOString() : null;
    const chave = `midia|${remetente}|${dataHoraIso || ""}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, { remetente, texto: "[mensagem sem texto]", data_hora: dataHoraIso });
    }
  });
}

function coletarMensagensVisiveis(mapa, estado, mapaRemetentePorNome, contatoNome) {
  atualizarMapaRemetentePorNome(mapaRemetentePorNome);
  coletarMensagensDeTexto(mapa, estado, mapaRemetentePorNome, contatoNome);
  coletarMensagensDeMidia(mapa, estado);
}

// Espera baseada em MutationObserver, não em setTimeout fixo: um atraso fixo
// (ex: 300ms) ou funciona rápido demais em máquinas lentas / listas grandes
// (a virtualização ainda não terminou de montar as linhas novas quando a
// gente já foi ler o DOM — mensagens "pulam") ou é lento demais à toa quando
// o render já tinha terminado bem antes. Aqui espera o container realmente
// parar de sofrer mutação (nenhum childList novo por TEMPO_SILENCIO_MS
// seguidos) antes de liberar a coleta, com um teto de TIMEOUT_MAX_MS pra não
// travar pra sempre se, por algum motivo, o DOM ficar mudando sem parar.
function esperarDomEstabilizar(container, { tempoSilencioMs = 200, timeoutMaxMs = 2500 } = {}) {
  return new Promise((resolve) => {
    let resolvido = false;
    let timeoutSilencio;

    const finalizar = () => {
      if (resolvido) return;
      resolvido = true;
      clearTimeout(timeoutSilencio);
      clearTimeout(timeoutTotal);
      observer.disconnect();
      resolve();
    };

    const observer = new MutationObserver(() => {
      clearTimeout(timeoutSilencio);
      timeoutSilencio = setTimeout(finalizar, tempoSilencioMs);
    });

    observer.observe(container, { childList: true, subtree: true });
    timeoutSilencio = setTimeout(finalizar, tempoSilencioMs);
    const timeoutTotal = setTimeout(finalizar, timeoutMaxMs);
  });
}

// O WhatsApp Web usa lista virtualizada de verdade: mesmo depois do histórico
// inteiro estar CARREGADO (scrollHeight parado de crescer — ver
// rolarAteInicioDaConversa), só uma janela de mensagens perto da posição
// atual de rolagem fica MONTADA no DOM. Rolar em passos grandes pode pular
// uma janela inteira entre duas coletas sem nunca montar aquele trecho. Passo
// pequeno (25% da altura visível) garante boa sobreposição entre coletas
// consecutivas, e a coleta só acontece depois do DOM estabilizar (ver
// esperarDomEstabilizar acima) — não depois de um tempo fixo arbitrário.
async function varrerColetando(container, mapa, estado, mapaRemetentePorNome, contatoNome, direcao) {
  const DISTANCIA_FRACAO = 0.25;
  const MAX_PASSOS = 400;

  for (let tentativa = 0; tentativa < MAX_PASSOS; tentativa++) {
    const scrollTopAntes = container.scrollTop;

    if (direcao === "baixo") {
      const maximo = container.scrollHeight - container.clientHeight;
      if (scrollTopAntes >= maximo - 1) break;
      container.scrollTop = Math.min(maximo, scrollTopAntes + container.clientHeight * DISTANCIA_FRACAO);
    } else {
      if (scrollTopAntes <= 0) break;
      container.scrollTop = Math.max(0, scrollTopAntes - container.clientHeight * DISTANCIA_FRACAO);
    }

    await esperarDomEstabilizar(container);
    coletarMensagensVisiveis(mapa, estado, mapaRemetentePorNome, contatoNome);
    console.log(
      `[Prospects] extrairHistoricoConversa: varredura ${direcao}, passo ${tentativa + 1}/${MAX_PASSOS}, scrollTop =`,
      container.scrollTop,
      "| total coletado =",
      mapa.size,
    );
  }
}

// 1) rolarAteInicioDaConversa (já validada na Função 3) garante que TODO o
//    histórico foi buscado do servidor/IndexedDB, não só o que já está
//    visível — repete "voltar pro topo" até scrollHeight parar de crescer.
// 2) Só depois disso faz sentido varrer com varrerColetando: a varredura
//    resolve o problema de RENDERIZAÇÃO (janela virtualizada), não o de
//    CARREGAMENTO — se ainda faltasse buscar mensagens antigas do servidor,
//    varrer não adiantaria, porque elas nem existiriam no DOM em nenhum
//    ponto da rolagem.
async function extrairHistoricoConversa(contatoNome) {
  const container = document.querySelector('[data-testid="conversation-panel-messages"]');
  console.log("[Prospects] extrairHistoricoConversa: container de rolagem encontrado?", !!container);

  if (container) {
    console.log("[Prospects] extrairHistoricoConversa: garantindo que todo o histórico foi carregado...");
    await rolarAteInicioDaConversa();
  }

  const mapa = new Map();
  const estado = { ultimaDataConhecida: null };
  const mapaRemetentePorNome = new Map();
  coletarMensagensVisiveis(mapa, estado, mapaRemetentePorNome, contatoNome);
  console.log(
    "[Prospects] extrairHistoricoConversa: coleta inicial (no topo) =",
    mapa.size,
    "| nomes mapeados =",
    Array.from(mapaRemetentePorNome.entries()),
  );

  if (container) {
    await varrerColetando(container, mapa, estado, mapaRemetentePorNome, contatoNome, "baixo");
    // Segunda passada, de volta pro topo: a primeira (com o container
    // partindo do topo) cobre a conversa inteira, mas uma passada na direção
    // oposta serve de rede de segurança pra qualquer trecho que a janela
    // virtualizada tenha deixado passar rápido demais na primeira.
    await varrerColetando(container, mapa, estado, mapaRemetentePorNome, contatoNome, "cima");
  }

  const mensagens = Array.from(mapa.values()).sort((a, b) => {
    if (!a.data_hora && !b.data_hora) return 0;
    if (!a.data_hora) return -1;
    if (!b.data_hora) return 1;
    return a.data_hora.localeCompare(b.data_hora);
  });

  console.log(`[Prospects] extrairHistoricoConversa: ${mensagens.length} mensagens extraídas no total`);
  return mensagens;
}

const botaoArquivarConversa = criarBotaoArquivarConversa(async () => {
  console.log("[Prospects] === Arquivar conversa clicado (WhatsApp) ===");
  const header = document.querySelector("#main header");
  if (!header) {
    mostrarStatusArquivar(botaoArquivarConversa, "Abra uma conversa primeiro", { finalizar: true, atraso: 3000 });
    return;
  }

  const contato = extrairContatoWhatsapp(header);

  botaoArquivarConversa.disabled = true;
  mostrarStatusArquivar(botaoArquivarConversa, "Carregando histórico...");
  const mensagens = await extrairHistoricoConversa(contato.nome);

  if (mensagens.length === 0) {
    mostrarStatusArquivar(botaoArquivarConversa, "⚠️ Conversa vazia — nada capturado", { finalizar: true, atraso: 4000 });
    return;
  }

  let numero = contato.numero;
  if (!numero) {
    console.log("[Prospects] extrairHistoricoConversa: sem número no cabeçalho, tentando painel de Dados do contato...");
    const doPainel = await extrairDadosViaPainel(header);
    numero = doPainel.numero;
  }
  if (!numero) {
    mostrarStatusArquivar(botaoArquivarConversa, "⚠️ Não identifiquei o telefone desta conversa", { finalizar: true, atraso: 4000 });
    return;
  }

  const numeroNormalizado = normalizarContaDestino("whatsapp", numero);
  console.log("[Prospects] extrairHistoricoConversa: número normalizado =", numeroNormalizado, "| total de mensagens =", mensagens.length);

  mostrarStatusArquivar(botaoArquivarConversa, "Salvando...");
  chrome.runtime.sendMessage(
    { type: "ARCHIVE_CONVERSATION", payload: { conta_destino_normalizada: numeroNormalizado, mensagens } },
    (resposta) => {
      if (chrome.runtime.lastError) {
        console.log("[Prospects] extrairHistoricoConversa: erro de comunicação =", chrome.runtime.lastError);
        mostrarStatusArquivar(botaoArquivarConversa, "❌ Erro de comunicação com a extensão", { finalizar: true, atraso: 4000 });
        return;
      }
      if (!resposta || !resposta.ok) {
        console.log("[Prospects] extrairHistoricoConversa: erro do servidor =", resposta && resposta.error);
        mostrarStatusArquivar(botaoArquivarConversa, `❌ ${(resposta && resposta.error) || "Erro ao salvar"}`, {
          finalizar: true,
          atraso: 4000,
        });
        return;
      }
      console.log("[Prospects] extrairHistoricoConversa: sucesso, total salvo =", resposta.total);
      mostrarStatusArquivar(botaoArquivarConversa, `✅ ${resposta.total} mensagens arquivadas`, { finalizar: true, atraso: 3000 });
    },
  );
});
