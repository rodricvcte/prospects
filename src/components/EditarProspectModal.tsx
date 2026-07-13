"use client";

import { useState } from "react";
import type { Canal, Prospect } from "@/lib/prospects";

function paraInputDatetimeLocal(iso: string): string {
  const data = new Date(iso);
  const offset = data.getTimezoneOffset();
  const local = new Date(data.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

interface Props {
  prospect: Prospect;
  onClose: () => void;
  onSaved: (prospect: Prospect) => void;
}

export default function EditarProspectModal({ prospect, onClose, onSaved }: Props) {
  const [nomeProspect, setNomeProspect] = useState(prospect.nome_prospect ?? "");
  const [canal, setCanal] = useState<Canal>(prospect.canal);
  const [contaOrigem, setContaOrigem] = useState(prospect.conta_origem);
  const [contaDestino, setContaDestino] = useState(prospect.conta_destino);
  const [regiao, setRegiao] = useState(prospect.regiao ?? "");
  const [msgUtilizada, setMsgUtilizada] = useState(prospect.msg_utilizada ?? "");
  const [origemInstagram, setOrigemInstagram] = useState(prospect.origem_instagram ?? "");
  const [dataHrApproach, setDataHrApproach] = useState(paraInputDatetimeLocal(prospect.data_hr_approach));
  const [recusado, setRecusado] = useState(prospect.recusado);
  const [interessado, setInteressado] = useState(prospect.interessado);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!contaOrigem.trim() || !contaDestino.trim()) {
      setErro("Sender e Receiver não podem ficar vazios.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canal,
          conta_origem: contaOrigem.trim(),
          conta_destino: contaDestino.trim(),
          nome_prospect: nomeProspect.trim() || null,
          regiao: regiao.trim() || null,
          msg_utilizada: msgUtilizada.trim() || null,
          origem_instagram: origemInstagram.trim() || null,
          data_hr_approach: new Date(dataHrApproach).toISOString(),
          recusado,
          interessado,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error ?? "Erro ao salvar alterações.");
        return;
      }

      onSaved(data.prospect);
    } catch {
      setErro("Erro ao salvar alterações.");
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
          <h2 className="text-lg font-semibold text-neutral-900">Editar Prospect</h2>
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
            <label className="mb-1 block text-xs font-medium text-neutral-500">Nome do prospect</label>
            <input
              type="text"
              value={nomeProspect}
              onChange={(e) => setNomeProspect(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Canal *</label>
            <select
              value={canal}
              onChange={(e) => setCanal(e.target.value as Canal)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            >
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Sender *</label>
            <input
              type="text"
              required
              value={contaOrigem}
              onChange={(e) => setContaOrigem(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Receiver *</label>
            <input
              type="text"
              required
              value={contaDestino}
              onChange={(e) => setContaDestino(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Origem (Instagram)</label>
            <input
              type="text"
              value={origemInstagram}
              onChange={(e) => setOrigemInstagram(e.target.value)}
              placeholder="@perfil"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Região</label>
            <input
              type="text"
              value={regiao}
              onChange={(e) => setRegiao(e.target.value)}
              placeholder="Cidade/UF"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Mensagem utilizada</label>
            <textarea
              value={msgUtilizada}
              onChange={(e) => setMsgUtilizada(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Data/hora do approach</label>
            <input
              type="datetime-local"
              value={dataHrApproach}
              onChange={(e) => setDataHrApproach(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={recusado}
                onChange={(e) => setRecusado(e.target.checked)}
                className="h-4 w-4 accent-neutral-900"
              />
              Recusado
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={interessado}
                onChange={(e) => setInteressado(e.target.checked)}
                className="h-4 w-4 accent-neutral-900"
              />
              Interessado
            </label>
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
