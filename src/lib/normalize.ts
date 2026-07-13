/**
 * Normaliza a conta de destino para checagem de duplicidade.
 * Instagram: remove @, espaços e caixa alta. WhatsApp: mantém só dígitos,
 * removendo o código do país (55) quando presente, para que o mesmo número
 * digitado com ou sem +55 resolva para o mesmo identificador. Também colapsa
 * o nono dígito: o WhatsApp Web mostra o mesmo contato ora com 8, ora com 9
 * dígitos na parte local (ex: "9267-0540" vs "99267-0540"), então removemos
 * o "9" extra pra evitar falso negativo na checagem de duplicidade.
 */
export function normalizarContaDestino(canal: "instagram" | "whatsapp", contaDestino: string): string {
  if (canal === "whatsapp") {
    let digitos = contaDestino.replace(/\D/g, "");
    if (digitos.startsWith("55") && digitos.length >= 12) {
      digitos = digitos.slice(2);
    }
    const ddd = digitos.slice(0, 2);
    let resto = digitos.slice(2);
    if (resto.length === 9 && resto.startsWith("9")) {
      resto = resto.slice(1);
    }
    return ddd + resto;
  }

  return contaDestino.trim().replace(/^@/, "").toLowerCase();
}
