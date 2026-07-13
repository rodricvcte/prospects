"use client";

import { useState } from "react";
import type { Canal, Prospect } from "@/lib/prospects";

const CANAL_LABEL: Record<Canal, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

const ITENS_POR_PAGINA = 5;

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function InteressadosPanel({ prospects }: { prospects: Prospect[] }) {
  const [pagina, setPagina] = useState(0);

  const interessados = prospects
    .filter((p) => p.interessado)
    .sort((a, b) => new Date(b.data_hr_approach).getTime() - new Date(a.data_hr_approach).getTime());

  const totalPaginas = Math.max(1, Math.ceil(interessados.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaAtual * ITENS_POR_PAGINA;
  const visiveis = interessados.slice(inicio, inicio + ITENS_POR_PAGINA);

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-neutral-200 bg-white p-2">
      <h2 className="mb-2 text-xs font-semibold text-neutral-900">
        Interessados <span className="font-normal text-neutral-400">({interessados.length})</span>
      </h2>

      {interessados.length === 0 ? (
        <p className="py-6 text-center text-xs text-neutral-400">Nenhum interessado ainda.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {visiveis.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-1.5 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-neutral-900">
                    {p.nome_prospect || p.conta_destino}
                  </p>
                  <p className="truncate text-[10px] text-neutral-500">
                    {CANAL_LABEL[p.canal]} · {p.conta_origem}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-neutral-400">{formatarData(p.data_hr_approach)}</span>
              </li>
            ))}
          </ul>

          {totalPaginas > 1 && (
            <div className="mt-auto flex items-center justify-between pt-2 text-[10px]">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={paginaAtual === 0}
                className="font-medium text-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300"
              >
                Anteriores
              </button>
              <span className="text-neutral-400">
                {paginaAtual + 1}/{totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                disabled={paginaAtual >= totalPaginas - 1}
                className="font-medium text-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300"
              >
                Mais
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
