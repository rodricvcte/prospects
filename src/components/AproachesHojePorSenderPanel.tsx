"use client";

import type { Prospect } from "@/lib/prospects";

const COR_BARRA = "#2a78d6"; // mesma cor dos outros gráficos/painéis, pra manter consistência

interface Contagem {
  sender: string;
  total: number;
}

function ehHoje(iso: string): boolean {
  const data = new Date(iso);
  const hoje = new Date();
  return (
    data.getFullYear() === hoje.getFullYear() &&
    data.getMonth() === hoje.getMonth() &&
    data.getDate() === hoje.getDate()
  );
}

function agruparPorSenderHoje(prospects: Prospect[]): Contagem[] {
  const contagem = new Map<string, number>();
  for (const p of prospects) {
    if (!ehHoje(p.data_hr_approach)) continue;
    contagem.set(p.conta_origem, (contagem.get(p.conta_origem) ?? 0) + 1);
  }
  return Array.from(contagem.entries())
    .map(([sender, total]) => ({ sender, total }))
    .sort((a, b) => b.total - a.total);
}

export default function AproachesHojePorSenderPanel({ prospects }: { prospects: Prospect[] }) {
  const senders = agruparPorSenderHoje(prospects);
  const maxTotal = Math.max(...senders.map((s) => s.total), 1);
  const total = senders.reduce((soma, s) => soma + s.total, 0);

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-neutral-200 bg-white p-2">
      <h2 className="mb-2 text-xs font-semibold text-neutral-900">
        Approaches hoje por sender <span className="font-normal text-neutral-400">({total})</span>
      </h2>

      {senders.length === 0 ? (
        <p className="py-6 text-center text-xs text-neutral-400">Nenhum approach hoje ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {senders.map((s) => (
            <li key={s.sender}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-[11px] font-medium text-neutral-900" title={s.sender}>
                  {s.sender}
                </span>
                <span className="shrink-0 text-[11px] text-neutral-500">{s.total}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(s.total / maxTotal) * 100}%`, backgroundColor: COR_BARRA }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
