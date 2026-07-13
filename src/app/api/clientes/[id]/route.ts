import { NextRequest, NextResponse } from "next/server";
import {
  deleteCliente,
  updateCliente,
  SERVICOS,
  STATUS_PAGAMENTO,
  STATUS_TRABALHO,
  FAIXAS_ETARIAS,
  GENEROS,
  FORMAS_PAGAMENTO,
  CANAIS,
  type UpdateClienteInput,
} from "@/lib/clientes";
import { requireAuth } from "@/lib/require-auth";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/clientes/[id]">) {
  const unauth = await requireAuth(request);
  if (unauth) return unauth;

  const { id } = await ctx.params;

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

  if (nome_completo !== undefined && (typeof nome_completo !== "string" || !nome_completo.trim())) {
    return NextResponse.json({ error: "nome_completo não pode ser vazio" }, { status: 400 });
  }
  if (servico !== undefined && !SERVICOS.includes(servico as (typeof SERVICOS)[number])) {
    return NextResponse.json({ error: `servico deve ser um de: ${SERVICOS.join(", ")}` }, { status: 400 });
  }
  if (valor_fechado !== undefined && (typeof valor_fechado !== "number" || Number.isNaN(valor_fechado))) {
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

  const input: UpdateClienteInput = {};
  if (typeof body.cpf_cnpj === "string" || body.cpf_cnpj === null) input.cpf_cnpj = body.cpf_cnpj;
  if (typeof body.sender === "string" || body.sender === null) input.sender = body.sender;
  if (nome_completo !== undefined) input.nome_completo = (nome_completo as string).trim();
  if (typeof body.ramo === "string" || body.ramo === null) input.ramo = body.ramo;
  if (typeof body.data_abordagem === "string" || body.data_abordagem === null) input.data_abordagem = body.data_abordagem;
  if (canal !== undefined) input.canal = canal as (typeof CANAIS)[number] | null;
  if (typeof body.perfil_instagram === "string" || body.perfil_instagram === null) input.perfil_instagram = body.perfil_instagram;
  if (typeof body.numero_whatsapp === "string" || body.numero_whatsapp === null) input.numero_whatsapp = body.numero_whatsapp;
  if (idade !== undefined) input.idade = idade as (typeof FAIXAS_ETARIAS)[number] | null;
  if (genero !== undefined) input.genero = genero as (typeof GENEROS)[number] | null;
  if (typeof body.regiao === "string" || body.regiao === null) input.regiao = body.regiao;
  if (typeof body.data_fechamento === "string") input.data_fechamento = body.data_fechamento;
  if (servico !== undefined) input.servico = servico as (typeof SERVICOS)[number];
  if (valor_fechado !== undefined) input.valor_fechado = valor_fechado as number;
  if (status_pagamento !== undefined) input.status_pagamento = status_pagamento as (typeof STATUS_PAGAMENTO)[number];
  if (status_trabalho !== undefined) input.status_trabalho = status_trabalho as (typeof STATUS_TRABALHO)[number];
  if (forma_pagamento !== undefined) input.forma_pagamento = forma_pagamento as (typeof FORMAS_PAGAMENTO)[number] | null;
  if (typeof body.data_entrega === "string" || body.data_entrega === null) input.data_entrega = body.data_entrega;
  if (typeof body.data_pagamento === "string" || body.data_pagamento === null) input.data_pagamento = body.data_pagamento;
  if (typeof body.observacoes_pagamento === "string" || body.observacoes_pagamento === null)
    input.observacoes_pagamento = body.observacoes_pagamento;
  if (typeof body.url_rascunho === "string" || body.url_rascunho === null) input.url_rascunho = body.url_rascunho;
  if (typeof body.url_prod === "string" || body.url_prod === null) input.url_prod = body.url_prod;
  if (typeof body.url_git === "string" || body.url_git === null) input.url_git = body.url_git;
  if (typeof body.url_hospedagem === "string" || body.url_hospedagem === null) input.url_hospedagem = body.url_hospedagem;
  if (typeof body.dominio === "string" || body.dominio === null) input.dominio = body.dominio;
  if (plano_dominio_anos !== undefined) input.plano_dominio_anos = plano_dominio_anos as number | null;
  if (valor_dominio_ano !== undefined) input.valor_dominio_ano = valor_dominio_ano as number | null;
  if (typeof body.pagamento_dominio === "string" || body.pagamento_dominio === null) input.pagamento_dominio = body.pagamento_dominio;
  if (typeof body.provedor_dominio === "string" || body.provedor_dominio === null) input.provedor_dominio = body.provedor_dominio;
  if (typeof body.data_contratacao_dominio === "string" || body.data_contratacao_dominio === null)
    input.data_contratacao_dominio = body.data_contratacao_dominio;
  if (typeof body.notas === "string" || body.notas === null) input.notas = body.notas;
  if (typeof body.nf_emitida === "boolean") input.nf_emitida = body.nf_emitida;
  if (typeof body.data_emissao_nf === "string" || body.data_emissao_nf === null) input.data_emissao_nf = body.data_emissao_nf;

  try {
    const cliente = await updateCliente(id, input);
    return NextResponse.json({ cliente });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar cliente" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/clientes/[id]">) {
  const unauth = await requireAuth(request);
  if (unauth) return unauth;

  const { id } = await ctx.params;

  try {
    await deleteCliente(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao excluir cliente" }, { status: 500 });
  }
}
