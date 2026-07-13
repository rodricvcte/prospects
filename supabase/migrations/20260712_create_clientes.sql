create table clientes (
  id uuid primary key default gen_random_uuid(),
  -- Preserva o vínculo com o approach original, mas nunca bloqueia nem apaga o
  -- prospect por causa do cliente: se o prospect for excluído, o cliente
  -- continua existindo (é o registro de negócio mais valioso dos dois).
  prospect_id uuid references prospects(id) on delete set null,
  nome_completo text not null,
  cro text,
  cpf_cnpj text,
  telefone text,
  email text,
  servico text not null check (servico in ('LP', 'GMN', 'Combo')),
  valor_fechado numeric(10, 2) not null,
  forma_pagamento text not null check (forma_pagamento in ('Pix', 'Stripe', 'Wise')),
  status_pagamento text not null default 'Pendente' check (status_pagamento in ('Pendente', 'Pago')),
  data_fechamento date not null default current_date,
  dominio text,
  url_github text,
  url_vercel text,
  created_at timestamptz not null default now()
);

-- Um prospect só pode virar cliente uma vez (evita conversão duplicada por
-- clique repetido). Filtro parcial pra permitir múltiplos clientes sem
-- prospect vinculado (ex: prospect original excluído).
create unique index clientes_prospect_id_key on clientes (prospect_id) where prospect_id is not null;

create index clientes_status_pagamento_idx on clientes (status_pagamento);

-- Sem policies de propósito: só a service_role_key (usada pelo backend) tem
-- acesso — chave anon/authenticated fica sem nenhum acesso à tabela. O app
-- nunca expõe a chave anon, então isso é defesa em profundidade, não uma
-- mudança de comportamento.
alter table clientes enable row level security;
