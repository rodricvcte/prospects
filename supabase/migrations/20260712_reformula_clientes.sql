-- Tabela clientes estava vazia (0 registros) — recriar do zero é mais simples
-- que uma sequência de ALTER TABLE pra trocar praticamente todos os campos.
drop table if exists clientes;

create table clientes (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete set null,
  nome_completo text not null,
  ramo text,
  data_abordagem timestamptz,
  canal text check (canal in ('instagram', 'whatsapp')),
  perfil_instagram text,
  numero_whatsapp text,
  idade integer,
  genero text,
  regiao text,
  data_fechamento date not null default current_date,
  servico text not null check (servico in ('LP', 'GMN', 'Combo')),
  valor_fechado numeric(10, 2) not null,
  status_pagamento text not null default 'Pendente' check (status_pagamento in ('Pendente', 'Pago')),
  dominio text,
  created_at timestamptz not null default now()
);

create unique index clientes_prospect_id_key on clientes (prospect_id) where prospect_id is not null;
create index clientes_status_pagamento_idx on clientes (status_pagamento);

alter table clientes enable row level security;
