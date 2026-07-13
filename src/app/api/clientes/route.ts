import { NextRequest, NextResponse } from "next/server";
import {
  createCliente,
  listClientes,
  ClienteDuplicadoError,
  SERVICOS,
  STATUS_PAGAMENTO,
  STATUS_TRABALHO,
  FAIXAS_ETARIAS,
  GENEROS,
  FORMAS_PAGAMENTO,
  CANAIS,
} from "@/lib/clientes";
import { requireAuth } from "@/lib/require-auth";

export async function GET(request: NextRequest) {
  const unauth = await requireAuth(request);
  if (unauth) return unauth;

  const params = request.nextUrl.searchParams;
  const statusPagamento = params.get("status_pagamento");
  const statusTrabalho = params.get("status_trabalho");
  const servico = params.get("servico");
  const canal = params.get("canal");

  if (statusPagamento && !STATUS_PAGAMENTO.includes(statusPagamento as (typeof STATUS_PAGAMENTO)[number])) {
    return NextResponse.json({ error: "status_pagamento inválido" }, { status: 400 });
  }
  if (statusTrabalho && !STATUS_TRABALHO.includes(statusTrabalho as (typeof STATUS_TRABALHO)[number])) {
    return NextResponse.json({ error: "status_trabalho inválido" }, { status: 400 });
  }
  if (servico && !SERVICOS.includes(servico as (typeof SERVICOS)[number])) {
    return NextResponse.json({ error: "servico inválido" }, { status: 400 });
  }
  if (canal && !CANAIS.includes(canal as (typeof CANAIS)[number])) {
    return NextResponse.json({ error: "canal inválido" }, { status: 400 });
  }

  try {
    const clientes = await listClientes({
      search: params.get("search") ?? undefined,
      statusPagamento: (statusPagamento as (typeof STATUS_PAGAMENTO)[number]) ?? undefined,
      statusTrabalho: (statusTrabalho as (typeof STATUS_TRABALHO)[number]) ?? undefined,
      servico: (servico as (typeof SERVICOS)[number]) ?? undefined,
      canal: (canal as (typeof CANAIS)[number]) ?? undefined,
      prospectId: params.get("prospect_id") ?? undefined,
    });
    return NextResponse.json({ clientes });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar clientes" }, { status: 500 });
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

  const {
    nome_completo,
    servico,
    valor_fechado,
    canal,
    status_pagamento,
    status_trabalho,
    idade,
    genero,
    plano_dominio_anos,
    valor_dominio_ano,
    forma_pagamento,
  } = body;

  if (typeof nome_completo !== "string" || !nome_completo.trim()) {
    return NextResponse.json({ error: "nome_completo é obrigatório" }, { status: 400 });
  }
  if (typeof servico !== "string" || !SERVICOS.includes(servico as (typeof SERVICOS)[number])) {
    return NextResponse.json({ error: `servico deve ser um de: ${SERVICOS.join(", ")}` }, { status: 400 });
  }
  if (typeof valor_fechado !== "number" || Number.isNaN(valor_fechado)) {
    return NextResponse.json({ error: "valor_fechado deve ser numérico" }, { status: 400 });
  }
  if (canal !== undefined && canal !== null && !CANAIS.includes(canal as (typeof CANAIS)[number])) {
    return NextResponse.json({ error: `canal deve ser um de: ${CANAIS.join(", ")}` }, { status: 400 });
  }
  if (status_pagamento !== undefined && !STATUS_PAGAMENTO.includes(status_pagamento as (typeof STATUS_PAGAMENTO)[number])) {
    return NextResponse.json({ error: `status_pagamento deve ser um de: ${STATUS_PAGAMENTO.join(", ")}` }, { status: 400 });
  }
  if (status_trabalho !== undefined && !STATUS_TRABALHO.includes(status_trabalho as (typeof STATUS_TRABALHO)[number])) {
    return NextResponse.json({ error: `status_trabalho deve ser um de: ${STATUS_TRABALHO.join(", ")}` }, { status: 400 });
  }
  if (idade !== undefined && idade !== null && !FAIXAS_ETARIAS.includes(idade as (typeof FAIXAS_ETARIAS)[number])) {
    return NextResponse.json({ error: `idade deve ser uma faixa válida: ${FAIXAS_ETARIAS.join(", ")}` }, { status: 400 });
  }
  if (genero !== undefined && genero !== null && !GENEROS.includes(genero as (typeof GENEROS)[number])) {
    return NextResponse.json({ error: `genero deve ser um de: ${GENEROS.join(", ")}` }, { status: 400 });
  }
  if (
    plano_dominio_anos !== undefined &&
    plano_dominio_anos !== null &&
    (typeof plano_dominio_anos !== "number" || Number.isNaN(plano_dominio_anos))
  ) {
    return NextResponse.json({ error: "plano_dominio_anos deve ser numérico" }, { status: 400 });
  }
  if (
    valor_dominio_ano !== undefined &&
    valor_dominio_ano !== null &&
    (typeof valor_dominio_ano !== "number" || Number.isNaN(valor_dominio_ano))
  ) {
    return NextResponse.json({ error: "valor_dominio_ano deve ser numérico" }, { status: 400 });
  }
  if (forma_pagamento !== undefined && forma_pagamento !== null && !FORMAS_PAGAMENTO.includes(forma_pagamento as (typeof FORMAS_PAGAMENTO)[number])) {
    return NextResponse.json({ error: `forma_pagamento deve ser um de: ${FORMAS_PAGAMENTO.join(", ")}` }, { status: 400 });
  }
  if (body.nf_emitida !== undefined && typeof body.nf_emitida !== "boolean") {
    return NextResponse.json({ error: "nf_emitida deve ser booleano" }, { status: 400 });
  }

  try {
    const cliente = await createCliente({
      prospect_id: typeof body.prospect_id === "string" ? body.prospect_id : null,
      nome_completo: nome_completo.trim(),
      cpf_cnpj: typeof body.cpf_cnpj === "string" ? body.cpf_cnpj.trim() || null : null,
      sender: typeof body.sender === "string" ? body.sender.trim() || null : null,
      ramo: typeof body.ramo === "string" ? body.ramo.trim() || null : null,
      data_abordagem: typeof body.data_abordagem === "string" ? body.data_abordagem : null,
      canal: (canal as (typeof CANAIS)[number] | null | undefined) ?? null,
      perfil_instagram: typeof body.perfil_instagram === "string" ? body.perfil_instagram.trim() || null : null,
      numero_whatsapp: typeof body.numero_whatsapp === "string" ? body.numero_whatsapp.trim() || null : null,
      idade: (idade as (typeof FAIXAS_ETARIAS)[number] | null | undefined) ?? null,
      genero: (genero as (typeof GENEROS)[number] | null | undefined) ?? null,
      regiao: typeof body.regiao === "string" ? body.regiao.trim() || null : null,
      data_fechamento: typeof body.data_fechamento === "string" ? body.data_fechamento : undefined,
      servico: servico as (typeof SERVICOS)[number],
      valor_fechado,
      status_pagamento: status_pagamento as (typeof STATUS_PAGAMENTO)[number] | undefined,
      status_trabalho: status_trabalho as (typeof STATUS_TRABALHO)[number] | undefined,
      forma_pagamento: (forma_pagamento as (typeof FORMAS_PAGAMENTO)[number] | null | undefined) ?? null,
      data_entrega: typeof body.data_entrega === "string" ? body.data_entrega : null,
      data_pagamento: typeof body.data_pagamento === "string" ? body.data_pagamento : null,
      observacoes_pagamento: typeof body.observacoes_pagamento === "string" ? body.observacoes_pagamento.trim() || null : null,
      url_rascunho: typeof body.url_rascunho === "string" ? body.url_rascunho.trim() || null : null,
      url_prod: typeof body.url_prod === "string" ? body.url_prod.trim() || null : null,
      url_git: typeof body.url_git === "string" ? body.url_git.trim() || null : null,
      url_hospedagem: typeof body.url_hospedagem === "string" ? body.url_hospedagem.trim() || null : null,
      dominio: typeof body.dominio === "string" ? body.dominio.trim() || null : null,
      plano_dominio_anos: (plano_dominio_anos as number | null | undefined) ?? null,
      valor_dominio_ano: (valor_dominio_ano as number | null | undefined) ?? null,
      pagamento_dominio: typeof body.pagamento_dominio === "string" ? body.pagamento_dominio.trim() || null : null,
      provedor_dominio: typeof body.provedor_dominio === "string" ? body.provedor_dominio.trim() || null : null,
      data_contratacao_dominio: typeof body.data_contratacao_dominio === "string" ? body.data_contratacao_dominio : null,
      nf_emitida: typeof body.nf_emitida === "boolean" ? body.nf_emitida : undefined,
      data_emissao_nf: typeof body.data_emissao_nf === "string" ? body.data_emissao_nf : null,
      notas: typeof body.notas === "string" ? body.notas.trim() || null : null,
    });
    return NextResponse.json({ cliente }, { status: 201 });
  } catch (error) {
    if (error instanceof ClienteDuplicadoError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 });
  }
}
