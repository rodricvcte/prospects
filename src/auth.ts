import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUsuarioPorEmail } from "@/lib/usuarios";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const senha = credentials?.password;
        if (typeof email !== "string" || typeof senha !== "string") return null;

        const usuario = await getUsuarioPorEmail(email);
        if (!usuario) return null;

        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaValida) return null;

        return { id: usuario.id, email: usuario.email };
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const logado = !!auth?.user;
      const naLogin = nextUrl.pathname.startsWith("/login");

      if (naLogin) {
        if (logado) return Response.redirect(new URL("/painel-gdigy14knc", nextUrl));
        return true;
      }
      return logado;
    },
  },
});
