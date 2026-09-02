export type CampoExtra =
  | "n_fogli"
  | "fornitore"
  | "parti"
  | "fori"
  | "mezzo_taglio";

export type Operazione = {
  chiave: string;
  etichetta: string;
  campi: CampoExtra[];
  gruppo: "taglio" | "legatoria" | "nobilitazione" | "finitura";
};

export const OPERAZIONI: Operazione[] = [
  { chiave: "taglio_1", etichetta: "Taglio 1", campi: ["n_fogli"], gruppo: "taglio" },
  { chiave: "taglio_2", etichetta: "Taglio 2", campi: ["n_fogli"], gruppo: "taglio" },
  { chiave: "taglio_3", etichetta: "Taglio 3", campi: ["n_fogli"], gruppo: "taglio" },
  {
    chiave: "rilegatura",
    etichetta: "Rilegatura",
    campi: ["n_fogli", "fornitore"],
    gruppo: "legatoria",
  },
  { chiave: "copertina", etichetta: "Copertina", campi: ["n_fogli"], gruppo: "legatoria" },
  { chiave: "parti_fascicoli", etichetta: "Parti / Fascicoli / Pagine", campi: ["parti"], gruppo: "legatoria" },
  { chiave: "perforazione", etichetta: "Perforazione", campi: ["fori"], gruppo: "finitura" },
  { chiave: "raccolta", etichetta: "Raccolta", campi: ["n_fogli"], gruppo: "legatoria" },
  { chiave: "incollatura", etichetta: "Incollatura", campi: ["n_fogli"], gruppo: "legatoria" },
  { chiave: "separazione", etichetta: "Separazione", campi: ["n_fogli"], gruppo: "finitura" },
  { chiave: "fustellatura", etichetta: "Fustellatura", campi: ["mezzo_taglio"], gruppo: "finitura" },
  { chiave: "accoppiamento", etichetta: "Accoppiamento", campi: ["n_fogli"], gruppo: "nobilitazione" },
  { chiave: "stampa_a_caldo", etichetta: "Stampa a caldo", campi: ["n_fogli"], gruppo: "nobilitazione" },
  { chiave: "rilievo_a_secco", etichetta: "Stampa a rilievo a secco", campi: ["n_fogli"], gruppo: "nobilitazione" },
  { chiave: "plastificazione", etichetta: "Plastificazione", campi: ["n_fogli"], gruppo: "nobilitazione" },
  { chiave: "piega_ante", etichetta: "Piega ante", campi: [], gruppo: "finitura" },
  { chiave: "cordonatura_ante", etichetta: "Cordonatura ante", campi: [], gruppo: "finitura" },
  { chiave: "confezione", etichetta: "Confezione", campi: [], gruppo: "finitura" },
];

export const GRUPPI: { id: Operazione["gruppo"]; titolo: string }[] = [
  { id: "taglio", titolo: "Taglio" },
  { id: "legatoria", titolo: "Legatoria" },
  { id: "nobilitazione", titolo: "Nobilitazione" },
  { id: "finitura", titolo: "Finitura e confezione" },
];

export function etichettaOperazione(chiave: string) {
  return OPERAZIONI.find((o) => o.chiave === chiave)?.etichetta ?? chiave;
}

/** Formatta minuti in "3h 20m" */
export function formatMinuti(min: number | null | undefined) {
  if (min == null || Number.isNaN(min)) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
