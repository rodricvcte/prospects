export { auth as default } from "@/auth";

// Protege todas as páginas (painel, kanban, clientes) exceto /login e assets.
// Rotas de API (/api/*) não passam por aqui — cada route handler valida a
// sessão diretamente e responde 401 em JSON, em vez de redirecionar pra tela
// de login (o que quebraria consumidores não-navegador, como a extensão).
export const config = {
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico).*)"],
};
