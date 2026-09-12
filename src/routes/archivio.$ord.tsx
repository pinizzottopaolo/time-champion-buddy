import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchiveRestore, ArrowLeft } from "lucide-react";
import { getScheda, listArchivio, setArchiviata, totaleEffettivo } from "@/lib/schede";
import { etichettaOperazione, formatMinuti } from "@/lib/operazioni";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/archivio/$ord")({
  head: () => ({
    meta: [
      { title: "Commessa archiviata — scheda unica per numero d'ordine" },
      {
        name: "description",
        content:
          "Scheda unica della commessa archiviata: dati di lavoro, lavorazioni di confezione e stampa con tempi effettivi e assegnati.",
      },
      { property: "og:title", content: "Commessa archiviata" },
      {
        property: "og:description",
        content: "Tutte le schede con lo stesso numero d'ordine unite in una sola scheda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DettaglioArchivio,
});

function Dato({ label, valore }: { label: string; valore?: string | number | null }) {
  if (valore === null || valore === undefined || valore === "") return null;
  return (
    <div>
      <span className="label-stamp block">{label}</span>
      <span className="text-sm">{valore}</span>
    </div>
  );
}

function DettaglioArchivio() {
  const { ord } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["archivio"],
    queryFn: listArchivio,
    enabled: true,
  });

  const schede = useMemo(() => {
    const chiave = decodeURIComponent(ord);
    const tutte = data ?? [];
    if (chiave.startsWith("id:")) return tutte.filter((s) => s.id === chiave.slice(3));
    return tutte.filter((s) => (s.n_ord ?? "").trim().toLowerCase() === chiave.toLowerCase());
  }, [data, ord]);

  const ids = schede.map((s) => s.id).join(",");

  const { data: dettagli } = useQuery({
    queryKey: ["archivio-dettagli", ids],
    queryFn: async () => Promise.all(schede.map((s) => getScheda(s.id))),
    enabled: schede.length > 0,
  });

  const ripristina = useMutation({
    mutationFn: async () => {
      for (const s of schede) await setArchiviata(s.id, false);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["archivio"] });
      qc.invalidateQueries({ queryKey: ["schede"] });
      toast.success("Commessa ripristinata");
    },
    onError: () => toast.error("Ripristino non riuscito"),
  });

  const capo = schede[0];
  const totEff = schede.reduce(
    (t, s) =>
      t + (s.reparto === "stampa" ? (s.tempo_effettivo ?? 0) : totaleEffettivo(s.righe_scheda ?? [])),
    0,
  );
  const totAss = schede.reduce((t, s) => t + (s.tempo_assegnato ?? 0), 0);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <Link
        to="/archivio"
        className="label-stamp inline-flex items-center gap-1 hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Archivio
      </Link>

      {isLoading && <Skeleton className="mt-6 h-40 w-full" />}

      {!isLoading && !capo && (
        <p className="mt-6 text-sm text-muted-foreground">Nessuna scheda archiviata trovata.</p>
      )}

      {capo && (
        <article className="paper-panel mt-4 rounded-md p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                {capo.cliente || "Cliente da definire"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {capo.lavoro || "Lavorazione senza descrizione"}
                {capo.n_ord ? ` \u00b7 Ord. ${capo.n_ord}` : ""}
              </p>
            </div>
            <span className="label-stamp">{new Date(capo.data).toLocaleDateString("it-IT")}</span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <Dato label="N. ordine" valore={capo.n_ord} />
            <Dato label="N. ord. cliente" valore={capo.n_ord_cliente} />
            <Dato label="Tipo carta" valore={capo.tipo_carta} />
            <Dato label="Formato" valore={capo.formato} />
            <Dato label="Formato finito" valore={capo.formato_finito} />
            <Dato label="Quantità" valore={capo.quantita} />
          </div>

          <div className="mt-6 space-y-5">
            {schede.map((s) => {
              const det = dettagli?.find((d) => d.scheda.id === s.id);
              const righe = (det?.righe ?? []).filter((r) => r.attiva);
              const eff =
                s.reparto === "stampa"
                  ? (s.tempo_effettivo ?? 0)
                  : totaleEffettivo(s.righe_scheda ?? []);
              return (
                <section key={s.id} className="border-t border-border pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-semibold capitalize">{s.reparto}</h2>
                    <span className="text-sm">
                      <span className="label-stamp">Effettivo</span>{" "}
                      <strong className="font-display">{formatMinuti(eff)}</strong>
                      <span className="ml-3 text-muted-foreground">
                        <span className="label-stamp">Assegnato</span>{" "}
                        {formatMinuti(s.tempo_assegnato ?? 0)}
                      </span>
                    </span>
                  </div>

                  {s.reparto === "stampa" && (
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                      <Dato label="Fogli prelevati" valore={s.fogli_prelevati} />
                      <Dato label="Fogli stampati" valore={s.fogli_stampati} />
                      <Dato label="Tipo stampa" valore={s.tipo_stampa} />
                      <Dato label="Colore" valore={s.colore} />
                    </div>
                  )}

                  {righe.length > 0 && (
                    <ul className="mt-3 divide-y divide-border/60 text-sm">
                      {righe.map((r) => (
                        <li key={r.id} className="flex items-center justify-between py-1.5">
                          <span>{etichettaOperazione(r.chiave)}</span>
                          <span className="font-display">
                            {formatMinuti(r.tempo_effettivo ?? 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button asChild size="sm" variant="ghost" className="mt-2 px-0">
                    <Link to="/scheda/$id" params={{ id: s.id }}>
                      Apri scheda {s.reparto}
                    </Link>
                  </Button>
                </section>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="text-sm">
              <span className="label-stamp">Totale effettivo</span>{" "}
              <strong className="font-display text-base">{formatMinuti(totEff)}</strong>
              <span className="ml-4 text-muted-foreground">
                <span className="label-stamp">Totale assegnato</span> {formatMinuti(totAss)}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => ripristina.mutate()}>
              <ArchiveRestore className="size-4" /> Ripristina commessa
            </Button>
          </div>
        </article>
      )}
    </main>
  );
}
