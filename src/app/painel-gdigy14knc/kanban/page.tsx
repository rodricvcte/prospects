"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Canal, Prospect } from "@/lib/prospects";
import { ESTAGIOS_KANBAN, type Estagio } from "@/lib/estagio";
import DetalhesProspectPainel from "@/components/DetalhesProspectPainel";

const CANAL_LABEL: Record<Canal, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CanalBadge({ canal }: { canal: Canal }) {
  const estilos =
    canal === "instagram"
      ? "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20"
      : "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${estilos}`}
    >
      {CANAL_LABEL[canal]}
    </span>
  );
}

export default function KanbanProspects() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<Prospect | null>(null);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [colunaEmHover, setColunaEmHover] = useState<Estagio | null>(null);
  const [prospectsConvertidos, setProspectsConvertidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/prospects", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setErro(data.error);
          return;
        }
        setErro(null);
        // O Kanban só acompanha quem já saiu de "Novo" (demonstrou interesse
        // de algum jeito) — leads ainda não trabalhados não entram no board.
        setProspects((data.prospects as Prospect[]).filter((p) => p.estagio !== "Novo"));
      })
      .catch((e) => {
        if (e.name !== "AbortError") setErro("Erro ao carregar prospects");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/clientes", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) return;
        setProspectsConvertidos(
          new Set((data.clientes as { prospect_id: string | null }[]).map((c) => c.prospect_id).filter((id): id is string => !!id)),
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!sucesso) return;
    const timeout = setTimeout(() => setSucesso(null), 4000);
    return () => clearTimeout(timeout);
  }, [sucesso]);

  const colunas = useMemo(() => {
    const mapa = new Map<Estagio, Prospect[]>(ESTAGIOS_KANBAN.map((e) => [e, []]));
    for (const p of prospects) {
      (mapa.get(p.estagio) ?? mapa.get("Respondeu")!).push(p);
    }
    return mapa;
  }, [prospects]);

  const moverParaEstagio = async (id: string, novoEstagio: Estagio) => {
    const anterior = prospects;
    const prospect = prospects.find((p) => p.id === id);
    if (!prospect || prospect.estagio === novoEstagio) return;

    setProspects((atual) => atual.map((p) => (p.id === id ? { ...p, estagio: novoEstagio } : p)));
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estagio: novoEstagio }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProspects(anterior);
      setErro("Erro ao mover prospect. Tente novamente.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1800px] flex-1 px-6 py-10 sm:px-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Kanban</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {loading ? "Carregando…" : `${prospects.length} prospect${prospects.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/painel-gdigy14knc/clientes"
            className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Clientes
          </Link>
          <Link
            href="/painel-gdigy14knc"
            className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            ← Voltar pro painel
          </Link>
        </div>
      </header>

      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          {sucesso}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {ESTAGIOS_KANBAN.map((estagio) => {
          const cards = colunas.get(estagio) ?? [];
          const emHover = colunaEmHover === estagio;
          return (
            <div
              key={estagio}
              className={`flex w-56 shrink-0 flex-col rounded-lg border ${
                emHover ? "border-neutral-400" : "border-neutral-200"
              } ${
                emHover
                  ? "bg-neutral-100"
                  : estagio === "Recusado" || estagio === "Esfriou"
                    ? "bg-neutral-100"
                    : "bg-white"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setColunaEmHover(estagio);
              }}
              onDragLeave={() => setColunaEmHover((atual) => (atual === estagio ? null : atual))}
              onDrop={(e) => {
                e.preventDefault();
                setColunaEmHover(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) moverParaEstagio(id, estagio);
              }}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2.5">
                <h2 className="text-sm font-medium text-neutral-700">{estagio}</h2>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                  {cards.length}
                </span>
              </div>

              <div className="flex min-h-[120px] flex-col gap-2 p-2">
                {cards.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", p.id);
                      setArrastandoId(p.id);
                    }}
                    onDragEnd={() => setArrastandoId(null)}
                    onClick={() => setSelecionado(p)}
                    className={`cursor-pointer rounded-md border border-neutral-200 bg-white p-3 text-left shadow-sm hover:border-neutral-300 ${
                      arrastandoId === p.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-1">
                      <p className="truncate text-sm font-medium text-neutral-900" title={p.nome_prospect || undefined}>
                        {p.nome_prospect || "—"}
                      </p>
                      {prospectsConvertidos.has(p.id) && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Cliente
                        </span>
                      )}
                    </div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <CanalBadge canal={p.canal} />
                      {p.regiao && <span className="truncate text-xs text-neutral-500">{p.regiao}</span>}
                    </div>
                    <p className="text-xs text-neutral-400">{formatarDataHora(p.data_hr_approach)}</p>
                  </div>
                ))}
                {!loading && cards.length === 0 && (
                  <p className="px-1 py-2 text-center text-xs text-neutral-300">Nenhum prospect</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selecionado && (
        <DetalhesProspectPainel
          prospect={selecionado}
          jaConvertido={prospectsConvertidos.has(selecionado.id)}
          onClose={() => setSelecionado(null)}
          onUpdated={(atualizado) => {
            setProspects((atual) => atual.map((p) => (p.id === atualizado.id ? atualizado : p)));
            setSelecionado(atualizado);
          }}
          onConvertido={(cliente) => {
            if (cliente.prospect_id) {
              setProspectsConvertidos((atual) => new Set(atual).add(cliente.prospect_id!));
            }
            setSucesso(`${cliente.nome_completo} convertido em cliente com sucesso!`);
          }}
        />
      )}
    </div>
  );
}
