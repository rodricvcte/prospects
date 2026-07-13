alter table clientes
  add column sender text,
  add column url_rascunho text,
  add column url_prod text,
  add column plano_dominio_anos integer,
  add column valor_dominio_ano numeric(10, 2),
  add column pagamento_dominio text,
  add column data_contratacao_dominio date;

-- Sempre derivada de data_contratacao_dominio + plano_dominio_anos — nunca
-- editada diretamente, então é uma generated column em vez de um campo
-- comum (evita a data de renovação ficar desatualizada se alguém mudar o
-- plano ou a data de contratação sem lembrar de recalcular).
alter table clientes
  add column data_renovacao_dominio date
  generated always as (
    case
      when data_contratacao_dominio is not null and plano_dominio_anos is not null
        then (data_contratacao_dominio + (plano_dominio_anos * interval '1 year'))::date
      else null
    end
  ) stored;
