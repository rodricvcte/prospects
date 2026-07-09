"use client";

import { useEffect, useState } from "react";
import type { Canal, Prospect } from "@/lib/prospects";
import { regiaoPorTelefone } from "@/lib/ddd";

const CONTA_ORIGEM_STORAGE_KEY = "prospects:conta_origem";

function agoraParaInput(): string {
  const agora = new Date();
  const offset = agora.getTimezoneOffset();
  const local = new Date(agora.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

interface Props {
  onClose: () => void;
  onCreated: (prospect: Prospect) => void;
}

export default function NovoProspectModal({ onClose, onCreated }: Props) {
  const [nomeProspect, setNomeProspect] = useState("");
  const [canal, setCanal] = useState<Canal>("instagram");
  const [contaOrigem, setContaOrigem] = useState("");
  const [contaDestino, setContaDestino] = useState("");
  const [regiao, setRegiao] = useState("");
  const [regiaoEditadaManualmente, setRegiaoEditadaManualmente] = useState(false);
  const [msgUtilizada, setMsgUtilizada] = useState("");
  const [dataHrApproach, setDataHrApproach] = useState(agoraParaInput);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const ultimaOrigem = localStorage.getItem(CONTA_ORIGEM_STORAGE_KEY);
    if (ultimaOrigem) setContaOrigem(ultimaOrigem);
  }, []);

  const preencherRegiaoPorDdd = () => {
    if (canal !== "whatsapp" || regiaoEditadaManualmente || !contaDestino.trim()) return;
    const sugestao = regiaoPorTelefone(contaDestino);
    if (sugestao) setRegiao(sugestao);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!nomeProspect.trim() || !contaDestino.trim()) {
      setErro("Preencha os campos obrigatórios.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canal,
          conta_origem: contaOrigem.trim(),
          conta_destino: contaDestino.trim(),
          nome_prospect: nomeProspect.trim(),
          regiao: regiao.trim() || null,
          msg_utilizada: msgUtilizada.trim() || null,
          data_hr_approach: new Date(dataHrApproach).toISOString(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error ?? "Erro ao criar prospect.");
        return;
      }

      if (contaOrigem.trim()) {
        localStorage.setItem(CONTA_ORIGEM_STORAGE_KEY, contaOrigem.trim());
      }
      onCreated(data.prospect);
    } catch {
      setErro("Erro ao criar prospect.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Novo Prospect</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Nome do prospect *
            </label>
            <input
              type="text"
              required
              value={nomeProspect}
              onChange={(e) => setNomeProspect(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Canal *
            </label>
            <select
              value={canal}
              onChange={(e) => {
                setCanal(e.target.value as Canal);
                setRegiaoEditadaManualmente(false);
              }}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            >
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Conta origem
            </label>
            <input
              type="text"
              value={contaOrigem}
              onChange={(e) => setContaOrigem(e.target.value)}
              placeholder="@sua_conta ou +55 11 90000-0000"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Conta destino *
            </label>
            <input
              type="text"
              required
              value={contaDestino}
              onChange={(e) => setContaDestino(e.target.value)}
              onBlur={preencherRegiaoPorDdd}
              placeholder="@prospect ou +55 11 90000-0000"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Região
            </label>
            <input
              type="text"
              value={regiao}
              onChange={(e) => {
                setRegiao(e.target.value);
                setRegiaoEditadaManualmente(true);
              }}
              placeholder="Cidade/UF"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Mensagem utilizada
            </label>
            <textarea
              value={msgUtilizada}
              onChange={(e) => setMsgUtilizada(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Data/hora do approach
            </label>
            <input
              type="datetime-local"
              value={dataHrApproach}
              onChange={(e) => setDataHrApproach(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          {erro && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {enviando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
