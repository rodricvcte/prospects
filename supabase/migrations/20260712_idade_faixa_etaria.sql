alter table clientes
  alter column idade type text using idade::text;

alter table clientes
  add constraint clientes_idade_check
  check (idade in ('18-22', '23-28', '29-34', '35-40', '41-46', '47-52'));
