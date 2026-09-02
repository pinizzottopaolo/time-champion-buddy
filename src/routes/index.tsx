import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, LogOut, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { creaScheda, listSchede, totaleAssegnato, totaleEffettivo } from "@/lib/schede";
import { formatMinuti } from "@/lib/operazioni";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Schede Lavorazione Confezione — Tempi di reparto" },
      {
        name: "description",
        content:
          "Archivio digitale delle schede di lavorazione confezione: clienti, commesse, tempi assegnati ed effettivi per ogni lavorazione.",
      },
      { property: "og:title", content: "Schede Lavorazione Confezione" },
      {
        property: "og:description",
        content: "Compila le schede di reparto e tieni sotto controllo i tempi di lavorazione.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["schede"],
    queryFn: listSchede,
    enabled: !!session,
  });

  const nuova = useMutation({
    mutationFn: creaScheda,
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["schede"] });
      navigate({ to: "/scheda/$id", params: { id } });
    },
    onError: () => toast.error("Impossibile creare la scheda"),
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-stamp">Reparto confezione</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Schede di lavorazione</h1>
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

      <Button
        className="mt-6 w-full sm:w-auto"
        onClick={() => nuova.mutate()}
        disabled={nuova.isPending}
      >
        <Plus className="size-4" /> Nuova scheda
      </Button>

      <section className="mt-6 space-y-3">
        {isLoading && (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        )}

        {!isLoading && data?.length === 0 && (
          <div className="sheet rounded-md p-8 text-center">
            <FileText className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nessuna scheda registrata. Creane una per iniziare a tracciare i tempi.
            </p>
          </div>
        )}

        {data?.map((s) => {
          const eff = totaleEffettivo(s.righe_scheda ?? []);
          const ass = totaleAssegnato(s.righe_scheda ?? []);
          const delta = ass > 0 ? eff - ass : null;
          return (
            <Link
              key={s.id}
              to="/scheda/$id"
              params={{ id: s.id }}
              className="sheet block rounded-md p-4 transition-colors hover:border-accent"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {s.cliente || "Cliente da definire"}
                </h2>
                <span className="label-stamp">
                  {new Date(s.data).toLocaleDateString("it-IT")}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.lavoro || "Lavorazione senza descrizione"}
                {s.n_ord ? ` · Ord. ${s.n_ord}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <span>
                  <span className="label-stamp">Effettivo</span>{" "}
                  <strong className="font-display">{formatMinuti(eff)}</strong>
                </span>
                <span className="text-muted-foreground">
                  <span className="label-stamp">Assegnato</span> {formatMinuti(ass)}
                </span>
                {delta !== null && delta !== 0 && (
                  <span className={delta > 0 ? "text-destructive" : "text-accent"}>
                    {delta > 0 ? "+" : "−"}
                    {formatMinuti(Math.abs(delta))}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
