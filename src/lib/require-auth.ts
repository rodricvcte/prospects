import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Chamar no início de cada route handler de API. Retorna uma resposta 401
// pronta pra devolver se não houver sessão válida nem chave da extensão, ou
// null se autenticado. A extensão de Chrome não faz login interativo, então
// autentica via uma chave fixa (Authorization: Bearer <EXTENSION_API_KEY>)
// em vez de sessão.
export async function requireAuth(request: NextRequest) {
  const apiKey = process.env.EXTENSION_API_KEY;
  const authHeader = request.headers.get("authorization");
  if (apiKey && authHeader === `Bearer ${apiKey}`) {
    return null;
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  return null;
}
