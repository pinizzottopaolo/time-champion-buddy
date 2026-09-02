import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { OPERAZIONI } from "./operazioni";

export type Scheda = Tables<"schede">;
export type RigaScheda = Tables<"righe_scheda">;

export type Reparto = "confezione" | "stampa";

export async function listSchede(reparto?: Reparto) {
  let q = supabase
    .from("schede")
    .select("*, righe_scheda(tempo_assegnato, tempo_effettivo, attiva)");
  if (reparto) q = q.eq("reparto", reparto);
  const { data, error } = await q
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Scheda & {
    righe_scheda: Pick<RigaScheda, "tempo_assegnato" | "tempo_effettivo" | "attiva">[];
  })[];
}

export async function getScheda(id: string) {
  const { data, error } = await supabase.from("schede").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Scheda non trovata");

  const { data: righe, error: e2 } = await supabase
    .from("righe_scheda")
    .select("*")
    .eq("scheda_id", id)
    .order("ordine");
  if (e2) throw e2;

  return { scheda: data as Scheda, righe: (righe ?? []) as RigaScheda[] };
}

export async function creaScheda(
  reparto: Reparto = "confezione",
  dati: Partial<Scheda> = {},
) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sessione scaduta");

  const { data, error } = await supabase
    .from("schede")
    .insert({ user_id: uid, reparto, ...dati } as TablesInsert<"schede">)
    .select("id")
    .single();
  if (error) throw error;

  const righe: TablesInsert<"righe_scheda">[] = OPERAZIONI.map((op, i) => ({
    scheda_id: data.id,
    chiave: op.chiave,
    ordine: i,
  }));
  const { error: e2 } = await supabase.from("righe_scheda").insert(righe);
  if (e2) throw e2;

  return data.id as string;
}

export async function salvaScheda(
  id: string,
  testata: Partial<Scheda>,
  righe: RigaScheda[],
) {
  const { error } = await supabase.from("schede").update(testata).eq("id", id);
  if (error) throw error;

  for (const r of righe) {
    const { id: rigaId, scheda_id: _s, created_at: _c, ...campi } = r;
    const { error: e2 } = await supabase.from("righe_scheda").update(campi).eq("id", rigaId);
    if (e2) throw e2;
  }
}

export async function eliminaScheda(id: string) {
  const { error } = await supabase.from("schede").delete().eq("id", id);
  if (error) throw error;
}

export function totaleEffettivo(righe: { attiva: boolean; tempo_effettivo: number | null }[]) {
  return righe.reduce((acc, r) => acc + (r.attiva ? (r.tempo_effettivo ?? 0) : 0), 0);
}

export function totaleAssegnato(righe: { attiva: boolean; tempo_assegnato: number | null }[]) {
  return righe.reduce((acc, r) => acc + (r.attiva ? (r.tempo_assegnato ?? 0) : 0), 0);
}

export async function setCompletata(id: string, completata: boolean) {
  const { error } = await supabase.from("schede").update({ completata }).eq("id", id);
  if (error) throw error;
}
