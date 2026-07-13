"use client";

import { useState } from "react";
import type { Prospect } from "@/lib/prospects";
import type { Cliente } from "@/lib/clientes";
import { SERVICOS, STATUS_PAGAMENTO, STATUS_TRABALHO, FAIXAS_ETARIAS, GENEROS, FORMAS_PAGAMENTO, CANAIS } from "@/lib/cliente-tipos";

function hojeParaInput(): string {
  const agora = new Date();
  const offset = agora.getTimezoneOffset();
  const local = new Date(agora.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

// Converte um ISO (UTC) pro formato de <input type="datetime-local">
// respeitando o fuso horário local — sem isso, truncar pra "YYYY-MM-DD" e
// depois fazer new Date(...).toISOString() desloca o dia/hora quando o fuso
// local está atrás de UTC (ex: 21:00 do dia 10 em BRT vira meia-noite do dia
// 10 em UTC, mas ao reconverter sem ajuste vira 21:00 do dia 09).
function paraInputDatetimeLocal(iso: string): string {
  const data = new Date(iso);
  const offset = data.getTimezoneOffset();
  const local = new Date(data.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

const CANAL_LABEL: Record<(typeof CANAIS)[number], string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

interface Props {
  prospect: Prospect;
  onClose: () => void;
  onConverted: (cliente: Cliente) => void;
}

export default function ConverterClienteModal({ prospect, onClose, onConverted }: Props) {
  const [nomeCompleto, setNomeCompleto] = useState(prospect.nome_prospect ?? "");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [sender, setSender] = useState(prospect.conta_origem);
  const [ramo, setRamo] = useState("");
  const [dataAbordagem, setDataAbordagem] = useState(paraInputDatetimeLocal(prospect.data_hr_approach));
  const [canal, setCanal] = useState<(typeof CANAIS)[number]>(prospect.canal);
  const [perfilInstagram, setPerfilInstagram] = useState(
    prospect.origem_instagram ?? (prospect.canal === "instagram" ? prospect.conta_destino : ""),
  );
  const [numeroWhatsapp, setNumeroWhatsapp] = useState(prospect.canal === "whatsapp" ? prospect.conta_destino : "");
  const [idade, setIdade] = useState<(typeof FAIXAS_ETARIAS)[number] | "">("");
  const [genero, setGenero] = useState<(typeof GENEROS)[number] | "">("");
  const [regiao, setRegiao] = useState(prospect.regiao ?? "");
  const [servico, setServico] = useState<(typeof SERVICOS)[number]>("LP");
  const [valorFechado, setValorFechado] = useState("");
  const [statusPagamento, setStatusPagamento] = useState<(typeof STATUS_PAGAMENTO)[number]>("Pendente");
  const [statusTrabalho, setStatusTrabalho] = useState<(typeof STATUS_TRABALHO)[number]>("Em desenvolvimento");
  const [dataEntrega, setDataEntrega] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<(typeof FORMAS_PAGAMENTO)[number] | "">("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [observacoesPagamento, setObservacoesPagamento] = useState("");
  const [dataFechamento, setDataFechamento] = useState(hojeParaInput);
  const [urlRascunho, setUrlRascunho] = useState("");
  const [urlProd, setUrlProd] = useState("");
  const [urlGit, setUrlGit] = useState("");
  const [urlHospedagem, setUrlHospedagem] = useState("");
  const [dominio, setDominio] = useState("");
  const [planoDominioAnos, setPlanoDominioAnos] = useState("");
  const [valorDominioAno, setValorDominioAno] = useState("");
  const [pagamentoDominio, setPagamentoDominio] = useState("");
  const [provedorDominio, setProvedorDominio] = useState("");
  const [dataContratacaoDominio, setDataContratacaoDominio] = useState("");
  const [nfEmitida, setNfEmitida] = useState(false);
  const [dataEmissaoNf, setDataEmissaoNf] = useState("");
  const [notas, setNotas] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const valorNumerico = Number(valorFechado.replace(",", "."));
    if (!nomeCompleto.trim() || !valorFechado.trim() || Number.isNaN(valorNumerico)) {
      setErro("Preencha nome completo e valor fechado (numérico).");
      return;
    }
    const planoNumerico = planoDominioAnos.trim() ? Number(planoDominioAnos) : null;
    if (planoDominioAnos.trim() && Number.isNaN(planoNumerico)) {
      setErro("Plano do domínio deve ser numérico (anos).");
      return;
    }
    const valorDominioNumerico = valorDominioAno.trim() ? Number(valorDominioAno.replace(",", ".")) : null;
    if (valorDominioAno.trim() && Number.isNaN(valorDominioNumerico)) {
      setErro("Valor do domínio deve ser numérico.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_id: prospect.id,
          nome_completo: nomeCompleto.trim(),
          cpf_cnpj: cpfCnpj.trim() || null,
          sender: sender.trim() || null,
          ramo: ramo.trim() || null,
          data_abordagem: dataAbordagem ? new Date(dataAbordagem).toISOString() : null,
          canal,
          perfil_instagram: perfilInstagram.trim() || null,
          numero_whatsapp: numeroWhatsapp.trim() || null,
          idade: idade || null,
          genero: genero || null,
          regiao: regiao.trim() || null,
          servico,
          valor_fechado: valorNumerico,
          status_pagamento: statusPagamento,
          status_trabalho: statusTrabalho,
          data_entrega: dataEntrega || null,
          forma_pagamento: formaPagamento || null,
          data_pagamento: dataPagamento || null,
          observacoes_pagamento: observacoesPagamento.trim() || null,
          data_fechamento: dataFechamento,
          url_rascunho: urlRascunho.trim() || null,
          url_prod: urlProd.trim() || null,
          url_git: urlGit.trim() || null,
          url_hospedagem: urlHospedagem.trim() || null,
          dominio: dominio.trim() || null,
          plano_dominio_anos: planoNumerico,
          valor_dominio_ano: valorDominioNumerico,
          pagamento_dominio: pagamentoDominio.trim() || null,
          provedor_dominio: provedorDominio.trim() || null,
          data_contratacao_dominio: dataContratacaoDominio || null,
          nf_emitida: nfEmitida,
          data_emissao_nf: dataEmissaoNf || null,
          notas: notas.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error ?? "Erro ao converter em cliente.");
        return;
      }

      onConverted(data.cliente);
    } catch {
      setErro("Erro ao converter em cliente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Converter em Cliente</h2>
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
            <label className="mb-1 block text-xs font-medium text-neutral-500">Nome completo *</label>
            <input
              type="text"
              required
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Sender</label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">CPF/CNPJ</label>
              <input
                type="text"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Ramo</label>
              <input
                type="text"
                value={ramo}
                onChange={(e) => setRamo(e.target.value)}
                placeholder="Odontologia, Advocacia…"
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Data da abordagem</label>
              <input
                type="datetime-local"
                value={dataAbordagem}
                onChange={(e) => setDataAbordagem(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Canal</label>
              <select
                value={canal}
                onChange={(e) => setCanal(e.target.value as (typeof CANAIS)[number])}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              >
                {CANAIS.map((c) => (
                  <option key={c} value={c}>
                    {CANAL_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Perfil Instagram</label>
              <input
                type="text"
                value={perfilInstagram}
                onChange={(e) => setPerfilInstagram(e.target.value)}
                placeholder="@perfil"
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Número WhatsApp</label>
            <input
              type="text"
              value={numeroWhatsapp}
              onChange={(e) => setNumeroWhatsapp(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Idade</label>
              <select
                value={idade}
                onChange={(e) => setIdade(e.target.value as (typeof FAIXAS_ETARIAS)[number] | "")}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              >
                <option value="">—</option>
                {FAIXAS_ETARIAS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Gênero</label>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value as (typeof GENEROS)[number] | "")}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              >
                <option value="">—</option>
                {GENEROS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Serviço contratado *</label>
              <select
                value={servico}
                onChange={(e) => setServico(e.target.value as (typeof SERVICOS)[number])}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              >
                {SERVICOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Valor fechado (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={valorFechado}
                onChange={(e) => setValorFechado(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Status do trabalho *</label>
              <select
                value={statusTrabalho}
                onChange={(e) => setStatusTrabalho(e.target.value as (typeof STATUS_TRABALHO)[number])}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              >
                {STATUS_TRABALHO.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Data de entrega</label>
              <input
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Status do pagamento *</label>
              <select
                value={statusPagamento}
                onChange={(e) => setStatusPagamento(e.target.value as (typeof STATUS_PAGAMENTO)[number])}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              >
                {STATUS_PAGAMENTO.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Data de fechamento *</label>
              <input
                type="date"
                required
                value={dataFechamento}
                onChange={(e) => setDataFechamento(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Forma de pagamento</label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as (typeof FORMAS_PAGAMENTO)[number] | "")}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              >
                <option value="">—</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Data de pagamento</label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={nfEmitida}
                onChange={(e) => setNfEmitida(e.target.checked)}
                className="h-4 w-4 accent-neutral-900"
              />
              NF emitida
            </label>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-neutral-500">Data emissão NF</label>
              <input
                type="date"
                value={dataEmissaoNf}
                onChange={(e) => setDataEmissaoNf(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Observações</label>
            <textarea
              value={observacoesPagamento}
              onChange={(e) => setObservacoesPagamento(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">URL rascunho</label>
              <input
                type="text"
                value={urlRascunho}
                onChange={(e) => setUrlRascunho(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">URL produção</label>
              <input
                type="text"
                value={urlProd}
                onChange={(e) => setUrlProd(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Git</label>
              <input
                type="text"
                value={urlGit}
                onChange={(e) => setUrlGit(e.target.value)}
                placeholder="https://github.com/…"
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Hospedagem</label>
              <input
                type="text"
                value={urlHospedagem}
                onChange={(e) => setUrlHospedagem(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-md border border-neutral-200 p-3">
            <p className="mb-3 text-xs font-medium text-neutral-500">Domínio</p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={dominio}
                onChange={(e) => setDominio(e.target.value)}
                placeholder="exemplo.com.br"
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Contratado em</label>
                  <input
                    type="date"
                    value={dataContratacaoDominio}
                    onChange={(e) => setDataContratacaoDominio(e.target.value)}
                    className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Plano (anos)</label>
                  <input
                    type="number"
                    min="1"
                    value={planoDominioAnos}
                    onChange={(e) => setPlanoDominioAnos(e.target.value)}
                    className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Valor/ano (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorDominioAno}
                    onChange={(e) => setValorDominioAno(e.target.value)}
                    className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Provedor</label>
                  <input
                    type="text"
                    value={provedorDominio}
                    onChange={(e) => setProvedorDominio(e.target.value)}
                    placeholder="Registro.br, GoDaddy…"
                    className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Pagamento (quem/onde)</label>
                  <input
                    type="text"
                    value={pagamentoDominio}
                    onChange={(e) => setPagamentoDominio(e.target.value)}
                    placeholder="Ex: eu paguei via Registro.br"
                    className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
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
              {enviando ? "Convertendo…" : "Converter em Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
