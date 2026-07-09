create extension if not exists pgcrypto;

create type canal_prospect as enum ('instagram', 'whatsapp');

create table prospects (
  id uuid primary key default gen_random_uuid(),
  canal canal_prospect not null,
  conta_origem text not null,
  conta_destino text not null,
  conta_destino_normalizada text not null,
  nome_prospect text,
  data_hr_approach timestamptz not null default now(),
  regiao text,
  msg_utilizada text,
  created_at timestamptz not null default now()
);

-- Duplicidade é checada por identificador exato, cross-canal: a mesma
-- conta_destino_normalizada não pode aparecer em mais de um registro,
-- independente do canal (ver nota sobre matching manual futuro).
create unique index prospects_conta_destino_normalizada_key
  on prospects (conta_destino_normalizada);

create index prospects_data_hr_approach_idx on prospects (data_hr_approach desc);
create index prospects_canal_idx on prospects (canal);
create index prospects_regiao_idx on prospects (regiao);
