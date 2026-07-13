alter table clientes
  add constraint clientes_genero_check
  check (genero in ('Masculino', 'Feminino'));
