"use client";

import { useMemo, useState } from "react";
import type { Prospect } from "@/lib/prospects";

const COR_BARRA = "#2a78d6"; // slot categórico 1 (azul) da paleta de referência
const COR_INTERESSADO = "#059669"; // emerald-600, mesmo tom do badge de canal WhatsApp — sinaliza "positivo"

interface PontoDiario {
  chave: string; // YYYY-MM-DD, pra ordenação estável
  rotulo: string; // DD/MM, pro eixo X
  rotuloCompleto: string; // pro tooltip
  quantidade: number;
  interessados: number;
}

function agruparPorDia(prospects: Prospect[]): PontoDiario[] {
  const contagem = new Map<string, number>();
  const interessadosPorDia = new Map<string, number>();

  for (const p of prospects) {
    const data = new Date(p.data_hr_approach);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    if (p.interessado) interessadosPorDia.set(chave, (interessadosPorDia.get(chave) ?? 0) + 1);
  }

  return Array.from(contagem.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, quantidade]) => {
      const [ano, mes, dia] = chave.split("-").map(Number);
      const data = new Date(ano, mes - 1, dia);
      return {
        chave,
        rotulo: data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        rotuloCompleto: data.toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        quantidade,
        interessados: interessadosPorDia.get(chave) ?? 0,
      };
    });
}

// Arredonda o topo do eixo Y e o passo das gridlines pra números "limpos"
// (1/2/5/10/20/50...), em vez de fatiar o máximo em 4 partes iguais cruas.
function calcularTicksY(maxValor: number): number[] {
  if (maxValor <= 0) return [0, 1];
  const passoBruto = maxValor / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(passoBruto || 1)));
  const normalizado = passoBruto / magnitude;
  let passo;
  if (normalizado <= 1) passo = 1 * magnitude;
  else if (normalizado <= 2) passo = 2 * magnitude;
  else if (normalizado <= 5) passo = 5 * magnitude;
  else passo = 10 * magnitude;
  passo = Math.max(1, Math.round(passo));

  const ticks: number[] = [];
  for (let v = 0; v <= maxValor + passo * 0.5; v += passo) ticks.push(Math.round(v));
  return ticks;
}

// A margem do topo precisa caber o balão do tooltip inteiro (não só o texto) —
// senão, quando a barra é a mais alta do gráfico, o balão estoura o topo do
// container e é cortado. 56px dá espaço suficiente pras duas linhas de texto.
const ALTURA = 170;
const MARGEM = { topo: 56, base: 24, esquerda: 8, direita: 36 };
const LARGURA_FAIXA = 36;
const LARGURA_BARRA_MAX = 24;
const DIAS_POR_PAGINA = 12;

export default function ContatosPorDiaChart({ prospects }: { prospects: Prospect[] }) {
  const [indiceHover, setIndiceHover] = useState<number | null>(null);
  const [pagina, setPagina] = useState(0);

  const pontos = useMemo(() => agruparPorDia(prospects), [prospects]);

  const totalPaginas = Math.max(1, Math.ceil(pontos.length / DIAS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  // pagina 0 = janela mais recente; pontos está em ordem crescente de data,
  // então a página mais recente é o "fim" do array.
  const fimIndice = pontos.length - paginaAtual * DIAS_POR_PAGINA;
  const inicioIndice = Math.max(0, fimIndice - DIAS_POR_PAGINA);
  const pontosVisiveis = pontos.slice(inicioIndice, fimIndice);

  if (pontos.length === 0) {
    return (
      <div className="flex h-full w-full flex-col rounded-lg border border-neutral-200 bg-white p-3">
        <h2 className="mb-1 text-xs font-semibold text-neutral-900">Contatos por dia</h2>
        <p className="py-6 text-center text-xs text-neutral-400">Sem dados para o período filtrado.</p>
      </div>
    );
  }

  const maxQuantidade = Math.max(...pontosVisiveis.map((p) => p.quantidade));
  const ticks = calcularTicksY(maxQuantidade);
  const maxEixo = ticks[ticks.length - 1];

  const larguraGrafico = pontosVisiveis.length * LARGURA_FAIXA;
  const larguraTotal = larguraGrafico + MARGEM.esquerda + MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;

  const escalaY = (valor: number) => MARGEM.topo + alturaUtil - (valor / maxEixo) * alturaUtil;
  const larguraBarra = Math.min(LARGURA_BARRA_MAX, LARGURA_FAIXA - 8);

  const pontoAtivo = indiceHover !== null ? pontosVisiveis[indiceHover] : null;

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-neutral-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-neutral-900">Contatos por dia</h2>
        {pontosVisiveis.some((p) => p.interessados > 0) && (
          <span className="flex items-center gap-1 text-[10px] text-neutral-500">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COR_INTERESSADO }} />
            com interessado
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="relative ml-auto" style={{ width: larguraTotal }}>
          <svg
            viewBox={`0 0 ${larguraTotal} ${ALTURA}`}
            width={larguraTotal}
            height={ALTURA}
            className="block"
            role="img"
            aria-label="Gráfico de barras: quantidade de contatos por dia"
          >
            {/* Gridlines + labels do eixo Y — hairline, recessivo */}
            {ticks.map((tick) => {
              const y = escalaY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={MARGEM.esquerda}
                    x2={larguraTotal - MARGEM.direita}
                    y1={y}
                    y2={y}
                    stroke="#e5e5e5"
                    strokeWidth={1}
                  />
                  <text x={larguraTotal - MARGEM.direita + 6} y={y} textAnchor="start" dominantBaseline="middle" className="fill-neutral-400 text-[10px]">
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Barras */}
            {pontosVisiveis.map((ponto, i) => {
              const xFaixa = MARGEM.esquerda + i * LARGURA_FAIXA;
              const xBarra = xFaixa + (LARGURA_FAIXA - larguraBarra) / 2;
              const yBarra = escalaY(ponto.quantidade);
              const alturaBarra = MARGEM.topo + alturaUtil - yBarra;
              const ativo = indiceHover === i;

              return (
                <g key={ponto.chave}>
                  {/* Hit target maior que a barra (a faixa inteira) */}
                  <rect
                    x={xFaixa}
                    y={MARGEM.topo}
                    width={LARGURA_FAIXA}
                    height={alturaUtil}
                    fill="transparent"
                    onMouseEnter={() => setIndiceHover(i)}
                    onMouseLeave={() => setIndiceHover(null)}
                    onFocus={() => setIndiceHover(i)}
                    onBlur={() => setIndiceHover(null)}
                    tabIndex={0}
                    aria-label={`${ponto.rotuloCompleto}: ${ponto.quantidade} contato${ponto.quantidade === 1 ? "" : "s"}${ponto.interessados > 0 ? `, ${ponto.interessados} interessado${ponto.interessados === 1 ? "" : "s"}` : ""}`}
                  />
                  <rect
                    x={xBarra}
                    y={yBarra}
                    width={larguraBarra}
                    height={Math.max(alturaBarra, 1)}
                    rx={4}
                    fill={COR_BARRA}
                    opacity={ativo ? 1 : 0.85}
                    pointerEvents="none"
                  />
                  {ponto.interessados > 0 && (
                    <circle
                      cx={xBarra + larguraBarra / 2}
                      cy={yBarra - 7}
                      r={3.5}
                      fill={COR_INTERESSADO}
                      pointerEvents="none"
                    />
                  )}
                  <text
                    x={xFaixa + LARGURA_FAIXA / 2}
                    y={ALTURA - MARGEM.base + 14}
                    textAnchor="middle"
                    className="fill-neutral-500 text-[10px]"
                  >
                    {ponto.rotulo}
                  </text>
                </g>
              );
            })}

            {/* Baseline */}
            <line
              x1={MARGEM.esquerda}
              x2={larguraTotal - MARGEM.direita}
              y1={MARGEM.topo + alturaUtil}
              y2={MARGEM.topo + alturaUtil}
              stroke="#d4d4d4"
              strokeWidth={1}
            />
          </svg>

          {pontoAtivo && (
            <div
              className="pointer-events-none absolute rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
              style={{
                left: MARGEM.esquerda + indiceHover! * LARGURA_FAIXA + LARGURA_FAIXA / 2,
                top: escalaY(pontoAtivo.quantidade) - 8,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="font-semibold text-neutral-900">
                {pontoAtivo.quantidade} contato{pontoAtivo.quantidade === 1 ? "" : "s"}
              </div>
              <div className="text-neutral-500">{pontoAtivo.rotuloCompleto}</div>
              {pontoAtivo.interessados > 0 && (
                <div className="mt-0.5 font-medium" style={{ color: COR_INTERESSADO }}>
                  {pontoAtivo.interessados} interessado{pontoAtivo.interessados === 1 ? "" : "s"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {totalPaginas > 1 && (
        <div className="mt-auto flex items-center justify-between pt-3 text-[11px]">
          <button
            type="button"
            onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
            disabled={paginaAtual >= totalPaginas - 1}
            className="font-medium text-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300"
          >
            Anteriores
          </button>
          <span className="text-neutral-400">
            {paginaAtual + 1}/{totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            disabled={paginaAtual === 0}
            className="font-medium text-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300"
          >
            Mais
          </button>
        </div>
      )}
    </div>
  );
}
