alter table clientes
  add column forma_pagamento text check (forma_pagamento in ('Pix', 'Stripe', 'Wise')),
  add column data_pagamento date,
  add column notas text;
