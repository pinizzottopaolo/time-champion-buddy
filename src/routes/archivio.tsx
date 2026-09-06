import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchiveRestore, ArrowLeft, Search, Users, Wrench } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listArchivio, setArchiviata, totaleEffettivo } from "@/lib/schede";
import { formatMinuti } from "@/lib/operazioni";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/archivio")({
  head: () => ({
    meta: [
      { title: "Archivio clienti e lavori — ricerca commesse" },
      {
        name: "description",
        content:
          "Cerca nell'archivio i lavori terminati per cliente o per tipologia di lavorazione e ripristina una commessa quando serve.",
      },
      { property: "og:title", content: "Archivio clienti e lavori" },
      {
        property: "og:description",
        content: "Ricerca rapida per cliente e tipo di lavoro tra le commesse archiviate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArchivioPage,
});

type Filtro = "tutti" | "cliente" | "lavoro";

function ArchivioPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("tutti");

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["archivio"],
    queryFn: listArchivio,
    enabled: !!session,
  });

  const ripristina = useMutation({
    mutationFn: (id: string) => setArchiviata(id, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["archivio"] });
      qc.invalidateQueries({ queryKey: ["schede"] });
      toast.success("Lavoro ripristinato");
    },
    onError: () => toast.error("Ripristino non riuscito"),
  });

  const risultati = useMemo(() => {
    const t = q.trim().toLowerCase();
    const tutte = data ?? [];
    if (!t) return tutte;
    return tutte.filter((s) => {
      const cliente = (s.cliente ?? "").toLowerCase();
      const lavoro = `${s.lavoro ?? ""} ${s.tipo_carta ?? ""} ${s.formato ?? ""}`.toLowerCase();
      if (filtro === "cliente") return cliente.includes(t);
      if (filtro === "lavoro") return lavoro.includes(t);
      return cliente.includes(t) || lavoro.includes(t) || (s.n_ord ?? "").toLowerCase().includes(t);
    });
  }, [data, q, filtro]);

  const gruppi = useMemo(() => {
    const map = new Map<string, typeof risultati>();
    for (const s of risultati) {
      const key = (s.n_ord ?? "").trim() ? `ord:${(s.n_ord ?? "").trim().toLowerCase()}` : `id:${s.id}`;
      const arr = map.get(key);
      if (arr) arr.push(s);
      else map.set(key, [s]);
    }
    return [...map.values()];
  }, [risultati]);

  const clienti = useMemo(
    () => [...new Set((data ?? []).map((s) => s.cliente).filter(Boolean))].sort(),
    [data],
  );
  const tipologie = useMemo(
    () => [...new Set((data ?? []).map((s) => s.lavoro).filter(Boolean))].sort(),
    [data],
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <Link to="/" className="label-stamp inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Reparti
      </Link>

      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Archivio</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cerca tra i lavori archiviati per cliente o tipologia di lavorazione.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca cliente o lavorazione…"
            className="pl-9"
          />
        </div>
        {(["tutti", "cliente", "lavoro"] as Filtro[]).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filtro === f ? "default" : "outline"}
            onClick={() => setFiltro(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Elenco titolo="Clienti" icona={<Users className="size-3.5" />} voci={clienti} onScegli={(v) => { setFiltro("cliente"); setQ(v); }} />
        <Elenco titolo="Tipologie di lavoro" icona={<Wrench className="size-3.5" />} voci={tipologie} onScegli={(v) => { setFiltro("lavoro"); setQ(v); }} />
      </div>

      {isLoading && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!isLoading && (
        <section className="mt-8 space-y-3">
          <h2 className="label-stamp">Lavori archiviati ({gruppi.length})</h2>
          {gruppi.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessun lavoro trovato.</p>
          )}
          {gruppi.map((g) => {
            const capo = g[0];
            const effettivo = g.reduce((t, s) => t + totaleEffettivo(s.righe_scheda ?? []), 0);
            const assegnato = g.reduce((t, s) => t + (s.tempo_assegnato ?? 0), 0);
            return (
              <div key={capo.id} className="paper-panel rounded-md p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{capo.cliente || "Cliente da definire"}</h3>
                  <span className="label-stamp">{new Date(capo.data).toLocaleDateString("it-IT")}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {capo.lavoro || "Lavorazione senza descrizione"}
                  {capo.n_ord ? ` \u00b7 Ord. ${capo.n_ord}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span>
                    <span className="label-stamp">Effettivo</span>{" "}
                    <strong className="font-display">{formatMinuti(effettivo)}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    <span className="label-stamp">Assegnato</span> {formatMinuti(assegnato)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {g.map((s) => (
                    <Button key={s.id} asChild size="sm" variant="outline">
                      <Link to="/scheda/$id" params={{ id: s.id }}>
                        <span className="capitalize">{s.reparto}</span>
                      </Link>
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => g.forEach((s) => ripristina.mutate(s.id))}
                  >
                    <ArchiveRestore className="size-4" /> Ripristina
                  </Button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}

function Elenco({
  titolo,
  icona,
  voci,
  onScegli,
}: {
  titolo: string;
  icona: React.ReactNode;
  voci: string[];
  onScegli: (v: string) => void;
}) {
  return (
    <div className="paper-panel rounded-md p-4">
      <h2 className="label-stamp inline-flex items-center gap-1">
        {icona} {titolo}
      </h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {voci.length === 0 && <span className="text-sm text-muted-foreground">Nessuna voce.</span>}
        {voci.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onScegli(v)}
            className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-muted"
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
