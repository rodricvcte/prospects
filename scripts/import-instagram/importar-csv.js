"use strict";

const fs = require("fs");
const { parseCsvComCabecalho } = require("./csv-utils");

const API_BASE_URL = "http://localhost:3000";

function paraIso(dataHrBr) {
  // dataHrBr no formato DD/MM/AAAA HH:MM, em horário local (mesmo formato
  // gerado por formatarDataHora em gerar-csv.js).
  const match = String(dataHrBr).match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const [, dia, mes, ano, hora, minuto] = match;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
  return data.toISOString();
}

function parseArgs(argv) {
  const args = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--conta=")) args.conta = arg.slice("--conta=".length);
    else if (!arg.startsWith("--")) args.csvPath = arg;
  }
  return args;
}

async function importarLinha(row, contaPadrao) {
  const canal = row.canal === "whatsapp" ? "whatsapp" : "instagram";
  const payload = {
    canal,
    conta_origem: row.sender || contaPadrao,
    conta_destino: row.conta_destino,
    nome_prospect: row.nome_prospect || null,
    regiao: row.regiao || null,
    msg_utilizada: row.msg_utilizada || null,
    data_hr_approach: paraIso(row.data_hr_approach),
  };

  const res = await fetch(`${API_BASE_URL}/api/prospects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 201) return { status: "importado" };
  if (res.status === 409) return { status: "duplicado", motivo: data.error };
  return { status: "falhou", motivo: data.error || `HTTP ${res.status}` };
}

async function main() {
  const { csvPath, conta, dryRun } = parseArgs(process.argv.slice(2));

  if (!csvPath) {
    console.error("Uso: node importar-csv.js <arquivo.csv> [--conta=<usuario_instagram>] [--dry-run]");
    console.error(
      "(--conta só é necessário se o CSV não tiver a coluna \"sender\" preenchida em alguma linha)",
    );
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error(`Arquivo não encontrado: ${csvPath}`);
    process.exit(1);
  }

  const texto = fs.readFileSync(csvPath, "utf8");
  const linhas = parseCsvComCabecalho(texto);
  const marcadasSim = linhas.filter((l) => (l.incluir || "").trim().toLowerCase() === "sim");

  console.log(`Linhas no CSV: ${linhas.length}`);
  console.log(`Marcadas "sim": ${marcadasSim.length}`);
  if (dryRun) console.log("(modo --dry-run: nada será enviado de fato)\n");

  let importados = 0;
  let duplicados = 0;
  let falhas = 0;
  const motivosFalha = [];

  for (const row of marcadasSim) {
    if (dryRun) {
      const senderEfetivo = row.sender || conta || "(faltando)";
      console.log(
        `[DRY-RUN] ${row.canal || "instagram"} | ${senderEfetivo} -> @${row.conta_destino} — ${row.nome_prospect || "(sem nome)"} — ${row.data_hr_approach}${row.regiao ? ` — ${row.regiao}` : ""}`,
      );
      continue;
    }

    try {
      const resultado = await importarLinha(row, conta);
      if (resultado.status === "importado") {
        importados++;
        console.log(`OK: @${row.conta_destino}`);
      } else if (resultado.status === "duplicado") {
        duplicados++;
        console.log(`JÁ EXISTE, pulando: @${row.conta_destino}`);
      } else {
        falhas++;
        motivosFalha.push(`@${row.conta_destino}: ${resultado.motivo}`);
        console.log(`FALHOU: @${row.conta_destino} — ${resultado.motivo}`);
      }
    } catch (err) {
      falhas++;
      motivosFalha.push(`@${row.conta_destino}: ${err.message}`);
      console.log(`FALHOU: @${row.conta_destino} — ${err.message}`);
    }
  }

  console.log("\nResumo:");
  console.log(`  Marcadas "sim": ${marcadasSim.length}`);
  if (!dryRun) {
    console.log(`  Importadas: ${importados}`);
    console.log(`  Já existiam (puladas): ${duplicados}`);
    console.log(`  Falharam: ${falhas}`);
    if (motivosFalha.length > 0) {
      console.log("\nMotivos das falhas:");
      motivosFalha.forEach((m) => console.log(`  - ${m}`));
    }
  }
}

main();
