import { NextRequest, NextResponse } from "next/server";
import {
  deleteProspect,
  updateProspect,
  DuplicateProspectError,
  ESTAGIOS,
  isEstagio,
  type UpdateProspectInput,
} from "@/lib/prospects";
import { requireAuth } from "@/lib/require-auth";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/prospects/[id]">) {
  const unauth = await requireAuth(request);
  if (unauth) return unauth;

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { canal, conta_origem, conta_destino, recusado, interessado, estagio, notas } = body;

  if (canal !== undefined && canal !== "instagram" && canal !== "whatsapp") {
    return NextResponse.json({ error: "canal deve ser 'instagram' ou 'whatsapp'" }, { status: 400 });
  }
  if (conta_origem !== undefined && (typeof conta_origem !== "string" || !conta_origem.trim())) {
    return NextResponse.json({ error: "conta_origem não pode ser vazio" }, { status: 400 });
  }
  if (conta_destino !== undefined && (typeof conta_destino !== "string" || !conta_destino.trim())) {
    return NextResponse.json({ error: "conta_destino não pode ser vazio" }, { status: 400 });
  }
  if (recusado !== undefined && typeof recusado !== "boolean") {
    return NextResponse.json({ error: "recusado deve ser booleano" }, { status: 400 });
  }
  if (interessado !== undefined && typeof interessado !== "boolean") {
    return NextResponse.json({ error: "interessado deve ser booleano" }, { status: 400 });
  }
  if (estagio !== undefined && !isEstagio(estagio)) {
    return NextResponse.json({ error: `estagio deve ser um de: ${ESTAGIOS.join(", ")}` }, { status: 400 });
  }
  if (notas !== undefined && notas !== null && typeof notas !== "string") {
    return NextResponse.json({ error: "notas deve ser texto" }, { status: 400 });
  }

  const input: UpdateProspectInput = {};
  if (canal !== undefined) input.canal = canal;
  if (conta_origem !== undefined) input.conta_origem = conta_origem;
  if (conta_destino !== undefined) input.conta_destino = conta_destino;
  if (typeof body.nome_prospect === "string" || body.nome_prospect === null) {
    input.nome_prospect = body.nome_prospect;
  }
  if (typeof body.regiao === "string" || body.regiao === null) {
    input.regiao = body.regiao;
  }
  if (typeof body.msg_utilizada === "string" || body.msg_utilizada === null) {
    input.msg_utilizada = body.msg_utilizada;
  }
  if (typeof body.data_hr_approach === "string") {
    input.data_hr_approach = body.data_hr_approach;
  }
  if (typeof body.origem_instagram === "string" || body.origem_instagram === null) {
    input.origem_instagram = body.origem_instagram;
  }
  if (recusado !== undefined) input.recusado = recusado;
  if (interessado !== undefined) input.interessado = interessado;
  if (estagio !== undefined) input.estagio = estagio;
  if (notas !== undefined) input.notas = notas;

  try {
    const prospect = await updateProspect(id, input);
    return NextResponse.json({ prospect });
  } catch (error) {
    if (error instanceof DuplicateProspectError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar prospect" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/prospects/[id]">) {
  const unauth = await requireAuth(request);
  if (unauth) return unauth;

  const { id } = await ctx.params;

  try {
    await deleteProspect(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao excluir prospect" }, { status: 500 });
  }
}
