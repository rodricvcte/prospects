import type { NextFetchEvent, NextRequest } from "next/server";
import { auth } from "@/auth";

// `auth` é sobrecarregado (sessão em server component/route handler vs. uso
// direto como middleware) e o TypeScript não resolve bem a variante de
// middleware através da união de tuplas da lib — cast isolado aqui pra
// contornar isso; o comportamento em runtime é o mesmo do padrão oficial
// `export { auth as middleware }`.
const authProxy = auth as unknown as (request: NextRequest, event: NextFetchEvent) => unknown;

// Precisa ser uma função declarada aqui mesmo (não um re-export direto de
// `auth`) — a validação de build do Next.js pra proxy.ts exige um export
// literal de função no próprio arquivo, mesmo re-exports funcionando em
// runtime.
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return authProxy(request, event);
}

// Protege todas as páginas (painel, kanban, clientes) exceto /login e assets.
// Rotas de API (/api/*) não passam por aqui — cada route handler valida a
// sessão diretamente e responde 401 em JSON, em vez de redirecionar pra tela
// de login (o que quebraria consumidores não-navegador, como a extensão).
export const config = {
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico).*)"],
};
