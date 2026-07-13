alter table clientes
  add column status_trabalho text not null default 'Em desenvolvimento'
  check (status_trabalho in ('Em desenvolvimento', 'Entregue'));
