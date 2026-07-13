// Módulo isolado, sem import de "./supabase" — precisa ser seguro pra importar
// de componentes client (ex: a tela de Kanban), que rodam no navegador e não
// têm acesso às env vars do servidor. Importar ESTAGIOS de "./prospects"
// direto puxaria o cliente Supabase (server-only) pro bundle do navegador.
export type Estagio =
  | "Novo"
  | "Respondeu"
  | "Negociando"
  | "Fechado"
  | "Em desenvolvimento"
  | "Entregue"
  | "Recusado"
  | "Esfriou";

export const ESTAGIOS: Estagio[] = [
  "Novo",
  "Respondeu",
  "Negociando",
  "Fechado",
  "Em desenvolvimento",
  "Entregue",
  "Recusado",
  "Esfriou",
];

// Colunas exibidas no Kanban — "Novo" fica de fora de propósito: o board só
// acompanha quem já demonstrou algum interesse (saiu de "Novo" pra um
// estágio seguinte). "Novo" continua um Estagio válido no banco (é o default
// de todo prospect recém-criado), só não vira coluna aqui.
export const ESTAGIOS_KANBAN: Estagio[] = ESTAGIOS.filter((e) => e !== "Novo");

// Type guard pra validar valores vindos de fora (ex: body de requisição,
// tipado como unknown) — `ESTAGIOS.includes()` sozinho não serve porque seu
// parâmetro já exige Estagio, então não aceita unknown nem estreita o tipo.
export function isEstagio(valor: unknown): valor is Estagio {
  return ESTAGIOS.includes(valor as Estagio);
}
