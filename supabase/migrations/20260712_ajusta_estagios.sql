-- A constraint precisa cair ANTES dos UPDATEs abaixo — enquanto ela ainda
-- está de pé, só aceita os 7 valores antigos, e 'Recusado'/'Entregue' não
-- estavam entre eles.
alter table prospects
  drop constraint prospects_estagio_check;

update prospects set estagio = 'Negociando' where estagio = 'Negociando preço';
update prospects set estagio = 'Respondeu' where estagio in ('Demonstração enviada', 'Rascunho enviado');
update prospects set estagio = 'Recusado' where estagio = 'Perdido';

alter table prospects
  add constraint prospects_estagio_check
  check (estagio in ('Novo', 'Respondeu', 'Negociando', 'Fechado', 'Entregue', 'Recusado'));
