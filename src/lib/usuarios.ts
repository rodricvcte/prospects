import { supabase } from "./supabase";

export interface Usuario {
  id: string;
  email: string;
  senha_hash: string;
}

export async function getUsuarioPorEmail(email: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, email, senha_hash")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (error) throw error;
  return data;
}
