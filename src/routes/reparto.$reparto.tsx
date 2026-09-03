import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Camera, CheckCircle2, Circle, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  creaScheda,
  eliminaScheda,
  listSchede,
  setCompletata,
  totaleEffettivo,
  type Reparto,
} from "@/lib/schede";
import { estraiDatiCommessa } from "@/lib/ocr.functions";
import { formatMinuti } from "@/lib/operazioni";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/reparto/$reparto")({
  head: () => ({
    meta: [
      { title: "Lavori del reparto — finiti e da fare" },
      {
        name: "description",
        content:
          "Elenco dei lavori del reparto: finiti in verde, da fare in rosso. Scatta la foto della commessa per compilare i dati in automatico.",
      },
      { property: "og:title", content: "Lavori del reparto" },
      {
        property: "og:description",
        content: "Stato dei lavori e caricamento dati dalla foto della commessa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RepartoPage,
});

function isReparto(v: string): v is Reparto {
  return v === "confezione" || v === "stampa";
}

function RepartoPage() {
  const { reparto } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [leggendo, setLeggendo] = useState(false);
  const leggiFoto = useServerFn(estraiDatiCommessa);

  const rep: Reparto = isReparto(reparto) ? reparto : "confezione";

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["schede", rep],
    queryFn: () => listSchede(rep),
    enabled: !!session,
  });

  const nuova = useMutation({
    mutationFn: (dati?: Record<string, unknown>) => creaScheda(rep, dati ?? {}),
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["schede"] });
      navigate({ to: "/scheda/$id", params: { id } });
    },
    onError: () => toast.error("Impossibile creare la scheda"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setCompletata(id, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schede"] }),
    onError: () => toast.error("Aggiornamento non riuscito"),
  });

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
      toast.success("Dati letti dalla foto");
      nuova.mutate({
        cliente: dati.cliente,
        lavoro: dati.lavoro,
        n_ord: dati.n_ord,
        n_ord_cliente: dati.n_ord_cliente,
        operatore: dati.operatore,
        note: dati.note,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lettura della foto non riuscita");
    } finally {
      setLeggendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const daFare = (data ?? []).filter((s) => !s.completata);
  const finiti = (data ?? []).filter((s) => s.completata);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <Link to="/" className="label-stamp inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Reparti
      </Link>

      <h1 className="mt-3 text-3xl font-semibold capitalize sm:text-4xl">{rep}</h1>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={() => nuova.mutate(undefined)} disabled={nuova.isPending}>
          <Plus className="size-4" /> Nuovo lavoro
        </Button>
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={leggendo || nuova.isPending}
        >
          {leggendo ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {leggendo ? "Lettura in corso…" : "Foto commessa"}
        </Button>
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
      </div>

      {isLoading && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && (
        <>
          <Sezione titolo="In lavorazione" tono="rosso" conteggio={daFare.length}>
            {daFare.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessun lavoro in lavorazione.</p>
            )}
            {daFare.map((s) => (
              <CardLavoro
                key={s.id}
                s={s}
                tono="rosso"
                onToggle={() => toggle.mutate({ id: s.id, done: true })}
              />
            ))}
          </Sezione>

          <Sezione titolo="Terminati" tono="verde" conteggio={finiti.length}>
            {finiti.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessun lavoro terminato.</p>
            )}
            {finiti.map((s) => (
              <CardLavoro
                key={s.id}
                s={s}
                tono="verde"
                onToggle={() => toggle.mutate({ id: s.id, done: false })}
              />
            ))}
          </Sezione>
        </>
      )}
    </main>
  );
}

function Sezione({
  titolo,
  tono,
  conteggio,
  children,
}: {
  titolo: string;
  tono: "verde" | "rosso";
  conteggio: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2">
        <span
          className={`size-2.5 rounded-full ${tono === "verde" ? "bg-emerald-600" : "bg-red-600"}`}
        />
        <span className="label-stamp">{titolo}</span>
        <span className="text-xs text-muted-foreground">({conteggio})</span>
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

type CardScheda = Awaited<ReturnType<typeof listSchede>>[number];

function CardLavoro({
  s,
  tono,
  onToggle,
}: {
  s: CardScheda;
  tono: "verde" | "rosso";
  onToggle: () => void;
}) {
  const eff = totaleEffettivo(s.righe_scheda ?? []);
  const ass = totaleAssegnato(s.righe_scheda ?? []);
  const verde = tono === "verde";

  return (
    <div
      className={`sheet flex items-start gap-3 rounded-md border-l-4 p-4 ${
        verde ? "border-l-emerald-600 bg-emerald-500/5" : "border-l-red-600 bg-red-500/5"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={verde ? "Segna come da fare" : "Segna come finito"}
        className={verde ? "text-emerald-600" : "text-red-600"}
      >
        {verde ? <CheckCircle2 className="size-6" /> : <Circle className="size-6" />}
      </button>

      <Link to="/scheda/$id" params={{ id: s.id }} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">{s.cliente || "Cliente da definire"}</h3>
          <span className="label-stamp">{new Date(s.data).toLocaleDateString("it-IT")}</span>
        </div>
        <span className={verde ? "badge-terminato mt-2" : "badge-lavorazione mt-2"}>
          {verde ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
          {verde ? "Terminato" : "In lavorazione"}
        </span>
        <p className="mt-1 text-sm text-muted-foreground">
          {s.lavoro || "Lavorazione senza descrizione"}
          {s.n_ord ? ` · Ord. ${s.n_ord}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-6 text-sm">
          <span>
            <span className="label-stamp">Effettivo</span>{" "}
            <strong className="font-display">{formatMinuti(eff)}</strong>
          </span>
          <span className="text-muted-foreground">
            <span className="label-stamp">Assegnato</span> {formatMinuti(ass)}
          </span>
        </div>
      </Link>
    </div>
  );
}
