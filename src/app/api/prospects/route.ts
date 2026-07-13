import { NextRequest, NextResponse } from "next/server";
import {
  createProspect,
  listProspects,
  DuplicateProspectError,
  type Canal,
} from "@/lib/prospects";
import { requireAuth } from "@/lib/require-auth";

export async function GET(request: NextRequest) {
  const unauth = await requireAuth(request);
  if (unauth) return unauth;

  const params = request.nextUrl.searchParams;
  const canal = params.get("canal");

  if (canal && canal !== "instagram" && canal !== "whatsapp") {
    return NextResponse.json({ error: "canal inválido" }, { status: 400 });
  }

  try {
    const prospects = await listProspects({
      search: params.get("search") ?? undefined,
      canal: (canal as Canal) ?? undefined,
      regiao: params.get("regiao") ?? undefined,
      sender: params.get("sender") ?? undefined,
      dataInicio: params.get("data_inicio") ?? undefined,
      dataFim: params.get("data_fim") ?? undefined,
      contaDestinoNormalizada: params.get("conta_destino_normalizada") ?? undefined,
      origemInstagram: params.get("origem_instagram") ?? undefined,
    });
    return NextResponse.json({ prospects });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar prospects" }, { status: 500 });
  }
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

  const { canal, conta_origem, conta_destino } = body;

  if (canal !== "instagram" && canal !== "whatsapp") {
    return NextResponse.json({ error: "canal deve ser 'instagram' ou 'whatsapp'" }, { status: 400 });
  }
  if (typeof conta_origem !== "string" || !conta_origem.trim()) {
    return NextResponse.json({ error: "conta_origem é obrigatório" }, { status: 400 });
  }
  if (typeof conta_destino !== "string" || !conta_destino.trim()) {
    return NextResponse.json({ error: "conta_destino é obrigatório" }, { status: 400 });
  }

  try {
    const prospect = await createProspect({
      canal,
      conta_origem,
      conta_destino,
      nome_prospect: typeof body.nome_prospect === "string" ? body.nome_prospect : null,
      regiao: typeof body.regiao === "string" ? body.regiao : null,
      msg_utilizada: typeof body.msg_utilizada === "string" ? body.msg_utilizada : null,
      data_hr_approach: typeof body.data_hr_approach === "string" ? body.data_hr_approach : undefined,
      origem_instagram: typeof body.origem_instagram === "string" ? body.origem_instagram : null,
    });
    return NextResponse.json({ prospect }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateProspectError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar prospect" }, { status: 500 });
  }
}
