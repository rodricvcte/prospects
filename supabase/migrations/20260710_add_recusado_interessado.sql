alter table prospects
  add column recusado boolean not null default false,
  add column interessado boolean not null default false;
