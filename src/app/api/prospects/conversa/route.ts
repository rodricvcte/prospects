import { NextRequest, NextResponse } from "next/server";
import { salvarHistoricoConversaWhatsapp, ProspectNaoEncontradoError, type MensagemConversa } from "@/lib/prospects";
import { requireAuth } from "@/lib/require-auth";

function mensagemValida(m: unknown): m is MensagemConversa {
  if (!m || typeof m !== "object") return false;
  const { remetente, texto, data_hora } = m as Record<string, unknown>;
  if (remetente !== "Lead" && remetente !== "Agência") return false;
  if (typeof texto !== "string") return false;
  if (data_hora !== null && typeof data_hora !== "string") return false;
  return true;
}

export async function POST(request: NextRequest) {
  const unauth = await requireAuth(request);
  if (unauth) return unauth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { conta_destino_normalizada, mensagens } = body;

  if (typeof conta_destino_normalizada !== "string" || !conta_destino_normalizada.trim()) {
    return NextResponse.json({ error: "conta_destino_normalizada é obrigatório" }, { status: 400 });
  }
  if (!Array.isArray(mensagens) || mensagens.length === 0 || !mensagens.every(mensagemValida)) {
    return NextResponse.json({ error: "Conversa vazia — nada para salvar" }, { status: 400 });
  }

  try {
    const resultado = await salvarHistoricoConversaWhatsapp(conta_destino_normalizada, mensagens);
    return NextResponse.json({ ok: true, total: resultado.total });
  } catch (error) {
    if (error instanceof ProspectNaoEncontradoError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erro ao salvar histórico da conversa" }, { status: 500 });
  }
}
