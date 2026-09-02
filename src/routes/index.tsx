import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, Package, Printer, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reparti — Confezione e Stampa | Tempi di lavorazione" },
      {
        name: "description",
        content:
          "Scegli il reparto Confezione o Stampa e controlla i lavori finiti e quelli ancora da fare, con foto della commessa e compilazione automatica.",
      },
      { property: "og:title", content: "Reparti Confezione e Stampa" },
      {
        property: "og:description",
        content: "Lavori finiti in verde, da fare in rosso. Foto della commessa e dati automatici.",
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

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
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
        Seleziona il reparto per vedere i lavori finiti e quelli da fare.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <RepartoCard
          titolo="Confezione"
          descrizione="Taglio, legatoria, nobilitazione e finitura"
          icona={<Package className="size-7" />}
          onClick={() => navigate({ to: "/reparto/$reparto", params: { reparto: "confezione" } })}
        />
        <RepartoCard
          titolo="Stampa"
          descrizione="Commesse di stampa e tempi macchina"
          icona={<Printer className="size-7" />}
          onClick={() => navigate({ to: "/reparto/$reparto", params: { reparto: "stampa" } })}
        />
      </div>
    </main>
  );
}

function RepartoCard({
  titolo,
  descrizione,
  icona,
  onClick,
}: {
  titolo: string;
  descrizione: string;
  icona: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sheet group flex h-full flex-col items-start gap-3 rounded-lg p-6 text-left transition-all hover:-translate-y-0.5 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="rounded-md bg-accent/10 p-3 text-accent">{icona}</span>
      <span className="font-display text-2xl font-semibold">{titolo}</span>
      <span className="text-sm text-muted-foreground">{descrizione}</span>
      <span className="label-stamp mt-auto inline-flex items-center gap-1 pt-3 group-hover:text-accent">
        Apri <ArrowRight className="size-3.5" />
      </span>
    </button>
  );
}
