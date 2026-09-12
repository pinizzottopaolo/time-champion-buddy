import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Archive,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Circle,
  Hammer,
  Loader2,
  PackageCheck,
  Plus,
  Search,
} from "lucide-react";
import {
  creaSchedaEntrambiReparti,
  creaScheda,
  eliminaScheda,
  listSchede,
  setArchiviata,
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
  return v === "confezione" || v === "stampa" || v === "prestampa";
}

function RepartoPage() {
  const { reparto } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [leggendo, setLeggendo] = useState(false);
  const leggiFoto = useServerFn(estraiDatiCommessa);

  const rep: Reparto = isReparto(reparto) ? reparto : "confezione";

  const { data, isLoading } = useQuery({
    queryKey: ["schede", rep],
    queryFn: () => listSchede(rep),
    enabled: true,
  });

  const nuova = useMutation({
    mutationFn: (dati?: Record<string, unknown>) => creaScheda(rep, dati ?? {}),
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["schede"] });
      navigate({ to: "/scheda/$id", params: { id } });
    },
    onError: (err) =>
      toast.error(
        err instanceof Error
          ? `Impossibile creare la scheda: ${err.message}`
          : "Impossibile creare la scheda",
      ),
  });

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setCompletata(id, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schede"] }),
    onError: () => toast.error("Aggiornamento non riuscito"),
  });

  const archivia = useMutation({
    mutationFn: (id: string) => setArchiviata(id, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schede"] });
      qc.invalidateQueries({ queryKey: ["archivio"] });
      toast.success("Lavoro archiviato");
    },
    onError: () => toast.error("Archiviazione non riuscita"),
  });

  const elimina = useMutation({
    mutationFn: (id: string) => eliminaScheda(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schede"] });
      toast.success("Lavoro eliminato");
    },
    onError: () => toast.error("Eliminazione non riuscita"),
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
      const id = await creaSchedaEntrambiReparti({
        cliente: dati.cliente,
        lavoro: dati.lavoro,
        n_ord: dati.n_ord,
        n_ord_cliente: dati.n_ord_cliente,
        operatore: dati.operatore,
        note: dati.note,
      });
      qc.invalidateQueries({ queryKey: ["schede"] });
      navigate({ to: "/scheda/$id", params: { id } });

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
        <Button variant="ghost" onClick={() => navigate({ to: "/archivio" })}>
          <Search className="size-4" /> Archivio
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

      <p className="mt-3 text-xs text-muted-foreground">
        Tieni premuto su un lavoro per eliminarlo.
      </p>

      {isLoading && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Colonna titolo="Da fare" tono="rosso" conteggio={daFare.length}>
            {daFare.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessun lavoro in lavorazione.</p>
            )}
            {daFare.map((s) => (
              <CardLavoro
                key={s.id}
                s={s}
                tono="rosso"
                onToggle={() => toggle.mutate({ id: s.id, done: true })}
                onElimina={() => elimina.mutate(s.id)}
              />
            ))}
          </Colonna>

          <Colonna titolo="Terminati" tono="verde" conteggio={finiti.length}>
            {finiti.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessun lavoro terminato.</p>
            )}
            {finiti.map((s) => (
              <CardLavoro
                key={s.id}
                s={s}
                tono="verde"
                onToggle={() => toggle.mutate({ id: s.id, done: false })}
                onArchivia={() => archivia.mutate(s.id)}
                onElimina={() => elimina.mutate(s.id)}
              />
            ))}
          </Colonna>
        </div>
      )}
    </main>
  );
}

function Colonna({
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
  const verde = tono === "verde";
  const Icona = verde ? PackageCheck : Hammer;
  return (
    <section
      className={`sheet rounded-xl border p-4 ${
        verde ? "border-emerald-600/50" : "border-red-600/50"
      }`}
    >
      <h2 className="flex items-center gap-2">
        <Icona className={`size-5 ${verde ? "text-emerald-700" : "text-red-700"}`} />
        <span className={`label-stamp ${verde ? "text-emerald-700" : "text-red-700"}`}>{titolo}</span>
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
  onArchivia,
  onElimina,
}: {
  s: CardScheda;
  tono: "verde" | "rosso";
  onToggle: () => void;
  onArchivia?: () => void;
  onElimina: () => void;
}) {
  const eff =
    s.reparto === "stampa" ? (s.tempo_effettivo ?? 0) : totaleEffettivo(s.righe_scheda ?? []);
  const ass = s.tempo_assegnato ?? 0;
  const verde = tono === "verde";
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function inizioPressione() {
    timer.current = setTimeout(() => {
      if (window.confirm("Eliminare definitivamente questo lavoro?")) onElimina();
    }, 700);
  }
  function finePressione() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-md border border-l-4 p-4 ${
        verde
          ? "border-l-emerald-700 border-emerald-700/50 bg-emerald-100/80"
          : "border-l-red-700 border-red-700/50 bg-red-100/80"
      }`}
      onPointerDown={inizioPressione}
      onPointerUp={finePressione}
      onPointerLeave={finePressione}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={verde ? "Segna come da fare" : "Segna come finito"}
        className={verde ? "text-emerald-600" : "text-red-600"}
      >
        {verde ? <CheckCircle2 className="size-6" /> : <Circle className="size-6" />}
      </button>

      <div className="min-w-0 flex-1">
        <Link to="/scheda/$id" params={{ id: s.id }} className="block">
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
          {s.reparto === "prestampa" && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-current/10 pt-3 text-xs sm:grid-cols-3">
              <span><strong>Composizione</strong> {s.tempo_composizione_assegnato ?? "—"} h</span>
              <span><strong>Carta</strong> {s.formato_carta || "—"}</span>
              <span><strong>Resa</strong> {s.resa || "—"}{s.resa_bv ? " BV" : ""}{s.resa_fr ? " FR" : ""}</span>
              <span><strong>Pinza</strong> {s.pinza_mm ?? "—"} mm</span>
              <span><strong>Dop. T.</strong> {s.dop_t_mm ?? "—"} mm</span>
              <span><strong>Ciano</strong> {s.ciano || "NO"}</span>
            </div>
          )}
        </Link>

        {onArchivia && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onArchivia}>
            <Archive className="size-4" /> Archivia
          </Button>
        )}
      </div>
    </div>
  );
}