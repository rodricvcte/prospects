// Espelha src/lib/normalize.ts do app Next.js. Mantenha as duas em sincronia:
// a extensão não tem acesso ao código do servidor, então a lógica é duplicada aqui
// só para calcular o mesmo identificador usado na checagem de duplicidade.
function normalizarContaDestino(canal, contaDestino) {
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
