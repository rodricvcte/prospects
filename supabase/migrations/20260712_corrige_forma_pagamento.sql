alter table clientes
  drop constraint clientes_forma_pagamento_check;

alter table clientes
  add constraint clientes_forma_pagamento_check
  check (forma_pagamento in ('Pix', 'Cartão', 'Outro'));
