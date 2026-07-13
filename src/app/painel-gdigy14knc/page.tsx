"use client";

import { useEffect, useMemo, useState } from "react";
import type { Canal, Prospect } from "@/lib/prospects";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import NovoProspectModal from "@/components/NovoProspectModal";
import EditarProspectModal from "@/components/EditarProspectModal";
import ContatosPorDiaChart from "@/components/ContatosPorDiaChart";
import InteressadosPanel from "@/components/InteressadosPanel";
import AproachesPorSenderPanel from "@/components/AproachesPorSenderPanel";
import AproachesHojePorSenderPanel from "@/components/AproachesHojePorSenderPanel";

const CANAL_LABEL: Record<Canal, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

// Contas de origem fixas (configuradas na extensão) ficam salvas sem formatação
// (ex: "+5511930226677"), enquanto conta_destino normalmente já vem formatada
// pela extração do WhatsApp/Instagram (ex: "+55 11 91072-4215"). Aplicamos a
// mesma máscara nas duas colunas para exibição consistente — se o valor não
// bater com o formato esperado de telefone BR, retorna como está (ex: @usuário
// do Instagram).
function formatarTelefone(valor: string): string {
  if (!/^\+?\d[\d\s()-]{6,}$/.test(valor)) return valor;

  let digitos = valor.replace(/\D/g, "");
  let comCodigoPais = false;
  if (digitos.startsWith("55") && digitos.length >= 12) {
    digitos = digitos.slice(2);
    comCodigoPais = true;
  }

  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  if (!/^\d{2}$/.test(ddd) || (resto.length !== 8 && resto.length !== 9)) {
    return valor;
  }

  const parteFinal =
    resto.length === 9 ? `${resto.slice(0, 5)}-${resto.slice(5)}` : `${resto.slice(0, 4)}-${resto.slice(4)}`;

  return `${comCodigoPais ? "+55 " : ""}${ddd} ${parteFinal}`;
}

function escaparCsv(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

function baixarProspectsCsv(prospects: Prospect[]) {
  const cabecalho = [
    "Nome",
    "Canal",
    "Sender",
    "Receiver",
    "Origem (Instagram)",
    "Região",
    "Data/Hora",
    "Mensagem",
    "Recusado",
    "Interessado",
  ];

  const linhas = prospects.map((p) =>
    [
      p.nome_prospect ?? "",
      CANAL_LABEL[p.canal],
      p.conta_origem,
      p.conta_destino,
      p.origem_instagram ?? "",
      p.regiao ?? "",
      formatarDataHora(p.data_hr_approach),
      p.msg_utilizada ?? "",
      p.recusado ? "Sim" : "Não",
      p.interessado ? "Sim" : "Não",
    ]
      .map((campo) => escaparCsv(String(campo)))
      .join(","),
  );

  const csv = "﻿" + [cabecalho.join(","), ...linhas].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prospects_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

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
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${estilos}`}
    >
      {CANAL_LABEL[canal]}
    </span>
  );
}

export default function PainelProspects() {
  const { data: session } = useSession();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [canal, setCanal] = useState<"" | Canal>("");
  const [regiao, setRegiao] = useState("");
  const [sender, setSender] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [regioesDisponiveis, setRegioesDisponiveis] = useState<string[]>([]);
  const [sendersDisponiveis, setSendersDisponiveis] = useState<string[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [prospectEditando, setProspectEditando] = useState<Prospect | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (canal) params.set("canal", canal);
    if (regiao) params.set("regiao", regiao);
    if (sender) params.set("sender", sender);
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
          setSendersDisponiveis((atual) => {
            const senders = new Set(atual);
            for (const p of data.prospects as Prospect[]) {
              if (p.conta_origem) senders.add(p.conta_origem);
            }
            return Array.from(senders).sort();
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
  }, [search, canal, regiao, sender, dataInicio, dataFim, refreshKey]);

  const toggleExpandido = (id: string) => {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const atualizarStatus = async (id: string, campo: "recusado" | "interessado", valor: boolean) => {
    setProspects((atual) => atual.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProspects((atual) => atual.map((p) => (p.id === id ? { ...p, [campo]: !valor } : p)));
      setErro("Erro ao atualizar status. Tente novamente.");
    }
  };

  const excluirProspect = async (id: string) => {
    if (!window.confirm("Excluir este prospect? Essa ação não pode ser desfeita.")) return;
    const anterior = prospects;
    setProspects((atual) => atual.filter((p) => p.id !== id));
    try {
      const res = await fetch(`/api/prospects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setProspects(anterior);
      setErro("Erro ao excluir prospect. Tente novamente.");
    }
  };

  const totalLabel = useMemo(() => {
    if (loading) return "Carregando…";
    return `${prospects.length} prospect${prospects.length === 1 ? "" : "s"}`;
  }, [loading, prospects.length]);

  return (
    <div className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-4 sm:px-10">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Prospecção
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{totalLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {session?.user?.email && (
              <span className="text-xs text-neutral-400">{session.user.email}</span>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Sair
            </button>
          </div>
          <div className="flex gap-3">
            <Link
              href="/painel-gdigy14knc/kanban"
              className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Kanban
            </Link>
            <Link
              href="/painel-gdigy14knc/clientes"
              className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Clientes
            </Link>
            <button
              type="button"
              onClick={() => baixarProspectsCsv(prospects)}
              className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Baixar CSV
            </button>
            <button
              type="button"
              onClick={() => setModalAberto(true)}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Novo Prospect
            </button>
          </div>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Buscar
          </label>
          <input
            type="text"
            placeholder="Nome, Receiver ou Origem"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Canal
          </label>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value as "" | Canal)}
            className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 focus:border-neutral-400 focus:outline-none"
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
            className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 focus:border-neutral-400 focus:outline-none"
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
            Sender
          </label>
          <select
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 focus:border-neutral-400 focus:outline-none"
          >
            <option value="">Todos</option>
            {sendersDisponiveis.map((s) => (
              <option key={s} value={s}>
                {s}
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
            max={dataFim || hoje}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Até
          </label>
          <input
            type="date"
            value={dataFim}
            min={dataInicio || undefined}
            max={hoje}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900 focus:border-neutral-400 focus:outline-none"
          />
        </div>
      </div>

      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="h-full lg:col-span-2">
          <ContatosPorDiaChart prospects={prospects} />
        </div>
        <InteressadosPanel prospects={prospects} />
        <AproachesPorSenderPanel prospects={prospects} />
        <AproachesHojePorSenderPanel prospects={prospects} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full table-auto text-left text-[11px]">
          <thead>
            <tr className="border-b border-neutral-200 bg-[#2a78d6] text-center text-[11px] font-medium uppercase tracking-wide text-white">
              <th className="px-3 py-2.5">Nome</th>
              <th className="px-3 py-2.5">Canal</th>
              <th className="px-3 py-2.5">Sender</th>
              <th className="px-3 py-2.5">Receiver</th>
              <th className="px-3 py-2.5">Origem</th>
              <th className="px-3 py-2.5">Região</th>
              <th className="px-3 py-2.5">Data/Hora</th>
              <th className="px-3 py-2.5">Mensagem</th>
              <th className="px-2 py-2.5 text-center">Recusado</th>
              <th className="px-2 py-2.5 text-center">Interessado</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && prospects.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-neutral-400">
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
                  <td
                    className="max-w-[160px] truncate px-3 py-2.5 text-neutral-900"
                    title={p.nome_prospect || undefined}
                  >
                    {p.nome_prospect || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <CanalBadge canal={p.canal} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">{formatarTelefone(p.conta_origem)}</td>
                  <td className="max-w-[150px] truncate px-3 py-2.5 text-neutral-600" title={formatarTelefone(p.conta_destino)}>
                    {formatarTelefone(p.conta_destino)}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2.5 text-neutral-600" title={p.origem_instagram ?? undefined}>
                    {p.origem_instagram ? (
                      <a
                        href={`https://instagram.com/${p.origem_instagram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline"
                      >
                        @{p.origem_instagram.replace(/^@/, "")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">{p.regiao || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-neutral-600">
                    {formatarDataHora(p.data_hr_approach)}
                  </td>
                  <td
                    className="max-w-[130px] cursor-pointer px-3 py-2.5 text-neutral-600"
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
                  <td className="px-2 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={p.recusado}
                      onChange={(e) => atualizarStatus(p.id, "recusado", e.target.checked)}
                      className="h-3 w-3 cursor-pointer accent-neutral-900"
                    />
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={p.interessado}
                      onChange={(e) => atualizarStatus(p.id, "interessado", e.target.checked)}
                      className="h-3 w-3 cursor-pointer accent-neutral-900"
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => setProspectEditando(p)}
                      className="mr-2 text-neutral-400 hover:text-neutral-900"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirProspect(p.id)}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      Excluir
                    </button>
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

      {prospectEditando && (
        <EditarProspectModal
          prospect={prospectEditando}
          onClose={() => setProspectEditando(null)}
          onSaved={(atualizado) => {
            setProspects((atual) => atual.map((p) => (p.id === atualizado.id ? atualizado : p)));
            setProspectEditando(null);
          }}
        />
      )}
    </div>
  );
}
