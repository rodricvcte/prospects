alter table prospects
  drop constraint prospects_estagio_check;

alter table prospects
  add constraint prospects_estagio_check
  check (estagio in ('Novo', 'Respondeu', 'Negociando', 'Fechado', 'Em desenvolvimento', 'Entregue', 'Recusado'));
