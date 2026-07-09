"use client";

import { useEffect, useMemo, useState } from "react";
import type { Canal, Prospect } from "@/lib/prospects";
import NovoProspectModal from "@/components/NovoProspectModal";

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
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${estilos}`}
    >
      {CANAL_LABEL[canal]}
    </span>
  );
}

export default function PainelProspects() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [canal, setCanal] = useState<"" | Canal>("");
  const [regiao, setRegiao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [regioesDisponiveis, setRegioesDisponiveis] = useState<string[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (canal) params.set("canal", canal);
    if (regiao) params.set("regiao", regiao);
    if (dataInicio) params.set("data_inicio", dataInicio);
    if (dataFim) params.set("data_fim", dataFim);

    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/prospects?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setErro(data.error);
            setProspects([]);
            return;
          }
          setErro(null);
          setProspects(data.prospects);
          setRegioesDisponiveis((atual) => {
            const regioes = new Set(atual);
            for (const p of data.prospects as Prospect[]) {
              if (p.regiao) regioes.add(p.regiao);
            }
            return Array.from(regioes).sort();
          });
        })
        .catch((e) => {
          if (e.name !== "AbortError") setErro("Erro ao carregar prospects");
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search, canal, regiao, dataInicio, dataFim, refreshKey]);

  const toggleExpandido = (id: string) => {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const totalLabel = useMemo(() => {
    if (loading) return "Carregando…";
    return `${prospects.length} prospect${prospects.length === 1 ? "" : "s"}`;
  }, [loading, prospects.length]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Prospecção
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{totalLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Novo Prospect
        </button>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Buscar
          </label>
          <input
            type="text"
            placeholder="Nome ou conta de destino"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Canal
          </label>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value as "" | Canal)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
          >
            <option value="">Todos</option>
            <option value="instagram">Instagram</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Região
          </label>
          <select
            value={regiao}
            onChange={(e) => setRegiao(e.target.value)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
          >
            <option value="">Todas</option>
            {regioesDisponiveis.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            De
          </label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Até
          </label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
          />
        </div>
      </div>

      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs font-medium uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Conta Origem</th>
              <th className="px-4 py-3">Conta Destino</th>
              <th className="px-4 py-3">Região</th>
              <th className="px-4 py-3">Data/Hora</th>
              <th className="px-4 py-3">Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {!loading && prospects.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                  Nenhum prospect encontrado.
                </td>
              </tr>
            )}
            {prospects.map((p) => {
              const expandido = expandidos.has(p.id);
              const mensagem = p.msg_utilizada ?? "";
              const truncada = mensagem.length > 60 && !expandido;
              return (
                <tr key={p.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-900">{p.nome_prospect || "—"}</td>
                  <td className="px-4 py-3">
                    <CanalBadge canal={p.canal} />
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{p.conta_origem}</td>
                  <td className="px-4 py-3 text-neutral-600">{p.conta_destino}</td>
                  <td className="px-4 py-3 text-neutral-600">{p.regiao || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-600">
                    {formatarDataHora(p.data_hr_approach)}
                  </td>
                  <td
                    className="max-w-xs cursor-pointer px-4 py-3 text-neutral-600"
                    onClick={() => mensagem.length > 60 && toggleExpandido(p.id)}
                  >
                    {mensagem ? (
                      <span className={truncada ? "line-clamp-1" : "whitespace-pre-wrap"}>
                        {mensagem}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <NovoProspectModal
          onClose={() => setModalAberto(false)}
          onCreated={() => {
            setModalAberto(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
