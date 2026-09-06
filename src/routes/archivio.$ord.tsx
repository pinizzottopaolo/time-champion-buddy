import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchiveRestore, ArrowLeft, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listArchivio, setArchiviata, totaleEffettivo } from "@/lib/schede";
import { formatMinuti } from "@/lib/operazioni";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/archivio/$ord")({
  head: () => ({
    meta: [
      { title: "Commessa archiviata — schede per numero d'ordine" },
      {
        name: "description",
        content:
          "Tutte le schede archiviate con lo stesso numero d'ordine: confezione e stampa, tempi effettivi e assegnati.",
      },
      { property: "og:title", content: "Commessa archiviata" },
      {
        property: "og:description",
        content: "Schede archiviate raggruppate per numero d'ordine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DettaglioArchivio,
});

function DettaglioArchivio() {
  const { ord } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["archivio"],
    queryFn: listArchivio,
    enabled: !!session,
  });

  const schede = useMemo(() => {
    const chiave = decodeURIComponent(ord);
    const tutte = data ?? [];
    if (chiave.startsWith("id:")) return tutte.filter((s) => s.id === chiave.slice(3));
    return tutte.filter((s) => (s.n_ord ?? "").trim().toLowerCase() === chiave.toLowerCase());
  }, [data, ord]);

  const ripristina = useMutation({
    mutationFn: (id: string) => setArchiviata(id, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["archivio"] });
      qc.invalidateQueries({ queryKey: ["schede"] });
      toast.success("Lavoro ripristinato");
    },
    onError: () => toast.error("Ripristino non riuscito"),
  });

  const capo = schede[0];

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
        <>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {capo.cliente || "Cliente da definire"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {capo.lavoro || "Lavorazione senza descrizione"}
            {capo.n_ord ? ` \u00b7 Ord. ${capo.n_ord}` : ""}
          </p>

          <div className="mt-6 space-y-3">
            {schede.map((s) => {
              const eff =
                s.reparto === "stampa"
                  ? (s.tempo_effettivo ?? 0)
                  : totaleEffettivo(s.righe_scheda ?? []);
              return (
                <div key={s.id} className="paper-panel rounded-md p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="inline-flex items-center gap-2 text-lg font-semibold capitalize">
                      <FileText className="size-5 text-muted-foreground" />
                      {s.reparto}
                    </h2>
                    <span className="label-stamp">
                      {new Date(s.data).toLocaleDateString("it-IT")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-6 text-sm">
                    <span>
                      <span className="label-stamp">Effettivo</span>{" "}
                      <strong className="font-display">{formatMinuti(eff)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      <span className="label-stamp">Assegnato</span>{" "}
                      {formatMinuti(s.tempo_assegnato ?? 0)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/scheda/$id" params={{ id: s.id }}>
                        Apri scheda
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => ripristina.mutate(s.id)}>
                      <ArchiveRestore className="size-4" /> Ripristina
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
