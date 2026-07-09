import { supabase } from "./supabase";
import { normalizarContaDestino } from "./normalize";
import { regiaoPorTelefone } from "./ddd";

export type Canal = "instagram" | "whatsapp";

export interface Prospect {
  id: string;
  canal: Canal;
  conta_origem: string;
  conta_destino: string;
  conta_destino_normalizada: string;
  nome_prospect: string | null;
  data_hr_approach: string;
  regiao: string | null;
  msg_utilizada: string | null;
  created_at: string;
}

export interface ListProspectsFilters {
  search?: string;
  canal?: Canal;
  regiao?: string;
  dataInicio?: string;
  dataFim?: string;
}

export async function listProspects(filters: ListProspectsFilters): Promise<Prospect[]> {
  let query = supabase
    .from("prospects")
    .select("*")
    .order("data_hr_approach", { ascending: false });

  if (filters.search) {
    const termo = filters.search.replace(/[%_]/g, "\\$&");
    query = query.or(`nome_prospect.ilike.%${termo}%,conta_destino.ilike.%${termo}%`);
  }
  if (filters.canal) {
    query = query.eq("canal", filters.canal);
  }
  if (filters.regiao) {
    query = query.eq("regiao", filters.regiao);
  }
  if (filters.dataInicio) {
    query = query.gte("data_hr_approach", filters.dataInicio);
  }
  if (filters.dataFim) {
    query = query.lte("data_hr_approach", filters.dataFim);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export interface CreateProspectInput {
  canal: Canal;
  conta_origem: string;
  conta_destino: string;
  nome_prospect?: string | null;
  regiao?: string | null;
  msg_utilizada?: string | null;
  data_hr_approach?: string;
}

export class DuplicateProspectError extends Error {
  existing: Prospect;
  constructor(existing: Prospect) {
    const data = new Date(existing.data_hr_approach).toLocaleString("pt-BR");
    super(`Já abordado em ${data} via ${existing.canal}`);
    this.name = "DuplicateProspectError";
    this.existing = existing;
  }
}

export async function createProspect(input: CreateProspectInput): Promise<Prospect> {
  const contaDestinoNormalizada = normalizarContaDestino(input.canal, input.conta_destino);

  const { data: existente, error: erroBusca } = await supabase
    .from("prospects")
    .select("*")
    .eq("conta_destino_normalizada", contaDestinoNormalizada)
    .maybeSingle();

  if (erroBusca) throw erroBusca;
  if (existente) throw new DuplicateProspectError(existente);

  const regiao =
    input.regiao ?? (input.canal === "whatsapp" ? regiaoPorTelefone(input.conta_destino) : null);

  const { data, error } = await supabase
    .from("prospects")
    .insert({
      canal: input.canal,
      conta_origem: input.conta_origem,
      conta_destino: input.conta_destino,
      conta_destino_normalizada: contaDestinoNormalizada,
      nome_prospect: input.nome_prospect ?? null,
      regiao,
      msg_utilizada: input.msg_utilizada ?? null,
      ...(input.data_hr_approach ? { data_hr_approach: input.data_hr_approach } : {}),
    })
    .select("*")
    .single();

  if (error) {
    // Corrida entre a checagem e o insert: o índice único no banco é a garantia final.
    if (error.code === "23505") {
      const { data: existente2 } = await supabase
        .from("prospects")
        .select("*")
        .eq("conta_destino_normalizada", contaDestinoNormalizada)
        .maybeSingle();
      if (existente2) throw new DuplicateProspectError(existente2);
    }
    throw error;
  }

  return data;
}
