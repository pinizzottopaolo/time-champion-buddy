import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { OPERAZIONI } from "./operazioni";

export type TempoComposizione = { id: string; data: string; ore: number };
export type Scheda = Tables<"schede"> & {
  tempo_composizione_assegnato: number | null;
  tempo_composizione_log: TempoComposizione[];
  formato_carta: string;
  imp_manuale: boolean;
  resa: string;
  resa_bv: boolean;
  resa_fr: boolean;
  pinza_mm: number | null;
  dop_t_mm: number | null;
  taglio_netto: boolean;
  pinza_squadra: boolean;
  pinza_pinza: boolean;
  ciano: "SI" | "NO";
  verifica_ciano_lastre: string;
};
export type RigaScheda = Tables<"righe_scheda">;

export type Reparto = "confezione" | "stampa" | "prestampa";

export async function caricaFotoCommessa(file: File) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sessione scaduta: effettua nuovamente il login");

  const estensione = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const percorso = `${userId}/commesse/${crypto.randomUUID()}.${estensione}`;
  const { error } = await supabase.storage.from("commesse-foto").upload(percorso, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;

  const { data, error: signedUrlError } = await supabase.storage
    .from("commesse-foto")
    .createSignedUrl(percorso, 60 * 60 * 24 * 365);
  if (signedUrlError) throw signedUrlError;
  return data.signedUrl;
}

export async function listSchede(reparto?: Reparto, archiviate = false) {
  let q = supabase
    .from("schede")
    .select("*, righe_scheda(tempo_assegnato, tempo_effettivo, attiva)")
    .eq("archiviata", archiviate);
  if (reparto) q = q.eq("reparto", reparto);
  const { data, error } = await q
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Scheda & {
    righe_scheda: Pick<RigaScheda, "tempo_assegnato" | "tempo_effettivo" | "attiva">[];
  })[];
}

export async function listArchivio() {
  const { data, error } = await supabase
    .from("schede")
    .select("*, righe_scheda(tempo_assegnato, tempo_effettivo, attiva)")
    .eq("archiviata", true)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Scheda & {
    righe_scheda: Pick<RigaScheda, "tempo_assegnato" | "tempo_effettivo" | "attiva">[];
  })[];
}

/** Elenco distinto dei clienti già inseriti, ordinati alfabeticamente. */
export async function listClienti() {
  const { data, error } = await supabase
    .from("schede")
    .select("cliente")
    .neq("cliente", "")
    .order("cliente");
  if (error) throw error;
  const set = new Set((data ?? []).map((r) => r.cliente).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
}

export async function setArchiviata(id: string, archiviata: boolean) {
  const { error } = await supabase.from("schede").update({ archiviata }).eq("id", id);
  if (error) throw error;
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
  if (!uid) throw new Error("Sessione scaduta: effettua nuovamente il login");

  const { data, error } = await supabase
    .from("schede")
    .insert({ user_id: uid, reparto, ...dati } as TablesInsert<"schede">)
    .select("id, gruppo_id")
    .single();
  if (error) throw error;

  if (!data.gruppo_id) {
    await supabase.from("schede").update({ gruppo_id: data.id }).eq("id", data.id);
  }

  const righe: TablesInsert<"righe_scheda">[] = OPERAZIONI.map((op, i) => ({
    scheda_id: data.id,
    chiave: op.chiave,
    ordine: i,
  }));
  const { error: e2 } = await supabase.from("righe_scheda").insert(righe);
  if (e2) throw e2;

  return data.id as string;
}

/** Crea la stessa commessa in tutti i reparti. Ritorna l'id di confezione. */
export async function creaSchedaEntrambiReparti(dati: Partial<Scheda> = {}) {
  const gruppo_id = crypto.randomUUID();
  const idConfezione = await creaScheda("confezione", { ...dati, gruppo_id });
  await creaScheda("stampa", { ...dati, gruppo_id });
  await creaScheda("prestampa", { ...dati, gruppo_id });
  return idConfezione;
}

/** Dati della commessa condivisi tra i reparti. */
const CAMPI_CONDIVISI = [
  "data",
  "cliente",
  "lavoro",
  "n_ord",
  "n_ord_cliente",
  "tipo_carta",
  "formato",
  "formato_finito",
  "quantita",
] as const;

export async function salvaScheda(
  id: string,
  testata: Partial<Scheda>,
  righe: RigaScheda[],
) {
  const { error } = await supabase.from("schede").update(testata).eq("id", id);
  if (error) throw error;

  // Riporta i dati di commessa sulle schede gemelle degli altri reparti
  const gruppo = testata.gruppo_id;
  if (gruppo) {
    const condivisi: Partial<Scheda> = {};
    for (const k of CAMPI_CONDIVISI) {
      if (k in testata) (condivisi as Record<string, unknown>)[k] = testata[k];
    }
    if (Object.keys(condivisi).length > 0) {
      const { error: e3 } = await supabase
        .from("schede")
        .update(condivisi)
        .eq("gruppo_id", gruppo)
        .neq("id", id);
      if (e3) throw e3;
    }
  }

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