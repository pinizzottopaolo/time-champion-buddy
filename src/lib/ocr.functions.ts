import { createServerFn } from "@tanstack/react-start";

export type DatiCommessa = {
  cliente: string;
  lavoro: string;
  n_ord: string;
  n_ord_cliente: string;
  operatore: string;
  note: string;
};

const VUOTO: DatiCommessa = {
  cliente: "",
  lavoro: "",
  n_ord: "",
  n_ord_cliente: "",
  operatore: "",
  note: "",
};

/** Estrae i dati di una commessa da una foto (data URL base64). */
export const estraiDatiCommessa = createServerFn({ method: "POST" })
  .inputValidator((input: { imageDataUrl: string }) => {
    if (!input?.imageDataUrl?.startsWith("data:image/")) {
      throw new Error("Immagine non valida");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Servizio di lettura non configurato");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "Sei un assistente di tipografia. Leggi la foto di una commessa/scheda di lavorazione e restituisci SOLO un oggetto JSON con le chiavi cliente, lavoro, n_ord, n_ord_cliente, operatore, note. Usa stringa vuota se un dato non è leggibile. Nessun testo extra, nessun markdown.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Estrai i dati della commessa da questa foto." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Troppe richieste, riprova tra poco.");
    if (res.status === 402)
      throw new Error("Crediti AI esauriti: aggiungili per continuare a leggere le foto.");
    if (!res.ok) throw new Error(`Lettura non riuscita (${res.status})`);

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return VUOTO;
    try {
      const parsed = JSON.parse(match[0]) as Partial<DatiCommessa>;
      return {
        cliente: String(parsed.cliente ?? ""),
        lavoro: String(parsed.lavoro ?? ""),
        n_ord: String(parsed.n_ord ?? ""),
        n_ord_cliente: String(parsed.n_ord_cliente ?? ""),
        operatore: String(parsed.operatore ?? ""),
        note: String(parsed.note ?? ""),
      } satisfies DatiCommessa;
    } catch {
      return VUOTO;
    }
  });
