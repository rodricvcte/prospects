// Funções de UI compartilhadas entre content-instagram.js e content-whatsapp.js.
// Tudo é renderizado dentro de uma Shadow DOM anexada ao <body> para não sofrer
// interferência do CSS do Instagram/WhatsApp Web (e não vazar estilo pra página).

// Tanto WhatsApp Web quanto Instagram Direct renderizam emoji como <img alt="😊">
// (sprite), não como caractere Unicode direto no texto — confirmado inspecionando
// o DOM real dos dois. .textContent ignora imagens, então emojis somem
// silenciosamente se a gente não tratar isso explicitamente. Esta função
// reconstrói o texto visível andando pelos nós filhos: texto normal entra como
// está, <img> vira o valor do atributo alt (o emoji de verdade).
function extrairTextoComEmojis(elemento) {
  let resultado = "";
  elemento.childNodes.forEach((no) => {
    if (no.nodeType === Node.TEXT_NODE) {
      resultado += no.textContent;
    } else if (no.nodeType === Node.ELEMENT_NODE) {
      if (no.tagName === "IMG") {
        resultado += no.getAttribute("alt") || "";
      } else {
        resultado += extrairTextoComEmojis(no);
      }
    }
  });
  return resultado;
}

// Instagram e WhatsApp Web são páginas completamente separadas — não dá pra
// passar informação direto de uma pra outra. Usamos chrome.storage.local como
// "ponte": ao passar o mouse/clicar num link de WhatsApp no Instagram (Função
// 2), salvamos qual @ levou até aquele número. Ao registrar o approach no
// WhatsApp Web (Função 3), buscamos pelo número normalizado pra saber se esse
// contato veio de um perfil do Instagram visto antes — mesmo que o approach
// em si tenha sido enviado por WhatsApp.
const HANDOFF_STORAGE_KEY = "instagramHandoffPorNumero";
const HANDOFF_VALIDADE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

function salvarHandoffInstagram(numeroNormalizado, username) {
  if (!numeroNormalizado || !username) return;
  chrome.storage.local.get([HANDOFF_STORAGE_KEY], (resultado) => {
    if (chrome.runtime.lastError) return;
    const mapa = resultado[HANDOFF_STORAGE_KEY] || {};
    mapa[numeroNormalizado] = { username, ts: Date.now() };
    chrome.storage.local.set({ [HANDOFF_STORAGE_KEY]: mapa });
  });
}

function buscarHandoffInstagram(numeroNormalizado) {
  return new Promise((resolve) => {
    if (!numeroNormalizado) {
      resolve(null);
      return;
    }
    chrome.storage.local.get([HANDOFF_STORAGE_KEY], (resultado) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      const mapa = resultado[HANDOFF_STORAGE_KEY] || {};
      const entrada = mapa[numeroNormalizado];
      if (!entrada || Date.now() - entrada.ts > HANDOFF_VALIDADE_MS) {
        resolve(null);
        return;
      }
      resolve(entrada.username);
    });
  });
}

// Fallback pra quando não há handoff exato por número (link de bio via
// agregador externo tipo Beacons/Linktree, ou nenhum link de WhatsApp
// clicado) — guardamos qual foi o último perfil do Instagram VISITADO
// (Função 1, só de abrir o perfil, não precisa clicar em nada), sem saber
// pra qual número — validade bem mais curta que o handoff por número (é um
// sinal fraco: só serve enquanto o usuário está no meio do mesmo fluxo de
// abordagem, não pra achar de novo dias depois).
const ULTIMO_PERFIL_VISITADO_STORAGE_KEY = "ultimoPerfilInstagramVisitado";
const ULTIMO_PERFIL_VISITADO_VALIDADE_MS = 15 * 60 * 1000; // 15 minutos

function salvarUltimoPerfilInstagramVisitado(username) {
  if (!username) return;
  chrome.storage.local.set({ [ULTIMO_PERFIL_VISITADO_STORAGE_KEY]: { username, ts: Date.now() } });
}

function buscarUltimoPerfilInstagramVisitado() {
  return new Promise((resolve) => {
    chrome.storage.local.get([ULTIMO_PERFIL_VISITADO_STORAGE_KEY], (resultado) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      const entrada = resultado[ULTIMO_PERFIL_VISITADO_STORAGE_KEY];
      if (!entrada || Date.now() - entrada.ts > ULTIMO_PERFIL_VISITADO_VALIDADE_MS) {
        resolve(null);
        return;
      }
      resolve(entrada.username);
    });
  });
}

const PROSPECTS_EXT_CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }

  .banner {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483000;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 340px;
  }
  .banner button {
    background: none;
    border: none;
    color: #92400e;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0;
  }

  .toast {
    position: fixed;
    bottom: 90px;
    right: 24px;
    z-index: 2147483000;
    background: #171717;
    color: #fff;
    padding: 10px 16px;
    border-radius: 999px;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  }

  .botao-flutuante {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483000;
    background: #171717;
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 12px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
  }
  .botao-flutuante:hover { background: #2b2b2b; }

  .botao-flutuante-msg {
    position: fixed;
    bottom: 74px;
    right: 24px;
    z-index: 2147483000;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 12px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
  }
  .botao-flutuante-msg:hover { background: #1d4ed8; }

  .overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483001;
    background: rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal {
    background: #fff;
    width: 100%;
    max-width: 380px;
    max-height: 85vh;
    overflow-y: auto;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }
  .modal h2 {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 14px;
    color: #171717;
  }
  .campo { margin-bottom: 12px; }
  .campo label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #737373;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .campo input, .campo textarea, .campo .valor-fixo {
    width: 100%;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 13px;
    color: #171717;
  }
  .campo .valor-fixo {
    background: #f5f5f5;
    color: #525252;
  }
  .campo textarea { resize: vertical; min-height: 60px; }
  .erro {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 12px;
    margin-bottom: 12px;
  }
  .acoes {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
  .acoes button {
    border: none;
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }
  .btn-cancelar { background: #f5f5f5; color: #404040; }
  .btn-salvar { background: #171717; color: #fff; }
  .btn-salvar:disabled { opacity: 0.5; cursor: default; }
`;

let prospectsExtShadowRoot = null;

function getProspectsExtRoot() {
  if (prospectsExtShadowRoot) return prospectsExtShadowRoot;
  const host = document.createElement("div");
  host.id = "prospects-ext-host";
  document.body.appendChild(host);
  prospectsExtShadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = PROSPECTS_EXT_CSS;
  prospectsExtShadowRoot.appendChild(style);
  return prospectsExtShadowRoot;
}

function hideBanner() {
  const root = getProspectsExtRoot();
  const existente = root.querySelector(".banner");
  if (existente) existente.remove();
}

function showBanner(texto) {
  const root = getProspectsExtRoot();
  hideBanner();
  const banner = document.createElement("div");
  banner.className = "banner";
  const span = document.createElement("span");
  span.textContent = texto;
  const fechar = document.createElement("button");
  fechar.textContent = "✕";
  fechar.addEventListener("click", hideBanner);
  banner.appendChild(span);
  banner.appendChild(fechar);
  root.appendChild(banner);
}

function showToast(texto) {
  const root = getProspectsExtRoot();
  const existente = root.querySelector(".toast");
  if (existente) existente.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = texto;
  root.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function criarBotaoFlutuante(onClick) {
  const root = getProspectsExtRoot();
  if (root.querySelector(".botao-flutuante")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "botao-flutuante";
  btn.textContent = "+ Registrar Approach";
  btn.addEventListener("click", onClick);
  root.appendChild(btn);
}

function criarBotaoColarMensagem(onClick) {
  const root = getProspectsExtRoot();
  if (root.querySelector(".botao-flutuante-msg")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "botao-flutuante-msg";
  btn.textContent = "💬 Colar mensagem";
  btn.addEventListener("click", onClick);
  root.appendChild(btn);
}

// Texto fica em msg.txt (não em JS) de propósito — é a mensagem de
// prospecção que muda com frequência, e editar um .txt simples é mais fácil
// do que mexer em código. Cacheado após a primeira leitura: só muda de
// verdade recarregando a extensão (mesma exigência de qualquer outro arquivo
// da extensão), então não há motivo pra buscar de novo a cada clique.
let mensagemPadraoCache = null;

async function obterMensagemPadrao() {
  if (mensagemPadraoCache !== null) return mensagemPadraoCache;
  try {
    const resposta = await fetch(chrome.runtime.getURL("msg.txt"));
    mensagemPadraoCache = (await resposta.text()).replace(/\r\n/g, "\n").trim();
  } catch (erro) {
    console.warn("[Prospects] obterMensagemPadrao: erro ao carregar msg.txt", erro);
    mensagemPadraoCache = "";
  }
  return mensagemPadraoCache;
}

// Insere texto numa caixa contenteditable (WhatsApp Web e Instagram Direct
// usam editores estilo Lexical, não um <textarea> comum) simulando o cursor
// no final e usando execCommand("insertText") — diferente de setar
// .textContent ou disparar eventos sintéticos, isso gera um evento de input
// "de verdade" que o editor escuta e processa corretamente (inclusive
// quebras de linha dentro do texto, sem disparar o envio da mensagem, já
// que não é um keydown de Enter de verdade).
function inserirTextoNoCampo(elemento, texto) {
  elemento.focus();
  const selecao = document.getSelection();
  selecao.removeAllRanges();
  const range = document.createRange();
  range.selectNodeContents(elemento);
  range.collapse(false);
  selecao.addRange(range);
  document.execCommand("insertText", false, texto);
}

function campoTexto(label, valor, { textarea = false, fixo = false } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "campo";
  const labelEl = document.createElement("label");
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  if (fixo) {
    const div = document.createElement("div");
    div.className = "valor-fixo";
    div.textContent = valor;
    wrapper.appendChild(div);
    return { wrapper, input: null };
  }

  const input = document.createElement(textarea ? "textarea" : "input");
  if (!textarea) input.type = "text";
  input.value = valor || "";
  wrapper.appendChild(input);
  return { wrapper, input };
}

const CANAL_LABEL = { instagram: "Instagram", whatsapp: "WhatsApp" };

// Usado tanto pela Função 1 do Instagram quanto pela checagem de chegada no
// WhatsApp Web — mesmo texto de aviso nos dois lugares.
function formatarAvisoDuplicidade(prospect) {
  const data = new Date(prospect.data_hr_approach).toLocaleString("pt-BR");
  return `⚠️ Já abordado em ${data} via ${CANAL_LABEL[prospect.canal]} (conta ${prospect.conta_origem})`;
}

// chrome.storage fica indisponível quando a extensão é recarregada (em
// chrome://extensions) enquanto a aba já estava aberta — o content script
// antigo continua rodando, mas perde a conexão com a extensão ("contexto
// inválido"). Isso não é um bug de lógica, é um estado esperado durante
// desenvolvimento (a correção é dar F5 na aba). Aqui só evitamos que isso vire
// um erro não tratado: caímos de volta pra primeira conta da lista.
function obterContaOrigemSalva(callback) {
  try {
    chrome.storage.local.get([STORAGE_KEY_CONTA_ORIGEM], (resultado) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "[Prospects] chrome.storage indisponível — recarregue esta página (a extensão provavelmente foi atualizada).",
          chrome.runtime.lastError
        );
        callback(CONTAS_ORIGEM[0]);
        return;
      }
      callback(resultado[STORAGE_KEY_CONTA_ORIGEM] || CONTAS_ORIGEM[0]);
    });
  } catch (erro) {
    console.warn(
      "[Prospects] chrome.storage indisponível — recarregue esta página (a extensão provavelmente foi atualizada).",
      erro
    );
    callback(CONTAS_ORIGEM[0]);
  }
}

// Formata uma Date pro formato aceito por <input type="datetime-local">
// (respeitando o fuso horário local, não UTC). Sem data válida, usa "agora".
function dataParaInputDatetimeLocal(data) {
  const alvo = data instanceof Date && !Number.isNaN(data.getTime()) ? data : new Date();
  const offset = alvo.getTimezoneOffset();
  const local = new Date(alvo.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

/**
 * prefill: { canal, contaDestino, nomeProspect, msgUtilizada?, regiao?, dataHoraApproach?, origemInstagram? }
 * Todos os campos pré-preenchidos continuam editáveis, pois a extração via DOM
 * do Instagram/WhatsApp Web é heurística e pode falhar quando o site muda o markup.
 * dataHoraApproach (Date opcional): quando a extração não identifica a data real
 * do approach (ex: primeira mensagem é mídia sem timestamp legível), o campo
 * assume "agora" como padrão — sempre editável pra corrigir manualmente.
 */
function abrirFormularioApproach(prefill) {
  const root = getProspectsExtRoot();
  const overlayExistente = root.querySelector(".overlay");
  if (overlayExistente) overlayExistente.remove();

  // prefill.contaOrigem (quando presente) vem de detecção automática — ex: o
  // número da própria conta de WhatsApp Web conectada nesta aba (ver
  // obterNumeroProprioWhatsapp em content-whatsapp.js) — e tem prioridade
  // sobre a conta selecionada manualmente no popup da extensão.
  const resolverContaOrigem = prefill.contaOrigem
    ? (callback) => callback(prefill.contaOrigem)
    : obterContaOrigemSalva;

  resolverContaOrigem((contaOrigemAtual) => {

    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const modal = document.createElement("div");
    modal.className = "modal";
    overlay.appendChild(modal);

    const titulo = document.createElement("h2");
    titulo.textContent = "Registrar Approach";
    modal.appendChild(titulo);

    const { wrapper: wCanal } = campoTexto("Canal", CANAL_LABEL[prefill.canal], { fixo: true });
    modal.appendChild(wCanal);

    const { wrapper: wOrigem, input: inputOrigem } = campoTexto("Sender", contaOrigemAtual);
    modal.appendChild(wOrigem);

    const { wrapper: wDestino, input: inputDestino } = campoTexto("Receiver", prefill.contaDestino);
    modal.appendChild(wDestino);

    // Só faz sentido pra approaches de WhatsApp (no Instagram a própria conta
    // destino já É o @). Sempre visível e editável nesse caso — mesmo sem
    // detecção automática — pra o usuário poder preencher/corrigir manualmente
    // (antes só aparecia com prefill, sem jeito de adicionar à mão).
    let inputOrigemInstagram = null;
    if (prefill.canal === "whatsapp") {
      const { wrapper: wOrigemInstagram, input } = campoTexto("Origem (Instagram)", prefill.origemInstagram || "");
      inputOrigemInstagram = input;
      modal.appendChild(wOrigemInstagram);

      // origemInstagramConfianca "baixa" = veio do fallback de "último perfil
      // clicado", sem ligação confirmada com este número — não é uma detecção
      // exata, então avisamos explicitamente pro usuário conferir/corrigir
      // antes de salvar, em vez de aplicar como se fosse certeza.
      if (prefill.origemInstagramConfianca === "baixa") {
        const aviso = document.createElement("div");
        aviso.style.cssText = "font-size:11px;color:#b45309;margin:-8px 0 12px;";
        aviso.textContent = "⚠️ Detecção fraca (último perfil visto) — confira antes de salvar.";
        modal.appendChild(aviso);
      }
    }

    const { wrapper: wNome, input: inputNome } = campoTexto("Nome do prospect", prefill.nomeProspect);
    modal.appendChild(wNome);

    const { wrapper: wRegiao, input: inputRegiao } = campoTexto("Região", prefill.regiao || "");
    modal.appendChild(wRegiao);

    const { wrapper: wMsg, input: inputMsg } = campoTexto("Mensagem utilizada", prefill.msgUtilizada || "", { textarea: true });
    modal.appendChild(wMsg);

    const wrapperData = document.createElement("div");
    wrapperData.className = "campo";
    const labelData = document.createElement("label");
    labelData.textContent = "Data/hora do approach";
    wrapperData.appendChild(labelData);
    const inputData = document.createElement("input");
    inputData.type = "datetime-local";
    inputData.value = dataParaInputDatetimeLocal(prefill.dataHoraApproach);
    wrapperData.appendChild(inputData);
    modal.appendChild(wrapperData);

    let erroBox = null;

    const acoes = document.createElement("div");
    acoes.className = "acoes";
    const btnCancelar = document.createElement("button");
    btnCancelar.type = "button";
    btnCancelar.className = "btn-cancelar";
    btnCancelar.textContent = "Cancelar";
    btnCancelar.addEventListener("click", () => overlay.remove());

    const btnSalvar = document.createElement("button");
    btnSalvar.type = "button";
    btnSalvar.className = "btn-salvar";
    btnSalvar.textContent = "Salvar";

    btnSalvar.addEventListener("click", () => {
      if (erroBox) {
        erroBox.remove();
        erroBox = null;
      }

      const contaOrigem = inputOrigem.value.trim();
      const contaDestino = inputDestino.value.trim();

      if (!contaOrigem || !contaDestino) {
        erroBox = document.createElement("div");
        erroBox.className = "erro";
        erroBox.textContent = "Preencha conta origem e conta destino.";
        modal.insertBefore(erroBox, acoes);
        return;
      }

      btnSalvar.disabled = true;
      btnSalvar.textContent = "Salvando…";

      const payload = {
        canal: prefill.canal,
        conta_origem: contaOrigem,
        conta_destino: contaDestino,
        nome_prospect: inputNome.value.trim() || null,
        regiao: inputRegiao.value.trim() || null,
        msg_utilizada: inputMsg.value.trim() || null,
        data_hr_approach: new Date(inputData.value).toISOString(),
        origem_instagram: inputOrigemInstagram ? inputOrigemInstagram.value.trim() || null : null,
      };

      // Log de diagnóstico: se região/mensagem chegarem vazias no registro criado,
      // dá pra conferir aqui exatamente o que foi enviado (F12 > Console).
      console.log("[Prospects] enviando POST /api/prospects:", payload);

      chrome.runtime.sendMessage({ type: "CREATE_PROSPECT", payload }, (resposta) => {
        btnSalvar.disabled = false;
        btnSalvar.textContent = "Salvar";

        if (chrome.runtime.lastError) {
          erroBox = document.createElement("div");
          erroBox.className = "erro";
          erroBox.textContent = "Erro de comunicação com a extensão.";
          modal.insertBefore(erroBox, acoes);
          return;
        }

        if (!resposta || !resposta.ok) {
          erroBox = document.createElement("div");
          erroBox.className = "erro";
          erroBox.textContent = (resposta && resposta.error) || "Erro ao salvar.";
          modal.insertBefore(erroBox, acoes);
          return;
        }

        // Mostra o registro exatamente como o backend salvou — inclui a região já
        // calculada a partir do DDD, então dá pra confirmar aqui se o cálculo
        // rodou corretamente pra esse envio específico, sem precisar olhar log de servidor.
        console.log("[Prospects] prospect criado com sucesso:", resposta.prospect);

        overlay.remove();
        showToast("Approach registrado!");
      });
    });

    acoes.appendChild(btnCancelar);
    acoes.appendChild(btnSalvar);
    modal.appendChild(acoes);

    root.appendChild(overlay);
  });
}
