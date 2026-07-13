import { supabase } from "./supabase";
import {
  SERVICOS,
  STATUS_PAGAMENTO,
  STATUS_TRABALHO,
  FAIXAS_ETARIAS,
  GENEROS,
  FORMAS_PAGAMENTO,
  CANAIS,
  type Servico,
  type StatusPagamento,
  type StatusTrabalho,
  type FaixaEtaria,
  type Genero,
  type FormaPagamento,
  type Canal,
} from "./cliente-tipos";

export type { Servico, StatusPagamento, StatusTrabalho, FaixaEtaria, Genero, FormaPagamento, Canal };
export { SERVICOS, STATUS_PAGAMENTO, STATUS_TRABALHO, FAIXAS_ETARIAS, GENEROS, FORMAS_PAGAMENTO, CANAIS };

export interface Cliente {
  id: string;
  prospect_id: string | null;
  nome_completo: string;
  cpf_cnpj: string | null;
  sender: string | null;
  ramo: string | null;
  data_abordagem: string | null;
  canal: Canal | null;
  perfil_instagram: string | null;
  numero_whatsapp: string | null;
  idade: FaixaEtaria | null;
  genero: Genero | null;
  regiao: string | null;
  data_fechamento: string;
  servico: Servico;
  valor_fechado: number;
  status_pagamento: StatusPagamento;
  status_trabalho: StatusTrabalho;
  data_entrega: string | null;
  forma_pagamento: FormaPagamento | null;
  data_pagamento: string | null;
  observacoes_pagamento: string | null;
  url_rascunho: string | null;
  url_prod: string | null;
  url_git: string | null;
  url_hospedagem: string | null;
  dominio: string | null;
  plano_dominio_anos: number | null;
  valor_dominio_ano: number | null;
  pagamento_dominio: string | null;
  provedor_dominio: string | null;
  data_contratacao_dominio: string | null;
  // Coluna gerada pelo Postgres (data_contratacao_dominio + plano_dominio_anos)
  // — nunca enviar em CreateClienteInput/UpdateClienteInput, é somente leitura.
  data_renovacao_dominio: string | null;
  nf_emitida: boolean;
  data_emissao_nf: string | null;
  notas: string | null;
  created_at: string;
}

export interface ListClientesFilters {
  search?: string;
  statusPagamento?: StatusPagamento;
  statusTrabalho?: StatusTrabalho;
  servico?: Servico;
  canal?: Canal;
  prospectId?: string;
}

export async function listClientes(filters: ListClientesFilters = {}): Promise<Cliente[]> {
  let query = supabase.from("clientes").select("*").order("data_fechamento", { ascending: false });
  if (filters.search) {
    const termo = filters.search.replace(/[%_]/g, "\\$&");
    query = query.or(`nome_completo.ilike.%${termo}%,ramo.ilike.%${termo}%,regiao.ilike.%${termo}%`);
  }
  if (filters.statusPagamento) {
    query = query.eq("status_pagamento", filters.statusPagamento);
  }
  if (filters.statusTrabalho) {
    query = query.eq("status_trabalho", filters.statusTrabalho);
  }
  if (filters.servico) {
    query = query.eq("servico", filters.servico);
  }
  if (filters.canal) {
    query = query.eq("canal", filters.canal);
  }
  if (filters.prospectId) {
    query = query.eq("prospect_id", filters.prospectId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export interface CreateClienteInput {
  prospect_id?: string | null;
  nome_completo: string;
  cpf_cnpj?: string | null;
  sender?: string | null;
  ramo?: string | null;
  data_abordagem?: string | null;
  canal?: Canal | null;
  perfil_instagram?: string | null;
  numero_whatsapp?: string | null;
  idade?: FaixaEtaria | null;
  genero?: Genero | null;
  regiao?: string | null;
  data_fechamento?: string;
  servico: Servico;
  valor_fechado: number;
  status_pagamento?: StatusPagamento;
  status_trabalho?: StatusTrabalho;
  data_entrega?: string | null;
  forma_pagamento?: FormaPagamento | null;
  data_pagamento?: string | null;
  observacoes_pagamento?: string | null;
  url_rascunho?: string | null;
  url_prod?: string | null;
  url_git?: string | null;
  url_hospedagem?: string | null;
  dominio?: string | null;
  plano_dominio_anos?: number | null;
  valor_dominio_ano?: number | null;
  pagamento_dominio?: string | null;
  provedor_dominio?: string | null;
  data_contratacao_dominio?: string | null;
  nf_emitida?: boolean;
  data_emissao_nf?: string | null;
  notas?: string | null;
}

export class ClienteDuplicadoError extends Error {
  constructor() {
    super("Este prospect já foi convertido em cliente.");
    this.name = "ClienteDuplicadoError";
  }
}

export async function createCliente(input: CreateClienteInput): Promise<Cliente> {
  const { data, error } = await supabase.from("clientes").insert(input).select("*").single();
  if (error) {
    if (error.code === "23505") throw new ClienteDuplicadoError();
    throw error;
  }
  return data;
}

export interface UpdateClienteInput {
  nome_completo?: string;
  cpf_cnpj?: string | null;
  sender?: string | null;
  ramo?: string | null;
  data_abordagem?: string | null;
  canal?: Canal | null;
  perfil_instagram?: string | null;
  numero_whatsapp?: string | null;
  idade?: FaixaEtaria | null;
  genero?: Genero | null;
  regiao?: string | null;
  data_fechamento?: string;
  servico?: Servico;
  valor_fechado?: number;
  status_pagamento?: StatusPagamento;
  status_trabalho?: StatusTrabalho;
  data_entrega?: string | null;
  forma_pagamento?: FormaPagamento | null;
  data_pagamento?: string | null;
  observacoes_pagamento?: string | null;
  url_rascunho?: string | null;
  url_prod?: string | null;
  url_git?: string | null;
  url_hospedagem?: string | null;
  dominio?: string | null;
  plano_dominio_anos?: number | null;
  valor_dominio_ano?: number | null;
  pagamento_dominio?: string | null;
  provedor_dominio?: string | null;
  data_contratacao_dominio?: string | null;
  nf_emitida?: boolean;
  data_emissao_nf?: string | null;
  notas?: string | null;
}

export async function updateCliente(id: string, input: UpdateClienteInput): Promise<Cliente> {
  const { data, error } = await supabase.from("clientes").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw error;
}
