-- A constraint precisa cair ANTES dos UPDATEs abaixo — enquanto ela ainda
-- está de pé, só aceita os valores antigos, e 'Rascunho'/'Mais Informações'
-- não estavam entre eles.
alter table prospects
  drop constraint prospects_estagio_check;

-- "Fechado" deixa de ser um estágio: o botão "Converter em Cliente" passa a
-- disparar em "Em desenvolvimento", então quem estava em "Fechado" migra pra lá.
update prospects set estagio = 'Em desenvolvimento' where estagio = 'Fechado';
-- "Recusado" sai do Kanban — "Esfriou" já representa lead frio/perdido.
update prospects set estagio = 'Esfriou' where estagio = 'Recusado';
-- Coluna "Respondeu" renomeada pra "Mais Informações".
update prospects set estagio = 'Mais Informações' where estagio = 'Respondeu';

alter table prospects
  add constraint prospects_estagio_check
  check (estagio in ('Novo', 'Mais Informações', 'Rascunho', 'Negociando', 'Em desenvolvimento', 'Entregue', 'Esfriou'));
