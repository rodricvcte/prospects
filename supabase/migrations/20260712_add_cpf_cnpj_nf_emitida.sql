alter table clientes
  add column cpf_cnpj text,
  add column nf_emitida boolean not null default false;
