"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import type { Cliente, StatusPagamento, StatusTrabalho } from "@/lib/clientes";
import { SERVICOS, CANAIS } from "@/lib/cliente-tipos";
import EditarClienteModal from "@/components/EditarClienteModal";

function formatarValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

const CANAL_LABEL: Record<string, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

function StatusPagamentoBadge({ status }: { status: StatusPagamento }) {
  const estilos =
    status === "Pago"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : "bg-amber-50 text-amber-700 ring-amber-600/20";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${estilos}`}
    >
      {status}
    </span>
  );
}

function StatusTrabalhoBadge({ status }: { status: StatusTrabalho }) {
  const estilos =
    status === "Entregue"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : "bg-sky-50 text-sky-700 ring-sky-600/20";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${estilos}`}
    >
      {status}
    </span>
  );
}

const CAMPOS_EXPANDIDOS = 12;

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="col-span-2 sm:col-span-4">
      <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-neutral-500">{titulo}</p>
      <dl className="grid grid-cols-3 gap-x-6 gap-y-0.5 sm:grid-cols-6">{children}</dl>
    </div>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtroStatusPagamento, setFiltroStatusPagamento] = useState<"" | StatusPagamento>("");
  const [filtroStatusTrabalho, setFiltroStatusTrabalho] = useState<"" | StatusTrabalho>("");
  const [filtroServico, setFiltroServico] = useState<"" | (typeof SERVICOS)[number]>("");
  const [filtroCanal, setFiltroCanal] = useState<"" | (typeof CANAIS)[number]>("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<Cliente | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (filtroStatusPagamento) params.set("status_pagamento", filtroStatusPagamento);
    if (filtroStatusTrabalho) params.set("status_trabalho", filtroStatusTrabalho);
    if (filtroServico) params.set("servico", filtroServico);
    if (filtroCanal) params.set("canal", filtroCanal);

    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/clientes?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setErro(data.error);
            return;
          }
          setErro(null);
          setClientes(data.clientes);
        })
        .catch((e) => {
          if (e.name !== "AbortError") setErro("Erro ao carregar clientes");
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search, filtroStatusPagamento, filtroStatusTrabalho, filtroServico, filtroCanal]);

  const toggleExpandido = (id: string) => {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const excluirCliente = async (id: string) => {
    if (!window.confirm("Excluir este cliente? Essa ação não pode ser desfeita.")) return;
    const anterior = clientes;
    setClientes((atual) => atual.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setClientes(anterior);
      setErro("Erro ao excluir cliente. Tente novamente.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-10 sm:px-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Clientes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {loading ? "Carregando…" : `${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/painel-gdigy14knc/kanban"
            className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Kanban
          </Link>
          <Link
            href="/painel-gdigy14knc"
            className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            ← Voltar pro painel
          </Link>
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Buscar</label>
          <input
            type="text"
            placeholder="Nome, ramo ou região"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Serviço</label>
          <select
            value={filtroServico}
            onChange={(e) => setFiltroServico(e.target.value as "" | (typeof SERVICOS)[number])}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
          >
            <option value="">Todos</option>
            {SERVICOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Canal</label>
          <select
            value={filtroCanal}
            onChange={(e) => setFiltroCanal(e.target.value as "" | (typeof CANAIS)[number])}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
          >
            <option value="">Todos</option>
            {CANAIS.map((c) => (
              <option key={c} value={c}>
                {CANAL_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status do trabalho</label>
          <select
            value={filtroStatusTrabalho}
            onChange={(e) => setFiltroStatusTrabalho(e.target.value as "" | StatusTrabalho)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
          >
            <option value="">Todos</option>
            <option value="Em desenvolvimento">Em desenvolvimento</option>
            <option value="Entregue">Entregue</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status do pagamento</label>
          <select
            value={filtroStatusPagamento}
            onChange={(e) => setFiltroStatusPagamento(e.target.value as "" | StatusPagamento)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
          >
            <option value="">Todos</option>
            <option value="Pendente">Pendente</option>
            <option value="Pago">Pago</option>
          </select>
        </div>
      </div>

      {erro && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full table-auto text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-200 bg-[#2a78d6] text-left text-xs font-medium uppercase tracking-wide text-white">
              <th className="px-2 py-2.5"></th>
              <th className="px-3 py-2.5">Nome</th>
              <th className="px-3 py-2.5">CPF/CNPJ</th>
              <th className="px-3 py-2.5">Ramo</th>
              <th className="px-3 py-2.5">Idade</th>
              <th className="px-3 py-2.5">Gênero</th>
              <th className="px-3 py-2.5">Região</th>
              <th className="px-3 py-2.5">Data fechamento</th>
              <th className="px-3 py-2.5">Serviço</th>
              <th className="px-3 py-2.5">Valor</th>
              <th className="px-3 py-2.5">Status projeto</th>
              <th className="px-3 py-2.5">Data de entrega</th>
              <th className="px-3 py-2.5">Status pagto</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && clientes.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-10 text-center text-neutral-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {clientes.map((c) => {
              const expandido = expandidos.has(c.id);
              return (
                <Fragment key={c.id}>
                  <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-2 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpandido(c.id)}
                        aria-label={expandido ? "Recolher" : "Expandir"}
                        className="text-neutral-400 hover:text-neutral-900"
                      >
                        {expandido ? "▾" : "▸"}
                      </button>
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 text-neutral-900" title={c.nome_completo}>
                      {c.nome_completo}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">{c.cpf_cnpj || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">{c.ramo || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">{c.idade ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">{c.genero || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">{c.regiao || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">{formatarData(c.data_fechamento)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">{c.servico}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">{formatarValor(c.valor_fechado)}</td>
                    <td className="px-3 py-2.5">
                      <StatusTrabalhoBadge status={c.status_trabalho} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">
                      {c.data_entrega ? formatarData(c.data_entrega) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPagamentoBadge status={c.status_pagamento} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <button
                        type="button"
                        onClick={() => setEditando(c)}
                        className="mr-2 text-neutral-400 hover:text-neutral-900"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirCliente(c.id)}
                        className="text-neutral-400 hover:text-red-600"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                  {expandido && (
                    <tr className="border-b border-neutral-100 bg-neutral-50 last:border-0">
                      <td></td>
                      <td colSpan={CAMPOS_EXPANDIDOS + 1} className="px-3 py-3">
                        <div className="flex flex-col gap-5">
                          <Secao titulo="Informações de prospecção">
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Sender</dt>
                              <dd className="text-neutral-700">{c.sender || "—"}</dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Data da abordagem</dt>
                              <dd className="text-neutral-700">
                                {c.data_abordagem ? formatarDataHora(c.data_abordagem) : "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Canal</dt>
                              <dd className="text-neutral-700">{c.canal ? CANAL_LABEL[c.canal] : "—"}</dd>
                            </div>
                          </Secao>

                          <Secao titulo="Contatos">
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Perfil Instagram</dt>
                              <dd className="text-neutral-700">
                                {c.perfil_instagram ? (
                                  <a
                                    href={`https://instagram.com/${c.perfil_instagram.replace(/^@/, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    @{c.perfil_instagram.replace(/^@/, "")}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Número WhatsApp</dt>
                              <dd className="text-neutral-700">{c.numero_whatsapp || "—"}</dd>
                            </div>
                          </Secao>

                          <Secao titulo="Pagamento">
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Forma de pagamento</dt>
                              <dd className="text-neutral-700">{c.forma_pagamento || "—"}</dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Data de pagamento</dt>
                              <dd className="text-neutral-700">
                                {c.data_pagamento ? formatarData(c.data_pagamento) : "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">NF emitida</dt>
                              <dd className="text-neutral-700">{c.nf_emitida ? "Sim" : "Não"}</dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Data emissão NF</dt>
                              <dd className="text-neutral-700">
                                {c.data_emissao_nf ? formatarData(c.data_emissao_nf) : "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Observações</dt>
                              <dd className="whitespace-pre-wrap text-neutral-700">{c.observacoes_pagamento || "—"}</dd>
                            </div>
                          </Secao>

                          <Secao titulo="Informações técnicas">
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">URL rascunho</dt>
                              <dd className="text-neutral-700">
                                {c.url_rascunho ? (
                                  <a
                                    href={c.url_rascunho}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {c.url_rascunho}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">URL produção</dt>
                              <dd className="text-neutral-700">
                                {c.url_prod ? (
                                  <a
                                    href={c.url_prod}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {c.url_prod}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Git</dt>
                              <dd className="text-neutral-700">
                                {c.url_git ? (
                                  <a
                                    href={c.url_git}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {c.url_git}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Hospedagem</dt>
                              <dd className="text-neutral-700">
                                {c.url_hospedagem ? (
                                  <a
                                    href={c.url_hospedagem}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {c.url_hospedagem}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </dd>
                            </div>
                          </Secao>

                          <Secao titulo="Informações de domínio">
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Domínio contratado</dt>
                              <dd className="text-neutral-700">{c.dominio || "—"}</dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Contratado em</dt>
                              <dd className="text-neutral-700">
                                {c.data_contratacao_dominio ? formatarData(c.data_contratacao_dominio) : "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Plano do domínio</dt>
                              <dd className="text-neutral-700">
                                {c.plano_dominio_anos ? `${c.plano_dominio_anos} ano${c.plano_dominio_anos > 1 ? "s" : ""}` : "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Valor domínio/ano</dt>
                              <dd className="text-neutral-700">
                                {c.valor_dominio_ano !== null ? formatarValor(c.valor_dominio_ano) : "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Provedor domínio</dt>
                              <dd className="text-neutral-700">{c.provedor_dominio || "—"}</dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Pagamento domínio</dt>
                              <dd className="text-neutral-700">{c.pagamento_dominio || "—"}</dd>
                            </div>
                            <div>
                              <dt className="text-[11px] font-medium text-neutral-500">Renovação domínio</dt>
                              <dd className="text-neutral-700">
                                {c.data_renovacao_dominio ? formatarData(c.data_renovacao_dominio) : "—"}
                              </dd>
                            </div>
                          </Secao>

                          <div>
                            <dt className="text-[11px] font-medium text-neutral-500">Notas</dt>
                            <dd className="whitespace-pre-wrap text-neutral-700">{c.notas || "—"}</dd>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {editando && (
        <EditarClienteModal
          cliente={editando}
          onClose={() => setEditando(null)}
          onSaved={(atualizado) => {
            setClientes((atual) => atual.map((c) => (c.id === atualizado.id ? atualizado : c)));
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}
