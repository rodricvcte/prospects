// Módulo isolado, sem import de valores server-only — seguro pra importar de
// componentes client (modal de conversão, tela de clientes). "import type" é
// apagado em tempo de compilação, então reexportar o tipo Canal de
// "./prospects" aqui não puxa o cliente Supabase (server-only) pro bundle.
import type { Canal } from "./prospects";

export type { Canal };
export const CANAIS: Canal[] = ["instagram", "whatsapp"];

export type Servico = "LP" | "GMN" | "Combo";
export const SERVICOS: Servico[] = ["LP", "GMN", "Combo"];

export type StatusPagamento = "Pendente" | "Pago";
export const STATUS_PAGAMENTO: StatusPagamento[] = ["Pendente", "Pago"];

// Status do trabalho (entrega do projeto) — independente do status de
// pagamento. Não é puxado do estágio do Kanban do prospect: é um campo
// próprio do cliente, editado direto na tela de Clientes.
export type StatusTrabalho = "Em desenvolvimento" | "Entregue";
export const STATUS_TRABALHO: StatusTrabalho[] = ["Em desenvolvimento", "Entregue"];

export type FaixaEtaria = "18-22" | "23-28" | "29-34" | "35-40" | "41-46" | "47-52";
export const FAIXAS_ETARIAS: FaixaEtaria[] = ["18-22", "23-28", "29-34", "35-40", "41-46", "47-52"];

export type Genero = "Masculino" | "Feminino";
export const GENEROS: Genero[] = ["Masculino", "Feminino"];

export type FormaPagamento = "Pix" | "Cartão" | "Outro";
export const FORMAS_PAGAMENTO: FormaPagamento[] = ["Pix", "Cartão", "Outro"];
