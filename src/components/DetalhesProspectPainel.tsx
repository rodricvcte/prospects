"use client";

import { useEffect, useRef, useState } from "react";
import type { Canal, Prospect } from "@/lib/prospects";
import type { Cliente } from "@/lib/clientes";
import ConverterClienteModal from "./ConverterClienteModal";

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
  const [modalConversaoAberto, setModalConversaoAberto] = useState(false);

  useEffect(() => {
    setNotas(prospect.notas ?? "");
    notasSalvas.current = prospect.notas ?? "";
    setStatus("idle");
  }, [prospect.id, prospect.notas]);

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
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {prospect.estagio === "Fechado" && (
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
    </div>
  );
}
