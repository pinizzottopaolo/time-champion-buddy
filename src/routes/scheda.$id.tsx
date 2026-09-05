import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  eliminaScheda,
  getScheda,
  listClienti,
  salvaScheda,
  totaleEffettivo,
  type RigaScheda,
  type Scheda,
} from "@/lib/schede";
import { GRUPPI, OPERAZIONI, formatMinuti } from "@/lib/operazioni";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/scheda/$id")({
  head: () => ({
    meta: [
      { title: "Scheda lavorazione — Tempi di confezione" },
      {
        name: "description",
        content:
          "Compila la scheda di lavorazione confezione: lavorazioni eseguite, numero fogli, tempo assegnato e tempo effettivo in minuti.",
      },
      { property: "og:title", content: "Scheda lavorazione confezione" },
      {
        property: "og:description",
        content: "Dettaglio commessa e tempi per ogni fase di lavorazione.",
      },
    ],
  }),
  component: SchedaPage,
});

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function SchedaPage() {
  const { id } = Route.useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["scheda", id],
    queryFn: () => getScheda(id),
    enabled: !!session,
  });

  const { data: clienti } = useQuery({
    queryKey: ["clienti"],
    queryFn: listClienti,
    enabled: !!session,
  });

  const [testata, setTestata] = useState<Partial<Scheda>>({});
  const [righe, setRighe] = useState<RigaScheda[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setTestata(data.scheda);
      setRighe(data.righe);
    }
  }, [data]);

  const totEff = useMemo(() => totaleEffettivo(righe), [righe]);
  const totAss = testata.tempo_assegnato ?? 0;

  function aggiornaRiga(chiave: string, patch: Partial<RigaScheda>) {
    setRighe((prev) => prev.map((r) => (r.chiave === chiave ? { ...r, ...patch } : r)));
  }

  async function salva() {
    setSaving(true);
    try {
      const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...campi } = testata as Scheda;
      await salvaScheda(id, campi, righe);
      qc.invalidateQueries({ queryKey: ["schede"] });
      qc.invalidateQueries({ queryKey: ["scheda", id] });
      toast.success("Scheda salvata");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-32">
      <Link to="/" className="label-stamp inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Tutte le schede
      </Link>

      <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Scheda lav. confezione</h1>

      {/* Testata */}
      <section className="paper-panel mt-5 rounded-xl p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Data">
            <Input
              type="date"
              value={testata.data ?? ""}
              onChange={(e) => setTestata({ ...testata, data: e.target.value })}
            />
          </Campo>
          <Campo label="Cliente">
            <Input
              list="elenco-clienti"
              placeholder="Scegli o scrivi un cliente"
              value={testata.cliente ?? ""}
              onChange={(e) => setTestata({ ...testata, cliente: e.target.value })}
            />
            <datalist id="elenco-clienti">
              {(clienti ?? []).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Campo>
          <Campo label="Lavoro">
            <Input
              value={testata.lavoro ?? ""}
              onChange={(e) => setTestata({ ...testata, lavoro: e.target.value })}
            />
          </Campo>
          <Campo label="N. ordine">
            <Input
              value={testata.n_ord ?? ""}
              onChange={(e) => setTestata({ ...testata, n_ord: e.target.value })}
            />
          </Campo>
          <Campo label="Tipo carta">
            <Input
              value={testata.tipo_carta ?? ""}
              onChange={(e) => setTestata({ ...testata, tipo_carta: e.target.value })}
            />
          </Campo>
          <Campo label="Formato">
            <Input
              value={testata.formato ?? ""}
              onChange={(e) => setTestata({ ...testata, formato: e.target.value })}
            />
          </Campo>
          {!isStampa && (
            <Campo label="Formato finito">
              <Input
                value={testata.formato_finito ?? ""}
                onChange={(e) => setTestata({ ...testata, formato_finito: e.target.value })}
              />
            </Campo>
          )}
          <Campo label="Quantità">
            <Input
              inputMode="numeric"
              value={testata.quantita ?? ""}
              onChange={(e) => setTestata({ ...testata, quantita: numOrNull(e.target.value) })}
            />
          </Campo>
          {isStampa && (
            <>
              <Campo label="Fogli prelevati">
                <Input
                  inputMode="numeric"
                  value={testata.fogli_prelevati ?? ""}
                  onChange={(e) =>
                    setTestata({ ...testata, fogli_prelevati: numOrNull(e.target.value) })
                  }
                />
              </Campo>
              <Campo label="Fogli stampati">
                <Input
                  inputMode="numeric"
                  value={testata.fogli_stampati ?? ""}
                  onChange={(e) =>
                    setTestata({ ...testata, fogli_stampati: numOrNull(e.target.value) })
                  }
                />
              </Campo>
              <Campo label="Tipo stampa">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={testata.tipo_stampa ?? ""}
                  onChange={(e) => setTestata({ ...testata, tipo_stampa: e.target.value })}
                >
                  <option value="">—</option>
                  {TIPI_STAMPA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Colore">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={coloreSel}
                  onChange={(e) =>
                    setTestata({
                      ...testata,
                      colore: e.target.value === "Altro" ? " " : e.target.value,
                    })
                  }
                >
                  <option value="">—</option>
                  <option value="CMYK">CMYK</option>
                  <option value="Pantone">Pantone</option>
                  <option value="Altro">Altro</option>
                </select>
                {coloreSel === "Altro" && (
                  <Input
                    className="mt-2"
                    placeholder="Specifica il colore"
                    value={(testata.colore ?? "").trim()}
                    onChange={(e) => setTestata({ ...testata, colore: e.target.value })}
                  />
                )}
              </Campo>
            </>
          )}
        </div>
      </section>

      {/* Lavorazioni */}
      {GRUPPI.map((g) => (
        <section key={g.id} className="mt-6">
          <h2 className="label-stamp">{g.titolo}</h2>
          <div className="mt-2 space-y-2">
            {OPERAZIONI.filter((o) => o.gruppo === g.id).map((op) => {
              const riga = righe.find((r) => r.chiave === op.chiave);
              if (!riga) return null;
              return (
                <div
                  key={op.chiave}
                  className={`sheet rounded-md p-3 transition-opacity ${riga.attiva ? "" : "opacity-70"}`}
                >
                  <label className="flex items-center gap-3">
                    <Checkbox
                      checked={riga.attiva}
                      onCheckedChange={(v) =>
                        aggiornaRiga(op.chiave, { attiva: v === true })
                      }
                    />
                    <span className="font-display text-sm font-medium">{op.etichetta}</span>
                  </label>

                  {riga.attiva && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {op.campi.includes("n_fogli") && (
                        <Campo label="N. fogli">
                          <Input
                            inputMode="numeric"
                            value={riga.n_fogli ?? ""}
                            onChange={(e) =>
                              aggiornaRiga(op.chiave, { n_fogli: numOrNull(e.target.value) })
                            }
                          />
                        </Campo>
                      )}
                      {op.campi.includes("fornitore") && (
                        <Campo label="Fornitore">
                          <Input
                            value={riga.fornitore}
                            onChange={(e) =>
                              aggiornaRiga(op.chiave, { fornitore: e.target.value })
                            }
                          />
                        </Campo>
                      )}
                      {op.campi.includes("parti") && (
                        <>
                          <Campo label="N. parti">
                            <Input
                              inputMode="numeric"
                              value={riga.n_parti ?? ""}
                              onChange={(e) =>
                                aggiornaRiga(op.chiave, { n_parti: numOrNull(e.target.value) })
                              }
                            />
                          </Campo>
                          <Campo label="N. fascicoli">
                            <Input
                              inputMode="numeric"
                              value={riga.n_fasc ?? ""}
                              onChange={(e) =>
                                aggiornaRiga(op.chiave, { n_fasc: numOrNull(e.target.value) })
                              }
                            />
                          </Campo>
                          <Campo label="N. pagine">
                            <Input
                              inputMode="numeric"
                              value={riga.n_pagine ?? ""}
                              onChange={(e) =>
                                aggiornaRiga(op.chiave, { n_pagine: numOrNull(e.target.value) })
                              }
                            />
                          </Campo>
                        </>
                      )}
                      {op.campi.includes("fori") && (
                        <>
                          <Campo label="Fori qtà">
                            <Input
                              inputMode="numeric"
                              value={riga.fori_qta ?? ""}
                              onChange={(e) =>
                                aggiornaRiga(op.chiave, { fori_qta: numOrNull(e.target.value) })
                              }
                            />
                          </Campo>
                          <Campo label="Ø">
                            <Input
                              value={riga.diametro}
                              onChange={(e) =>
                                aggiornaRiga(op.chiave, { diametro: e.target.value })
                              }
                            />
                          </Campo>
                        </>
                      )}
                      {op.campi.includes("mezzo_taglio") && (
                        <label className="col-span-2 flex items-center gap-2 self-end pb-2 text-sm">
                          <Checkbox
                            checked={riga.mezzo_taglio}
                            onCheckedChange={(v) =>
                              aggiornaRiga(op.chiave, { mezzo_taglio: v === true })
                            }
                          />
                          1/2 Taglio
                        </label>
                      )}
                      <Campo label="Tempo effet. (min)">
                        <Input
                          inputMode="numeric"
                          value={riga.tempo_effettivo ?? ""}
                          onChange={(e) =>
                            aggiornaRiga(op.chiave, {
                              tempo_effettivo: numOrNull(e.target.value),
                            })
                          }
                        />
                      </Campo>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Chiusura */}
      <section className="sheet mt-6 rounded-md p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Tempo assegnato totale (min)">
            <Input
              inputMode="numeric"
              value={testata.tempo_assegnato ?? ""}
              onChange={(e) =>
                setTestata({ ...testata, tempo_assegnato: numOrNull(e.target.value) })
              }
            />
          </Campo>
          <Campo label="Imballo — n. colli">
            <Input
              inputMode="numeric"
              value={testata.imballo_colli ?? ""}
              onChange={(e) =>
                setTestata({ ...testata, imballo_colli: numOrNull(e.target.value) })
              }
            />
          </Campo>
          <Campo label="Firma">
            <Input
              value={testata.firma ?? ""}
              onChange={(e) => setTestata({ ...testata, firma: e.target.value })}
            />
          </Campo>
        </div>
        <div className="mt-4 space-y-4">
          <Campo label="Note">
            <Textarea
              rows={2}
              value={testata.note ?? ""}
              onChange={(e) => setTestata({ ...testata, note: e.target.value })}
            />
          </Campo>
          <Campo label="Problemi riscontrati">
            <Textarea
              rows={2}
              value={testata.problemi ?? ""}
              onChange={(e) => setTestata({ ...testata, problemi: e.target.value })}
            />
          </Campo>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-4 text-destructive">
              <Trash2 className="size-4" /> Elimina scheda
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare la scheda?</AlertDialogTitle>
              <AlertDialogDescription>
                L'operazione è definitiva e rimuove anche tutti i tempi registrati.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await eliminaScheda(id);
                  qc.invalidateQueries({ queryKey: ["schede"] });
                  navigate({ to: "/" });
                }}
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      {/* Barra totali */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="text-sm leading-tight">
            <p className="label-stamp">Tempo totale effettivo</p>
            <p className="font-display text-xl font-semibold">{formatMinuti(totEff)}</p>
            <p className="text-xs text-muted-foreground">
              Assegnato {formatMinuti(totAss)}
            </p>
          </div>
          <Button onClick={salva} disabled={saving}>
            <Save className="size-4" /> Salva
          </Button>
        </div>
      </div>
    </main>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="label-stamp">{label}</Label>
      {children}
    </div>
  );
}
