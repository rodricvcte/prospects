alter table prospects
  add column estagio text not null default 'Novo',
  add column notas text;

alter table prospects
  add constraint prospects_estagio_check
  check (estagio in (
    'Novo',
    'Respondeu',
    'Demonstração enviada',
    'Negociando preço',
    'Rascunho enviado',
    'Fechado',
    'Perdido'
  ));

-- Popula estágio inicial a partir dos campos existentes (Interessado/Recusado
-- continuam existindo como estão — o Kanban é uma camada adicional, não os
-- substitui). Recusado é aplicado por último para prevalecer em qualquer
-- linha que porventura tenha os dois marcados.
update prospects set estagio = 'Respondeu' where interessado = true;
update prospects set estagio = 'Perdido' where recusado = true;

create index prospects_estagio_idx on prospects (estagio);
