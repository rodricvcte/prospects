"use strict";

const fs = require("fs");
const path = require("path");
const { linhaCsv } = require("./csv-utils");

// Nome de exibição exato usado nos JSONs do export pra identificar minhas
// próprias mensagens (sender_name). Ajustar aqui se necessário.
const MEU_NOME = "Rodrigo Cavalcante";

// Conta de origem (@ do Instagram usado pra prospectar) — vai preenchida em
// toda linha do CSV, na coluna "sender".
const MEU_INSTAGRAM = "rodrigosc19";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

// A exportação de DM não traz endereço/localização — só o nome de exibição do
// perfil no momento da conversa. Muitos prospects colocam a cidade no nome
// (ex: "AD ORAL CLINIC | Dentista | 📍São Paulo - SP"), então tentamos
// extrair "Cidade/UF" dali por heurística. Best-effort: pode não achar nada,
// ou achar errado — por isso fica numa coluna própria pra revisão manual.
const REGEX_REGIAO = new RegExp(
  `\\p{Lu}[\\p{L}.']*(?:\\s+\\p{Lu}[\\p{L}.']*){0,3}\\s*[/\\-,]\\s*(?:${UFS.join("|")})\\b`,
  "u",
);

function extrairRegiao(nome) {
  if (!nome) return "";
  const match = nome.match(REGEX_REGIAO);
  if (!match) return "";
  const partes = match[0].split(/\s*[/\-,]\s*/);
  const uf = partes.pop();
  const cidade = partes.join(" ").trim();
  return cidade ? `${cidade}/${uf}` : "";
}

// Bug clássico dos exports da Meta: texto UTF-8 é serializado como se cada
// byte fosse um code point Latin-1. Revertendo (latin1 -> bytes -> utf8)
// recupera o texto original. Seguro pra aplicar em qualquer string, inclusive
// ASCII puro (round-trip sem efeito).
function corrigirEncoding(texto) {
  if (typeof texto !== "string") return texto;
  return Buffer.from(texto, "latin1").toString("utf8");
}

function formatarDataHora(timestampMs) {
  const data = new Date(timestampMs);
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, "0");
  const minuto = String(data.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}

function extrairUsername(nomePasta) {
  return nomePasta.replace(/_\d+$/, "");
}

// O export de DM não grava o @ real em lugar nenhum — o nome da pasta é só
// uma versão achatada (sem espaço/acento/pontuação) do nome de EXIBIÇÃO da
// conversa, não do username. Prova objetiva: o Instagram limita username a
// 30 caracteres, então qualquer conta_destino maior que isso é garantidamente
// falso (nesses casos o nome de exibição era longo/descritivo, tipo "Dr. Fulano
// | Dentista | Cidade"). Abaixo de 30 não há garantia de estar certo — só
// deixa de estar provado errado.
function usernameEhSuspeito(username) {
  return username.length > 30;
}

function lerConversa(pastaConversa) {
  const arquivos = fs
    .readdirSync(pastaConversa)
    .filter((f) => /^message_\d+\.json$/i.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/^message_(\d+)\.json$/i)[1]);
      const nb = Number(b.match(/^message_(\d+)\.json$/i)[1]);
      return na - nb;
    });

  if (arquivos.length === 0) return null;

  let participantes = [];
  let mensagens = [];

  for (const arquivo of arquivos) {
    const conteudo = JSON.parse(fs.readFileSync(path.join(pastaConversa, arquivo), "utf8"));
    if (Array.isArray(conteudo.participants) && participantes.length === 0) {
      participantes = conteudo.participants;
    }
    if (Array.isArray(conteudo.messages)) {
      mensagens = mensagens.concat(conteudo.messages);
    }
  }

  return { participantes, mensagens };
}

function processarConversa(nomePasta, pastaConversa) {
  const conversa = lerConversa(pastaConversa);
  if (!conversa || conversa.mensagens.length === 0) return null;

  const { participantes, mensagens } = conversa;

  const mensagensMinhas = mensagens.filter((m) => m.sender_name === MEU_NOME);
  if (mensagensMinhas.length === 0) return null; // nunca mandei mensagem aqui — pular

  const primeiraMinha = mensagensMinhas.reduce((a, b) => (a.timestamp_ms < b.timestamp_ms ? a : b));

  const outroParticipante = participantes.find((p) => p.name !== MEU_NOME);
  const nomeProspect = outroParticipante ? corrigirEncoding(outroParticipante.name) : "";
  const contaDestino = extrairUsername(nomePasta);

  return {
    canal: "instagram",
    sender: MEU_INSTAGRAM,
    conta_destino: contaDestino,
    confira_usuario: usernameEhSuspeito(contaDestino) ? "SIM - nome muito longo p/ ser @ real" : "",
    nome_prospect: nomeProspect,
    regiao: extrairRegiao(nomeProspect),
    data_hr_approach: formatarDataHora(primeiraMinha.timestamp_ms),
    msg_utilizada: corrigirEncoding(primeiraMinha.content || "").replace(/\r?\n/g, " "),
    total_mensagens_na_conversa: mensagens.length,
  };
}

function main() {
  const pastaInbox = process.argv[2];
  if (!pastaInbox) {
    console.error("Uso: node gerar-csv.js <caminho>/your_instagram_activity/messages/inbox");
    process.exit(1);
  }
  if (!fs.existsSync(pastaInbox)) {
    console.error(`Pasta não encontrada: ${pastaInbox}`);
    process.exit(1);
  }

  const pastasConversa = fs
    .readdirSync(pastaInbox, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const linhas = [];
  let puladasSemEnvio = 0;

  for (const nomePasta of pastasConversa) {
    const pastaConversa = path.join(pastaInbox, nomePasta);
    const resultado = processarConversa(nomePasta, pastaConversa);
    if (resultado === null) {
      puladasSemEnvio++;
      continue;
    }
    linhas.push(resultado);
  }

  linhas.sort((a, b) => a.total_mensagens_na_conversa - b.total_mensagens_na_conversa);

  const cabecalho = [
    "incluir",
    "canal",
    "sender",
    "conta_destino",
    "confira_usuario",
    "nome_prospect",
    "regiao",
    "data_hr_approach",
    "msg_utilizada",
    "total_mensagens_na_conversa",
  ];

  const csvLinhas = [linhaCsv(cabecalho)];
  for (const l of linhas) {
    csvLinhas.push(
      linhaCsv([
        "",
        l.canal,
        l.sender,
        l.conta_destino,
        l.confira_usuario,
        l.nome_prospect,
        l.regiao,
        l.data_hr_approach,
        l.msg_utilizada,
        String(l.total_mensagens_na_conversa),
      ]),
    );
  }

  const caminhoSaida = path.join(__dirname, "revisao-import-instagram.csv");
  fs.writeFileSync(caminhoSaida, "﻿" + csvLinhas.join("\n"), "utf8");

  const suspeitos = linhas.filter((l) => l.confira_usuario).length;

  console.log(`Pastas de conversa encontradas: ${pastasConversa.length}`);
  console.log(`Puladas (nunca enviei mensagem nessa conversa): ${puladasSemEnvio}`);
  console.log(`Incluídas no CSV para revisão: ${linhas.length}`);
  console.log(`  das quais com @ suspeito (nome de exibição, não username real): ${suspeitos}`);
  console.log(`CSV salvo em: ${caminhoSaida}`);
}

main();
