// Cria (ou atualiza a senha do) usuário admin na tabela "usuarios". Rodar uma
// vez após aplicar a migration 20260713_create_usuarios.sql.
// Uso: node scripts/seed-admin.mjs <email> <senha>
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";

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

const [email, senha] = process.argv.slice(2);
if (!email || !senha) {
  console.error("Uso: node scripts/seed-admin.mjs <email> <senha>");
  process.exit(1);
}

const senha_hash = await bcrypt.hash(senha, 12);

const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?on_conflict=email`, {
  method: "POST",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify({ email: email.toLowerCase().trim(), senha_hash }),
});

const body = await res.json();
if (!res.ok) {
  console.error("Erro ao criar/atualizar usuário:", body);
  process.exit(1);
}

console.log("Usuário admin criado/atualizado:", body[0]?.email ?? email);
