import { supabase } from "./supabase";
import { normalizarContaDestino } from "./normalize";
import { regiaoPorTelefone } from "./ddd";
import { ESTAGIOS, isEstagio, type Estagio } from "./estagio";

export type { Estagio };
export { ESTAGIOS, isEstagio };

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
  recusado: boolean;
  interessado: boolean;
  // @ do Instagram do prospect quando o approach é registrado via WhatsApp mas
  // o lead foi visto originalmente no Instagram (link na bio) — a extensão usa
  // chrome.storage.local pra "atravessar" essa info entre as duas abas. Fica
  // null pra approaches registrados direto no Instagram (conta_destino já é o
  // @ nesse caso) ou sem handoff detectado.
  origem_instagram: string | null;
  estagio: Estagio;
  notas: string | null;
  created_at: string;
}

export interface ListProspectsFilters {
  search?: string;
  canal?: Canal;
  regiao?: string;
  sender?: string;
  dataInicio?: string;
  dataFim?: string;
  contaDestinoNormalizada?: string;
  origemInstagram?: string;
}

export async function listProspects(filters: ListProspectsFilters): Promise<Prospect[]> {
  let query = supabase
    .from("prospects")
    .select("*")
    .order("data_hr_approach", { ascending: false });

  if (filters.search) {
    const termo = filters.search.replace(/[%_]/g, "\\$&");
    query = query.or(
      `nome_prospect.ilike.%${termo}%,conta_destino.ilike.%${termo}%,origem_instagram.ilike.%${termo}%`,
    );
  }
  if (filters.contaDestinoNormalizada) {
    // Match exato pelo campo já normalizado — usado pela extensão de Chrome para checar
    // duplicidade sem depender de ILIKE, que falha com números formatados (espaços/hífen).
    query = query.eq("conta_destino_normalizada", filters.contaDestinoNormalizada);
  }
  if (filters.origemInstagram) {
    // Usado pela extensão pra achar prospects que foram abordados por outro canal
    // (ex: WhatsApp) mas cujo primeiro contato foi visto num perfil do Instagram —
    // ILIKE porque o @ pode ter sido salvo com capitalização diferente.
    query = query.ilike("origem_instagram", filters.origemInstagram);
  }
  if (filters.canal) {
    query = query.eq("canal", filters.canal);
  }
  if (filters.regiao) {
    query = query.eq("regiao", filters.regiao);
  }
  if (filters.sender) {
    query = query.eq("conta_origem", filters.sender);
  }
  if (filters.dataInicio) {
    query = query.gte("data_hr_approach", filters.dataInicio);
  }
  if (filters.dataFim) {
    // Data pura (YYYY-MM-DD) equivale a meia-noite — sem levar até o fim do
    // dia, "de" e "até" iguais excluiriam quase todos os registros do dia
    // selecionado.
    query = query.lte("data_hr_approach", `${filters.dataFim}T23:59:59.999`);
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
  origem_instagram?: string | null;
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
      origem_instagram: input.origem_instagram ?? null,
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

export interface UpdateProspectInput {
  canal?: Canal;
  conta_origem?: string;
  conta_destino?: string;
  nome_prospect?: string | null;
  regiao?: string | null;
  msg_utilizada?: string | null;
  data_hr_approach?: string;
  origem_instagram?: string | null;
  recusado?: boolean;
  interessado?: boolean;
  estagio?: Estagio;
  notas?: string | null;
}

export async function updateProspect(id: string, input: UpdateProspectInput): Promise<Prospect> {
  const updateData: Record<string, unknown> = { ...input };

  const precisaContaAtual = input.canal !== undefined || input.conta_destino !== undefined;
  // Marcar interessado precisa empurrar o estagio pra "Respondeu" (senão o
  // card nunca sai da coluna "Novo", que fica de fora do Kanban) — mas só
  // quando quem chamou não mandou um estagio explícito, e só a partir de
  // "Novo", pra não regredir alguém que já tá em "Negociando" etc.
  const precisaEstagioAtual = input.interessado === true && input.estagio === undefined;

  let atual: Prospect | null = null;
  if (precisaContaAtual || precisaEstagioAtual) {
    const { data, error: erroAtual } = await supabase
      .from("prospects")
      .select("*")
      .eq("id", id)
      .single();
    if (erroAtual) throw erroAtual;
    atual = data;
  }

  if (precisaEstagioAtual && atual!.estagio === "Novo") {
    updateData.estagio = "Respondeu";
  }

  // canal/conta_destino mudando exige recalcular conta_destino_normalizada e
  // reconferir duplicidade (o índice único do banco não ajuda aqui porque a
  // checagem precisa excluir o próprio registro sendo editado).
  if (precisaContaAtual) {
    const canalFinal = input.canal ?? atual!.canal;
    const contaDestinoFinal = input.conta_destino ?? atual!.conta_destino;
    const normalizada = normalizarContaDestino(canalFinal, contaDestinoFinal);

    const { data: duplicado, error: erroDup } = await supabase
      .from("prospects")
      .select("*")
      .eq("conta_destino_normalizada", normalizada)
      .neq("id", id)
      .maybeSingle();
    if (erroDup) throw erroDup;
    if (duplicado) throw new DuplicateProspectError(duplicado);

    updateData.conta_destino_normalizada = normalizada;
  }

  const { data, error } = await supabase
    .from("prospects")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existente } = await supabase
        .from("prospects")
        .select("*")
        .eq("conta_destino_normalizada", updateData.conta_destino_normalizada)
        .neq("id", id)
        .maybeSingle();
      if (existente) throw new DuplicateProspectError(existente);
    }
    throw error;
  }

  return data;
}

export async function deleteProspect(id: string): Promise<void> {
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) throw error;
}
