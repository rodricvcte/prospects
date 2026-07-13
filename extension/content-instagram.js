// Rotas do Instagram que não são perfis de usuário, mesmo tendo um único
// segmento na URL (ex: instagram.com/explore/). Heurística: qualquer segmento
// fora desta lista é tratado como possível @username.
const ROTAS_RESERVADAS_INSTAGRAM = new Set([
  "direct",
  "explore",
  "reels",
  "reel",
  "stories",
  "accounts",
  "settings",
  "about",
  "legal",
  "emails",
  "privacy",
  "terms",
  "developer",
  "support",
  "creators",
  "challenge",
  "tv",
  "ads",
  "api",
  "p",
]);

// Reconhece tanto a página inicial do perfil ("/username/") quanto suas abas
// ("/username/reels/", "/username/tagged/" etc.) — todas têm o @username
// como primeiro segmento da URL, só muda o que vem depois. Sem isso, abrir
// a aba de Reels de um perfil (em vez da timeline principal) fazia a
// extensão não reconhecer o username e pular a checagem de duplicidade.
function extrairUsernameDoPerfil(pathname) {
  const segmentos = pathname.split("/").filter(Boolean);
  if (segmentos.length === 0) return null;
  const segmento = segmentos[0];
  if (ROTAS_RESERVADAS_INSTAGRAM.has(segmento.toLowerCase())) return null;
  return segmento;
}

// Descoberta inspecionando o DOM real do Instagram: o <h1> do header NÃO é o
// nome de exibição — é o texto do endereço comercial, quando existe (ver
// extrairRegiaoDoEndereco). O <h2> é o @username. O nome de exibição de
// verdade ("Dr. Manoel Neto | Cirurgião Dentista em Cuiabá") fica num <div>
// irmão, alguns níveis acima do <h2>, ao lado do container de posts/seguidores.
// Por isso subimos a partir do <h2> procurando um container com múltiplos
// filhos diretos, e pegamos o primeiro filho que não é o username nem parece
// contagem de posts/seguidores.
function extrairNomeExibicaoInstagram() {
  const h2 = document.querySelector("header h2");
  const username = h2 ? h2.textContent.trim() : "";
  console.log("[Prospects] extrairNomeExibicaoInstagram: username (header h2) =", JSON.stringify(username));

  if (h2) {
    let container = h2.parentElement;
    for (let nivel = 0; nivel < 8 && container; nivel++) {
      const filhos = Array.from(container.children);
      console.log(
        `[Prospects] extrairNomeExibicaoInstagram: nível ${nivel}, ${filhos.length} filhos diretos =`,
        filhos.map((f) => f.textContent.trim().slice(0, 60))
      );
      if (filhos.length >= 2) {
        for (const filho of filhos) {
          const texto = filho.textContent.trim();
          if (!texto || texto === username || texto.includes(username)) continue;
          if (/\bposts?\b|seguidor|seguindo|following|followers/i.test(texto)) continue;
          // Botões de ação do header ("Opções"/"Options" do menu "...", "Editar
          // perfil" etc.) também são irmãos do username nessa estrutura — um
          // rótulo curto de uma palavra só quase certamente é um botão, não o
          // nome de exibição real (que costuma ter espaço/múltiplas palavras).
          if (!texto.includes(" ") && texto.length < 15) {
            console.log("[Prospects] extrairNomeExibicaoInstagram: candidato descartado (parece botão de UI) =", JSON.stringify(texto));
            continue;
          }
          console.log("[Prospects] extrairNomeExibicaoInstagram: candidato aceito =", JSON.stringify(texto));
          return texto;
        }
      }
      container = container.parentElement;
    }
  }

  console.log("[Prospects] extrairNomeExibicaoInstagram: heurística de irmãos falhou, tentando fallback (title da página)");
  const tituloMatch = document.title.match(/^(.*?)\s*\(@/);
  const resultado = tituloMatch ? tituloMatch[1].trim() : "";
  console.log("[Prospects] extrairNomeExibicaoInstagram: resultado do fallback =", JSON.stringify(resultado));
  return resultado;
}

// O <h1> do header do perfil, quando existe, contém o endereço comercial
// completo (ex: "Transformare Odontologia, Rua Bogotá, 100, jardim das
// Américas, Plaza America Mall, Cuiabá, Brazil 78060609") — confirmado
// inspecionando o DOM real. Heurística pra extrair a cidade: o segmento entre
// vírgulas imediatamente ANTES do segmento que contém "Brazil"/"Brasil".
// Perfis sem endereço visível não têm esse <h1>, e não há fallback confiável
// pra cidade só pela bio (texto livre) — o campo fica vazio nesse caso.
function extrairRegiaoDoEndereco() {
  const h1 = document.querySelector("header h1");
  const enderecoBruto = h1 ? h1.textContent.trim() : "";
  console.log("[Prospects] extrairRegiaoDoEndereco: texto bruto do header h1 =", JSON.stringify(enderecoBruto));

  if (!enderecoBruto) return "";

  const partes = enderecoBruto
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  console.log("[Prospects] extrairRegiaoDoEndereco: partes separadas por vírgula =", partes);

  const idxPais = partes.findIndex((p) => /\b(brazil|brasil)\b/i.test(p));
  console.log("[Prospects] extrairRegiaoDoEndereco: índice do segmento com Brazil/Brasil =", idxPais);

  if (idxPais <= 0) {
    console.log("[Prospects] extrairRegiaoDoEndereco: não achou padrão esperado, retornando vazio");
    return "";
  }

  const cidade = partes[idxPais - 1];
  console.log("[Prospects] extrairRegiaoDoEndereco: cidade extraída =", JSON.stringify(cidade));
  return cidade;
}

// O Instagram Direct usa 3 formatos de separador de data/hora dependendo de
// quão antiga é a mensagem (confirmado inspecionando o DOM real de várias
// conversas, não só a mais recente — a suposição original de que era sempre
// "HH:MM" só valia pra mensagens de hoje, e por isso a extração falhava quase
// sempre, caindo no fallback de "agora"):
//   1. "18:39"                    — mensagem de hoje
//   2. "Qui, 18:18"                — dos últimos 7 dias (abreviação do dia da semana)
//   3. "2 de jul de 2026 17:58"    — mais antiga que uma semana (data completa, sem vírgula antes da hora)
const MESES_PT = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
const DIAS_SEMANA_PT = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, "sáb": 6 };

function parseDataHoraInstagram(texto) {
  let m = texto.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const [, hh, mm] = m;
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), Number(hh), Number(mm));
  }

  m = texto.match(/^(\p{L}{3})\.?,\s*(\d{1,2}):(\d{2})$/u);
  if (m) {
    const [, diaAbrev, hh, mm] = m;
    const diaSemanaAlvo = DIAS_SEMANA_PT[diaAbrev.toLowerCase()];
    if (diaSemanaAlvo !== undefined) {
      // O formato "Dia, HH:MM" nunca é usado pro dia de HOJE (hoje usa o
      // formato 1, "HH:MM" puro) — então se o dia da semana bater com o de
      // hoje, é necessariamente HÁ EXATAMENTE 7 DIAS, não hoje. Sem esse
      // ajuste, toda sexta-feira as mensagens de sexta passada eram lidas
      // como se fossem de hoje.
      const agora = new Date();
      let diferenca = agora.getDay() - diaSemanaAlvo;
      if (diferenca <= 0) diferenca += 7;
      return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - diferenca, Number(hh), Number(mm));
    }
  }

  m = texto.match(/^(\d{1,2}) de (\p{L}{3})\.? de (\d{4})[, ]+(\d{1,2}):(\d{2})$/u);
  if (m) {
    const [, dia, mesAbrev, ano, hh, mm] = m;
    const mes = MESES_PT[mesAbrev.toLowerCase()];
    if (mes !== undefined) {
      return new Date(Number(ano), mes, Number(dia), Number(hh), Number(mm));
    }
  }

  return null;
}

function extrairDataHoraSeparador(elemento) {
  let no = elemento;
  for (let subida = 0; subida < 10 && no; subida++) {
    let anterior = no.previousElementSibling;
    while (anterior) {
      const texto = anterior.textContent.trim();
      let data = parseDataHoraInstagram(texto);
      let origemLog = texto;
      if (!data) {
        const candidatoFilho = Array.from(anterior.querySelectorAll("*")).find(
          (el) => el.children.length === 0 && parseDataHoraInstagram(el.textContent.trim())
        );
        if (candidatoFilho) {
          origemLog = candidatoFilho.textContent.trim();
          data = parseDataHoraInstagram(origemLog);
        }
      }
      if (data && !Number.isNaN(data.getTime())) {
        console.log(`[Prospects] extrairDataHoraSeparador: achado "${origemLog}" subindo ${subida} nível(is) — resolvido para ${data.toISOString()}`);
        return data;
      }
      anterior = anterior.previousElementSibling;
    }
    no = no.parentElement;
  }
  console.log("[Prospects] extrairDataHoraSeparador: nenhum separador de data/hora reconhecido");
  return null;
}

// O Instagram Direct não usa data-testid nem role="row" — a bolha de mensagem
// ENVIADA por mim tem fundo azul/roxo (rgb(74, 93, 249), confirmado inspecionando
// o DOM real). Mensagens recebidas têm fundo diferente (cinza claro). Pegamos a
// ÚLTIMA bolha azul visível no DOM (mesma ressalva de virtualização do WhatsApp:
// só o que está carregado/próximo da rolagem atual existe no DOM).
function extrairUltimaMensagemEnviadaInstagram() {
  try {
    const todasAsBolhas = document.querySelectorAll("div");
    const bolhasEnviadas = Array.from(todasAsBolhas).filter(
      (div) => getComputedStyle(div).backgroundColor === "rgb(74, 93, 249)"
    );
    console.log(`[Prospects] extrairUltimaMensagemEnviadaInstagram: ${bolhasEnviadas.length} bolhas enviadas encontradas`);
    if (!bolhasEnviadas.length) return { texto: "", dataHora: null };

    const ultima = bolhasEnviadas[bolhasEnviadas.length - 1];
    const texto = extrairTextoComEmojis(ultima).trim();
    console.log("[Prospects] extrairUltimaMensagemEnviadaInstagram: texto extraído =", JSON.stringify(texto));
    const dataHora = extrairDataHoraSeparador(ultima);
    console.log("[Prospects] extrairUltimaMensagemEnviadaInstagram: data/hora =", dataHora);
    return { texto, dataHora };
  } catch (erro) {
    console.log("[Prospects] extrairUltimaMensagemEnviadaInstagram: erro =", erro);
    return { texto: "", dataHora: null };
  }
}

function checarDuplicidade(canal, valor) {
  console.log(`[Prospects] checarDuplicidade: canal=${canal} valor=${JSON.stringify(valor)}`);
  chrome.runtime.sendMessage({ type: "CHECK_PROSPECT", canal, valor }, (resposta) => {
    if (chrome.runtime.lastError) {
      console.log("[Prospects] checarDuplicidade: erro de comunicação com a extensão =", chrome.runtime.lastError);
      return;
    }
    console.log("[Prospects] checarDuplicidade: resposta =", resposta);
    if (resposta && resposta.found) {
      console.log("[Prospects] checarDuplicidade: MATCH encontrado, mostrando banner");
      showBanner(formatarAvisoDuplicidade(resposta.prospect));
    } else {
      console.log("[Prospects] checarDuplicidade: nenhum match, banner não será mostrado");
    }
  });
}

// DESCOBERTA IMPORTANTE (confirmada inspecionando o DOM real): o Instagram
// embrulha TODOS os links de saída da bio através do próprio domínio
// l.instagram.com/?u=<url-real-codificada>&e=...&s=1 (pra tracking e pro aviso
// de "você está saindo do Instagram"). Isso quebra qualquer checagem baseada
// no texto literal do href (ex: href*="wa.me/"), porque a URL de verdade fica
// url-encoded dentro do parâmetro "u" — um link de bio pro Systeme.io tinha
// href começando com "https://l.instagram.com/?u=https%3A%2F%2F...". Por isso
// resolvemos o link real ANTES de qualquer checagem de domínio, tanto aqui
// quanto na Função 2 (links de WhatsApp).
function resolverLinkRealDaBio(href) {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "l.instagram.com" || host === "lm.instagram.com") {
      const destino = url.searchParams.get("u");
      if (destino) return destino;
    }
  } catch {
    // ignora, cai no retorno do href original
  }
  return href;
}

// Verdadeiro pra links que não são do próprio Instagram/Threads nem WhatsApp
// direto — ou seja, prováveis agregadores externos (Systeme.io, Linktree,
// Beacons etc.) que escondem o link de WhatsApp de verdade atrás de um
// domínio que a extensão não tem permissão pra abrir.
function linkPareceAgregadorExterno(hrefReal) {
  let url;
  try {
    url = new URL(hrefReal);
  } catch {
    return false;
  }
  const host = url.hostname.replace(/^www\./, "");
  return !(
    host.includes("instagram.com") ||
    host.includes("threads.com") ||
    host.includes("threads.net") ||
    host.includes("wa.me") ||
    host.includes("whatsapp.com")
  );
}

// Muitas bios usam um link intermediário (Systeme.io, Linktree, Beacons etc.)
// antes de chegar no WhatsApp de verdade — a extensão não tem permissão pra
// rodar nesses domínios externos, então não consegue checar automaticamente.
// Quando existe um link assim e NÃO existe um link de WhatsApp direto na
// página, mostramos um aviso pra conferir manualmente.
function extrairLinkExternoDaBio() {
  const links = document.querySelectorAll("header a[href]");
  for (const a of links) {
    const hrefReal = resolverLinkRealDaBio(a.href);
    if (linkPareceAgregadorExterno(hrefReal)) return hrefReal;
  }
  return null;
}

// Roda em TODO ciclo (não só na troca de @username) porque o bloco de bio do
// Instagram às vezes carrega alguns instantes depois do resto do header — se
// só checássemos uma vez na troca de perfil, um link que aparece tarde nunca
// seria detectado. Se internalizarmos undefined→undefined (nada mudou desde
// a última checagem), não faz nada; nunca sobrescreve um banner de
// duplicidade já confirmado (ver duplicidadeEncontradaParaPerfilAtual).
let ultimoLinkBioVerificado = undefined;

function avisarLinkExternoDaBioSeAplicavel() {
  const linkWhatsappDireto = Array.from(document.querySelectorAll("header a[href]")).find((a) => {
    const hrefReal = resolverLinkRealDaBio(a.href);
    return hrefReal.includes("wa.me/") || hrefReal.includes("api.whatsapp.com/send");
  });
  const linkExterno = linkWhatsappDireto ? null : extrairLinkExternoDaBio();

  if (linkExterno === ultimoLinkBioVerificado) return;
  ultimoLinkBioVerificado = linkExterno;

  console.log("[Prospects] avisarLinkExternoDaBioSeAplicavel: link de WhatsApp direto?", !!linkWhatsappDireto, "| link externo =", linkExterno);
  if (linkExterno) {
    showBanner("🔗 Link na bio pode levar a WhatsApp — verifique manualmente se já foi abordado");
  }
}

// --- Função 1: checagem ao abrir perfil (SPA, sem reload de página) ---

let ultimoUsernameVerificado = undefined;
let duplicidadeEncontradaParaPerfilAtual = false;

function verificarPerfilAtual() {
  const username = extrairUsernameDoPerfil(location.pathname);

  if (username !== ultimoUsernameVerificado) {
    ultimoUsernameVerificado = username;
    ultimoLinkBioVerificado = undefined;
    duplicidadeEncontradaParaPerfilAtual = false;
    hideBanner();

    if (username) {
      salvarUltimoPerfilInstagramVisitado(username);

      console.log(`[Prospects] checarDuplicidade: canal=instagram valor=${JSON.stringify(username)}`);
      chrome.runtime.sendMessage({ type: "CHECK_PROSPECT", canal: "instagram", valor: username }, (resposta) => {
        if (chrome.runtime.lastError) {
          console.log("[Prospects] checarDuplicidade: erro de comunicação =", chrome.runtime.lastError);
          return;
        }
        console.log("[Prospects] checarDuplicidade: resposta =", resposta);
        if (resposta && resposta.found) {
          duplicidadeEncontradaParaPerfilAtual = true;
          showBanner(formatarAvisoDuplicidade(resposta.prospect));
        }
      });
    }
  }

  if (!username) return;
  // Nunca sobrescreve o aviso de duplicidade já confirmado pelo aviso
  // genérico de link externo, que é menos específico.
  if (!duplicidadeEncontradaParaPerfilAtual) {
    avisarLinkExternoDaBioSeAplicavel();
  }
}

setInterval(verificarPerfilAtual, 1200);
verificarPerfilAtual();

// --- Função 2: checagem ao passar o mouse/clicar em link de WhatsApp na bio ---

function extrairNumeroWhatsapp(href) {
  const hrefReal = resolverLinkRealDaBio(href);
  try {
    const url = new URL(hrefReal);
    console.log("[Prospects] extrairNumeroWhatsapp: href original =", href, "| resolvido =", hrefReal, "| hostname =", url.hostname);
    if (url.hostname.includes("wa.me")) {
      const numero = url.pathname.replace(/^\//, "") || null;
      console.log("[Prospects] extrairNumeroWhatsapp: extraído via wa.me =", numero);
      return numero;
    }
    if (url.hostname.includes("whatsapp.com")) {
      const numero = url.searchParams.get("phone");
      console.log("[Prospects] extrairNumeroWhatsapp: extraído via whatsapp.com =", numero);
      return numero;
    }
  } catch (erro) {
    console.log("[Prospects] extrairNumeroWhatsapp: erro =", erro);
    return null;
  }
  console.log("[Prospects] extrairNumeroWhatsapp: hostname não reconhecido, retornando null");
  return null;
}

function vincularLinksWhatsapp() {
  // Não dá pra usar seletor CSS por atributo (href*="wa.me/") porque o
  // Instagram embrulha o link real dentro de l.instagram.com/?u=<encoded> —
  // "wa.me/" não aparece literalmente no href quando isso acontece (a barra
  // vira "%2F"). Por isso escaneamos todos os links e resolvemos cada um.
  const todosOsLinks = document.querySelectorAll("a[href]");
  let encontrados = 0;

  todosOsLinks.forEach((link) => {
    if (link.dataset.prospectsBound) return;

    const hrefReal = resolverLinkRealDaBio(link.href);
    const pareceWhatsapp = hrefReal.includes("wa.me/") || hrefReal.includes("api.whatsapp.com/send");
    // Só considera link "de agregador" se estiver no header (mesmo escopo que
    // extrairLinkExternoDaBio usa) — evita marcar qualquer link externo solto
    // no feed/posts como se fosse a bio.
    const pareceAgregador = !pareceWhatsapp && link.closest("header") && linkPareceAgregadorExterno(hrefReal);
    if (!pareceWhatsapp && !pareceAgregador) return;

    link.dataset.prospectsBound = "true";
    encontrados++;
    console.log("[Prospects] vincularLinksWhatsapp: vinculando listeners a", link.href, "(resolvido:", hrefReal, ")");

    const tratar = (evento) => {
      console.log(`[Prospects] vincularLinksWhatsapp: evento "${evento.type}" disparado no link`, link.href);
      const username = extrairUsernameDoPerfil(location.pathname);

      if (pareceWhatsapp) {
        const numero = extrairNumeroWhatsapp(link.href);
        if (numero) {
          checarDuplicidade("whatsapp", numero);

          // Salva a "ponte" pro WhatsApp Web ANTES de qualquer coisa (mesmo no
          // mouseenter, antes do clique de fato) — chrome.storage.local é uma
          // API da extensão, não da página, então o write sobrevive mesmo que a
          // aba navegue/feche logo em seguida.
          const numeroNormalizado = normalizarContaDestino("whatsapp", numero);
          if (username && numeroNormalizado) {
            console.log("[Prospects] vincularLinksWhatsapp: salvando handoff pro Instagram —", username, "->", numeroNormalizado);
            salvarHandoffInstagram(numeroNormalizado, username);
          }
        } else {
          console.log("[Prospects] vincularLinksWhatsapp: número não extraído, checagem não será feita");
        }
      } else {
        // Link de agregador (Beacons, Linktree etc.): não dá pra saber o
        // número por trás. Nada a fazer aqui — o perfil já foi salvo como
        // "último visitado" pela Função 1 (verificarPerfilAtual), que roda
        // desde que o usuário abriu esta página, sem depender do clique.
        console.log("[Prospects] vincularLinksWhatsapp: link de agregador externo clicado, sem ação adicional —", username);
      }
    };

    // Não usamos preventDefault em nenhum momento: o link continua
    // funcionando normalmente, o aviso é só informativo. Isso significa que,
    // se o clique navegar a página imediatamente, a checagem assíncrona pode
    // não ter tempo de retornar e mostrar o banner antes da navegação — por
    // isso também escutamos "mouseenter", que dispara a checagem mais cedo
    // (ao passar o mouse, antes do clique de fato).
    link.addEventListener("mouseenter", tratar);
    link.addEventListener("click", tratar);
  });

  if (encontrados) {
    console.log(`[Prospects] vincularLinksWhatsapp: ${encontrados} link(s) de WhatsApp encontrado(s) na página`);
  }
}

const prospectsExtWhatsappObserver = new MutationObserver(() => vincularLinksWhatsapp());
prospectsExtWhatsappObserver.observe(document.body, { childList: true, subtree: true });
vincularLinksWhatsapp();

// --- Função 3: registrar approach ---

criarBotaoFlutuante(() => {
  console.log("[Prospects] === Registrar Approach clicado (Instagram) ===");
  const username = extrairUsernameDoPerfil(location.pathname) || "";
  console.log("[Prospects] username extraído da URL =", JSON.stringify(username));

  const nomeProspect = extrairNomeExibicaoInstagram();
  const regiao = extrairRegiaoDoEndereco();
  const { texto: msgUtilizada, dataHora: dataHoraApproach } = extrairUltimaMensagemEnviadaInstagram();

  console.log("[Prospects] prefill final enviado ao formulário:", {
    contaDestino: username,
    nomeProspect,
    regiao,
    msgUtilizada,
    dataHoraApproach,
  });

  abrirFormularioApproach({
    canal: "instagram",
    contaDestino: username,
    nomeProspect,
    regiao,
    msgUtilizada,
    dataHoraApproach,
  });
});
