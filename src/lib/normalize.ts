/**
 * Normaliza a conta de destino para checagem de duplicidade.
 * Instagram: remove @, espaços e caixa alta. WhatsApp: mantém só dígitos,
 * removendo o código do país (55) quando presente, para que o mesmo número
 * digitado com ou sem +55 resolva para o mesmo identificador.
 */
export function normalizarContaDestino(canal: "instagram" | "whatsapp", contaDestino: string): string {
  if (canal === "whatsapp") {
    let digitos = contaDestino.replace(/\D/g, "");
    if (digitos.startsWith("55") && digitos.length >= 12) {
      digitos = digitos.slice(2);
    }
    return digitos;
  }

  return contaDestino.trim().replace(/^@/, "").toLowerCase();
}
