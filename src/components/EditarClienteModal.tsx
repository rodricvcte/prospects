"use client";

import { useState } from "react";
import type { Cliente } from "@/lib/clientes";
import { SERVICOS, STATUS_PAGAMENTO, STATUS_TRABALHO, FAIXAS_ETARIAS, GENEROS, FORMAS_PAGAMENTO, CANAIS } from "@/lib/cliente-tipos";

const CANAL_LABEL: Record<(typeof CANAIS)[number], string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

// Converte um ISO (UTC) pro formato de <input type="datetime-local">
// respeitando o fuso horário local — ver mesma função em ConverterClienteModal.
function paraInputDatetimeLocal(iso: string): string {
  const data = new Date(iso);
  const offset = data.getTimezoneOffset();
  const local = new Date(data.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

interface Props {
  cliente: Cliente;
  onClose: () => void;
  onSaved: (cliente: Cliente) => void;
}

export default function EditarClienteModal({ cliente, onClose, onSaved }: Props) {
  const [nomeCompleto, setNomeCompleto] = useState(cliente.nome_completo);
  const [cpfCnpj, setCpfCnpj] = useState(cliente.cpf_cnpj ?? "");
  const [sender, setSender] = useState(cliente.sender ?? "");
  const [ramo, setRamo] = useState(cliente.ramo ?? "");
  const [dataAbordagem, setDataAbordagem] = useState(
    cliente.data_abordagem ? paraInputDatetimeLocal(cliente.data_abordagem) : "",
  );
  const [canal, setCanal] = useState<(typeof CANAIS)[number] | "">(cliente.canal ?? "");
  const [perfilInstagram, setPerfilInstagram] = useState(cliente.perfil_instagram ?? "");
  const [numeroWhatsapp, setNumeroWhatsapp] = useState(cliente.numero_whatsapp ?? "");
  const [idade, setIdade] = useState<(typeof FAIXAS_ETARIAS)[number] | "">(cliente.idade ?? "");
  const [genero, setGenero] = useState<(typeof GENEROS)[number] | "">(cliente.genero ?? "");
  const [regiao, setRegiao] = useState(cliente.regiao ?? "");
  const [servico, setServico] = useState<(typeof SERVICOS)[number]>(cliente.servico);
  const [valorFechado, setValorFechado] = useState(String(cliente.valor_fechado));
  const [statusPagamento, setStatusPagamento] = useState<(typeof STATUS_PAGAMENTO)[number]>(cliente.status_pagamento);
  const [statusTrabalho, setStatusTrabalho] = useState<(typeof STATUS_TRABALHO)[number]>(cliente.status_trabalho);
  const [dataEntrega, setDataEntrega] = useState(cliente.data_entrega ?? "");
  const [formaPagamento, setFormaPagamento] = useState<(typeof FORMAS_PAGAMENTO)[number] | "">(cliente.forma_pagamento ?? "");
  const [dataPagamento, setDataPagamento] = useState(cliente.data_pagamento ?? "");
  const [observacoesPagamento, setObservacoesPagamento] = useState(cliente.observacoes_pagamento ?? "");
  const [dataFechamento, setDataFechamento] = useState(cliente.data_fechamento);
  const [urlRascunho, setUrlRascunho] = useState(cliente.url_rascunho ?? "");
  const [urlProd, setUrlProd] = useState(cliente.url_prod ?? "");
  const [urlGit, setUrlGit] = useState(cliente.url_git ?? "");
  const [urlHospedagem, setUrlHospedagem] = useState(cliente.url_hospedagem ?? "");
  const [dominio, setDominio] = useState(cliente.dominio ?? "");
  const [planoDominioAnos, setPlanoDominioAnos] = useState(
    cliente.plano_dominio_anos !== null ? String(cliente.plano_dominio_anos) : "",
  );
  const [valorDominioAno, setValorDominioAno] = useState(
    cliente.valor_dominio_ano !== null ? String(cliente.valor_dominio_ano) : "",
  );
  const [pagamentoDominio, setPagamentoDominio] = useState(cliente.pagamento_dominio ?? "");
  const [provedorDominio, setProvedorDominio] = useState(cliente.provedor_dominio ?? "");
  const [dataContratacaoDominio, setDataContratacaoDominio] = useState(cliente.data_contratacao_dominio ?? "");
  const [nfEmitida, setNfEmitida] = useState(cliente.nf_emitida);
  const [dataEmissaoNf, setDataEmissaoNf] = useState(cliente.data_emissao_nf ?? "");
  const [notas, setNotas] = useState(cliente.notas ?? "");

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const valorNumerico = Number(valorFechado.replace(",", "."));
    if (!nomeCompleto.trim() || Number.isNaN(valorNumerico)) {
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
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_completo: nomeCompleto.trim(),
          cpf_cnpj: cpfCnpj.trim() || null,
          sender: sender.trim() || null,
          ramo: ramo.trim() || null,
          data_abordagem: dataAbordagem ? new Date(dataAbordagem).toISOString() : null,
          canal: canal || null,
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
        setErro(data.error ?? "Erro ao salvar alterações.");
        return;
      }

      onSaved(data.cliente);
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
          <h2 className="text-lg font-semibold text-neutral-900">Editar Cliente</h2>
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
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
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
                onChange={(e) => setCanal(e.target.value as (typeof CANAIS)[number] | "")}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              >
                <option value="">—</option>
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
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
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
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
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
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">URL produção</label>
              <input
                type="text"
                value={urlProd}
                onChange={(e) => setUrlProd(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
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
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Hospedagem</label>
              <input
                type="text"
                value={urlHospedagem}
                onChange={(e) => setUrlHospedagem(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
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
              {cliente.data_renovacao_dominio && (
                <p className="text-xs text-neutral-500">
                  Renovação prevista: {new Date(`${cliente.data_renovacao_dominio}T00:00:00`).toLocaleDateString("pt-BR")}
                </p>
              )}
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
              {enviando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
