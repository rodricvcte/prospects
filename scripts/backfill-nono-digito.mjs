// Backfill único: recalcula conta_destino_normalizada de todos os prospects
// de WhatsApp com a nova lógica de colapso do nono dígito. Rodar uma vez após
// o deploy da mudança em src/lib/normalize.ts. Detecta colisões antes de
// aplicar qualquer update (não escreve nada se houver colisão).
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);

const SUPABASE_URL = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

function normalizarWhatsapp(contaDestino) {
  let digitos = contaDestino.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length >= 12) {
    digitos = digitos.slice(2);
  }
  const ddd = digitos.slice(0, 2);
  let resto = digitos.slice(2);
  if (resto.length === 9 && resto.startsWith("9")) {
    resto = resto.slice(1);
  }
  return ddd + resto;
}

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/prospects?canal=eq.whatsapp&select=id,conta_destino,conta_destino_normalizada`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
);
const rows = await res.json();
if (!res.ok) {
  console.error("Erro ao buscar prospects:", rows);
  process.exit(1);
}

const mudancas = [];
const novoValorPorId = new Map();
for (const row of rows) {
  const novo = normalizarWhatsapp(row.conta_destino);
  novoValorPorId.set(row.id, novo);
  if (novo !== row.conta_destino_normalizada) {
    mudancas.push({ id: row.id, conta_destino: row.conta_destino, antes: row.conta_destino_normalizada, depois: novo });
  }
}

console.log(`Total de prospects WhatsApp: ${rows.length}`);
console.log(`Registros que mudam de identificador: ${mudancas.length}`);
mudancas.forEach((m) => console.log(`  ${m.conta_destino}: ${m.antes} -> ${m.depois}`));

// Colisão = dois ids diferentes cujo novo valor normalizado é igual (considerando
// TODOS os prospects, não só os que mudaram, já que um que mudou pode colidir
// com um que não mudou).
const porNovoValor = new Map();
for (const row of rows) {
  const novo = novoValorPorId.get(row.id);
  if (!porNovoValor.has(novo)) porNovoValor.set(novo, []);
  porNovoValor.get(novo).push(row.id);
}
const colisoes = [...porNovoValor.entries()].filter(([, ids]) => ids.length > 1);

if (colisoes.length > 0) {
  console.error("\nCOLISÃO DETECTADA — nenhum update será aplicado. Resolva manualmente:");
  for (const [valor, ids] of colisoes) {
    console.error(`  identificador ${valor}: ids ${ids.join(", ")}`);
  }
  process.exit(1);
}

if (mudancas.length === 0) {
  console.log("Nada para atualizar.");
  process.exit(0);
}

if (process.argv.includes("--apply")) {
  console.log("\nAplicando updates...");
  for (const m of mudancas) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/prospects?id=eq.${m.id}`, {
      method: "PATCH",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ conta_destino_normalizada: m.depois }),
    });
    if (!r.ok) {
      console.error(`Falha ao atualizar ${m.id}:`, await r.text());
      process.exit(1);
    }
    console.log(`  ok: ${m.conta_destino}`);
  }
  console.log("Backfill concluído.");
} else {
  console.log("\nDry-run (nenhuma escrita feita). Rode com --apply para aplicar de verdade.");
}
