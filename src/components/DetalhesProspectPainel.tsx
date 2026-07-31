"use client";

import { useEffect, useRef, useState } from "react";
import type { Canal, Prospect } from "@/lib/prospects";
import type { Cliente } from "@/lib/clientes";
import ConverterClienteModal from "./ConverterClienteModal";
import EditarProspectModal from "./EditarProspectModal";

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

interface Props {
  prospect: Prospect;
  jaConvertido: boolean;
  onClose: () => void;
  onUpdated: (prospect: Prospect) => void;
  onConvertido: (cliente: Cliente) => void;
}

export default function DetalhesProspectPainel({
  prospect,
  jaConvertido,
  onClose,
  onUpdated,
  onConvertido,
}: Props) {
  const [notas, setNotas] = useState(prospect.notas ?? "");
  const [status, setStatus] = useState<"idle" | "salvando" | "salvo" | "erro">("idle");
  const notasSalvas = useRef(prospect.notas ?? "");
  const [rascunhoUrl, setRascunhoUrl] = useState(prospect.rascunho_url ?? "");
  const [statusRascunho, setStatusRascunho] = useState<"idle" | "salvando" | "salvo" | "erro">("idle");
  const rascunhoSalvo = useRef(prospect.rascunho_url ?? "");
  const [modalConversaoAberto, setModalConversaoAberto] = useState(false);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    setNotas(prospect.notas ?? "");
    notasSalvas.current = prospect.notas ?? "";
    setStatus("idle");
    setRascunhoUrl(prospect.rascunho_url ?? "");
    rascunhoSalvo.current = prospect.rascunho_url ?? "";
    setStatusRascunho("idle");
  }, [prospect.id, prospect.notas, prospect.rascunho_url]);

  const salvarNotas = async () => {
    if (notas === notasSalvas.current) return;
    setStatus("salvando");
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas: notas.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("erro");
        return;
      }
      notasSalvas.current = notas;
      setStatus("salvo");
      onUpdated(data.prospect);
    } catch {
      setStatus("erro");
    }
  };

  const salvarRascunho = async () => {
    if (rascunhoUrl === rascunhoSalvo.current) return;
    setStatusRascunho("salvando");
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rascunho_url: rascunhoUrl.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusRascunho("erro");
        return;
      }
      setRascunhoUrl(data.prospect.rascunho_url ?? "");
      rascunhoSalvo.current = data.prospect.rascunho_url ?? "";
      setStatusRascunho("salvo");
      onUpdated(data.prospect);
    } catch {
      setStatusRascunho("erro");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            {prospect.nome_prospect || "Prospect"}
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="text-sm font-medium text-neutral-400 hover:text-neutral-900"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {prospect.estagio === "Em desenvolvimento" && (
          <div className="mb-5">
            {jaConvertido ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                ✓ Já convertido em cliente
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setModalConversaoAberto(true)}
                className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Converter em Cliente
              </button>
            )}
          </div>
        )}

        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs font-medium text-neutral-500">Rascunho</label>
            {statusRascunho === "salvando" && <span className="text-xs text-neutral-400">Salvando…</span>}
            {statusRascunho === "salvo" && <span className="text-xs text-emerald-600">Salvo</span>}
            {statusRascunho === "erro" && <span className="text-xs text-red-600">Erro ao salvar</span>}
          </div>
          <input
            type="text"
            value={rascunhoUrl}
            onChange={(e) => {
              setRascunhoUrl(e.target.value);
              setStatusRascunho("idle");
            }}
            onBlur={salvarRascunho}
            placeholder="https://…"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
          {prospect.rascunho_url && (
            <a
              href={prospect.rascunho_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block overflow-hidden rounded-md border border-neutral-200 hover:border-neutral-300"
            >
              <img
                src={`https://s.wordpress.com/mshots/v1/${encodeURIComponent(prospect.rascunho_url)}?w=600&h=340`}
                alt="Miniatura do rascunho"
                className="block h-40 w-full bg-neutral-50 object-cover object-top"
              />
              <span className="block truncate border-t border-neutral-200 px-2 py-1 text-xs text-blue-600">
                {prospect.rascunho_url}
              </span>
            </a>
          )}
        </div>

        <dl className="flex flex-col gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-neutral-500">Canal</dt>
            <dd className="mt-0.5 text-neutral-900">{CANAL_LABEL[prospect.canal]}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-500">Sender</dt>
            <dd className="mt-0.5 text-neutral-900">{prospect.conta_origem}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-500">Receiver</dt>
            <dd className="mt-0.5 text-neutral-900">{prospect.conta_destino}</dd>
          </div>
          {prospect.origem_instagram && (
            <div>
              <dt className="text-xs font-medium text-neutral-500">Origem (Instagram)</dt>
              <dd className="mt-0.5">
                <a
                  href={`https://instagram.com/${prospect.origem_instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  @{prospect.origem_instagram.replace(/^@/, "")}
                </a>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-neutral-500">Região</dt>
            <dd className="mt-0.5 text-neutral-900">{prospect.regiao || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-500">Data/hora do approach</dt>
            <dd className="mt-0.5 text-neutral-900">{formatarDataHora(prospect.data_hr_approach)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-500">Mensagem utilizada</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-neutral-900">{prospect.msg_utilizada || "—"}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs font-medium text-neutral-500">Notas</label>
            {status === "salvando" && <span className="text-xs text-neutral-400">Salvando…</span>}
            {status === "salvo" && <span className="text-xs text-emerald-600">Salvo</span>}
            {status === "erro" && <span className="text-xs text-red-600">Erro ao salvar</span>}
          </div>
          <textarea
            value={notas}
            onChange={(e) => {
              setNotas(e.target.value);
              setStatus("idle");
            }}
            onBlur={salvarNotas}
            rows={5}
            placeholder="Ex: ficou de avaliar até segunda, pediu desconto…"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={salvarNotas}
              disabled={status === "salvando" || notas === notasSalvas.current}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              Salvar notas
            </button>
          </div>
        </div>
      </div>

      {modalConversaoAberto && (
        <ConverterClienteModal
          prospect={prospect}
          onClose={() => setModalConversaoAberto(false)}
          onConverted={(cliente) => {
            setModalConversaoAberto(false);
            onConvertido(cliente);
          }}
        />
      )}

      {editando && (
        <EditarProspectModal
          prospect={prospect}
          onClose={() => setEditando(false)}
          onSaved={(atualizado) => {
            setEditando(false);
            onUpdated(atualizado);
          }}
        />
      )}
    </div>
  );
}
