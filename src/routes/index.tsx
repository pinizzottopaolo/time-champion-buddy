import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LogOut, Package, Printer, ArrowRight, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { estraiDatiCommessa } from "@/lib/ocr.functions";
import { creaScheda, type Reparto } from "@/lib/schede";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reparti — Confezione e Stampa | Tempi di lavorazione" },
      {
        name: "description",
        content:
          "Scegli il reparto Confezione o Stampa e controlla i lavori in lavorazione e terminati, con foto della commessa e compilazione automatica.",
      },
      { property: "og:title", content: "Reparti Confezione e Stampa" },
      {
        property: "og:description",
        content: "Lavori terminati in verde, in lavorazione in rosso. Foto della commessa e dati automatici.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [leggendo, setLeggendo] = useState(false);
  const [repartoFoto, setRepartoFoto] = useState<Reparto>("confezione");
  const leggiFoto = useServerFn(estraiDatiCommessa);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  async function onFoto(file: File) {
    setLeggendo(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error("Lettura file non riuscita"));
        fr.readAsDataURL(file);
      });
      const dati = await leggiFoto({ data: { imageDataUrl: dataUrl } });
      const id = await creaScheda(repartoFoto, {
        cliente: dati.cliente,
        lavoro: dati.lavoro,
        n_ord: dati.n_ord,
        n_ord_cliente: dati.n_ord_cliente,
        operatore: dati.operatore,
        note: dati.note,
      });
      qc.invalidateQueries({ queryKey: ["schede"] });
      toast.success("Scheda creata dalla foto");
      navigate({ to: "/scheda/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lettura della foto non riuscita");
    } finally {
      setLeggendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-stamp">Tipografia — gestione tempi</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Reparti</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="size-4" /> Esci
        </Button>
      </header>

      <p className="mt-3 max-w-lg text-sm text-muted-foreground">
        Seleziona il reparto per vedere i lavori in lavorazione e quelli terminati.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5">
        <RepartoCard
          titolo="Confezione"
          descrizione="Taglio, legatoria, finitura"
          variante="confezione"
          icona={<Package className="size-8 sm:size-10" />}
          onApri={() => navigate({ to: "/reparto/$reparto", params: { reparto: "confezione" } })}
          onFoto={() => {
            setRepartoFoto("confezione");
            fileRef.current?.click();
          }}
          occupato={leggendo}
        />
        <RepartoCard
          titolo="Stampa"
          descrizione="Commesse e tempi macchina"
          variante="stampa"
          icona={<Printer className="size-8 sm:size-10" />}
          onApri={() => navigate({ to: "/reparto/$reparto", params: { reparto: "stampa" } })}
          onFoto={() => {
            setRepartoFoto("stampa");
            fileRef.current?.click();
          }}
          occupato={leggendo}
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFoto(f);
        }}
      />
    </main>
  );
}

function RepartoCard({
  titolo,
  descrizione,
  icona,
  variante,
  onApri,
  onFoto,
  occupato,
}: {
  titolo: string;
  descrizione: string;
  icona: React.ReactNode;
  variante: "confezione" | "stampa";
  onApri: () => void;
  onFoto: () => void;
  occupato: boolean;
}) {
  return (
    <div
      className={`group relative flex h-full flex-col items-start gap-3 overflow-hidden rounded-2xl p-5 text-primary-foreground shadow-lg transition-all sm:p-7 ${
        variante === "confezione" ? "tile-confezione" : "tile-stampa"
      }`}
    >
      <button
        type="button"
        onClick={onApri}
        className="flex w-full flex-1 flex-col items-start gap-3 text-left focus-visible:outline-none"
      >
        <span className="rounded-xl bg-white/15 p-3 ring-1 ring-white/25 backdrop-blur-sm">
          {icona}
        </span>
        <span className="font-display text-xl font-semibold sm:text-3xl">{titolo}</span>
        <span className="text-xs opacity-80 sm:text-sm">{descrizione}</span>
        <span className="label-stamp mt-auto inline-flex items-center gap-1 pt-3 text-primary-foreground/90">
          Apri <ArrowRight className="size-3.5" />
        </span>
      </button>

      <button
        type="button"
        onClick={onFoto}
        disabled={occupato}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium ring-1 ring-white/25 transition-colors hover:bg-white/25 disabled:opacity-60 sm:text-sm"
      >
        {occupato ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {occupato ? "Lettura…" : "Foto commessa"}
      </button>
    </div>
  );
}
