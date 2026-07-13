// As checagens e o registro de approach passam pelo service worker (em vez de
// content scripts fazendo fetch direto) porque só requisições de contextos da
// extensão (background/popup) usam os host_permissions para pular CORS.
// Um fetch feito direto de um content script roda com a origem da própria
// página (instagram.com/web.whatsapp.com) e seria bloqueado pelo CORS da API.
importScripts("config.js", "config.local.js", "normalize.js");

// Header de autenticação enviado em toda chamada à API — a extensão não faz
// login interativo, então usa uma chave fixa (ver config.local.js) em vez de
// sessão. O servidor aceita essa chave OU uma sessão de usuário válida.
const AUTH_HEADERS = { Authorization: `Bearer ${EXTENSION_API_KEY}` };

async function checarProspect(canal, valor) {
  const normalizado = normalizarContaDestino(canal, valor);
  if (!normalizado) return { found: false };

  const url = `${API_BASE_URL}/api/prospects?conta_destino_normalizada=${encodeURIComponent(normalizado)}`;
  const res = await fetch(url, { headers: AUTH_HEADERS });
  const data = await res.json();

  if (!res.ok) return { found: false, error: data.error || "Erro ao consultar" };

  const prospect = data.prospects && data.prospects[0];
  if (prospect) return { found: true, prospect };

  // Sem match direto por conta_destino — se for um perfil do Instagram, ainda
  // pode já ter sido abordado por OUTRO canal (ex: WhatsApp) com esse @ salvo
  // em origem_instagram (handoff Instagram → WhatsApp). Sem essa checagem, o
  // aviso genérico de "link na bio" aparecia mesmo já tendo prospect na base.
  if (canal === "instagram") {
    const urlOrigem = `${API_BASE_URL}/api/prospects?origem_instagram=${encodeURIComponent(valor)}`;
    const resOrigem = await fetch(urlOrigem, { headers: AUTH_HEADERS });
    const dataOrigem = await resOrigem.json();
    if (resOrigem.ok) {
      const prospectViaOrigem = dataOrigem.prospects && dataOrigem.prospects[0];
      if (prospectViaOrigem) return { found: true, prospect: prospectViaOrigem, viaOrigemInstagram: true };
    }
  }

  return { found: false };
}

async function criarProspect(payload) {
  const res = await fetch(`${API_BASE_URL}/api/prospects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok) {
    return { ok: false, error: data.error || "Erro ao criar prospect" };
  }
  return { ok: true, prospect: data.prospect };
}

chrome.runtime.onMessage.addListener((mensagem, _sender, sendResponse) => {
  if (mensagem.type === "CHECK_PROSPECT") {
    checarProspect(mensagem.canal, mensagem.valor)
      .then(sendResponse)
      .catch((erro) => sendResponse({ found: false, error: String(erro) }));
    return true;
  }

  if (mensagem.type === "CREATE_PROSPECT") {
    criarProspect(mensagem.payload)
      .then(sendResponse)
      .catch((erro) => sendResponse({ ok: false, error: String(erro) }));
    return true;
  }
});
