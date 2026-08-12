"use client";

import type { Prospect } from "@/lib/prospects";

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
  onClose: () => void;
}

export default function HistoricoConversaModal({ prospect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Histórico da conversa — {prospect.nome_prospect || prospect.conta_destino}
            </h2>
            {prospect.historico_capturado_em && (
              <p className="mt-0.5 text-xs text-neutral-400">
                Capturado em {formatarDataHora(prospect.historico_capturado_em)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-neutral-400 hover:text-neutral-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {prospect.historico_conversa_whatsapp ? (
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-neutral-700">
              {prospect.historico_conversa_whatsapp}
            </pre>
          ) : (
            <p className="text-sm text-neutral-400">Nenhum histórico capturado ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
