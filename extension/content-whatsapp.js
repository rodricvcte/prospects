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
  const texto = await obterMensagemPadrao();
  if (!texto) {
    showToast("Não consegui carregar a mensagem (msg.txt).");
    return;
  }
  inserirTextoNoCampo(caixaTexto, texto);
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
