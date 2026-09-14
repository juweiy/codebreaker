alter table games
  add column if not exists timeout_message text not null
  default 'Time''s up! The game ended before you solved every puzzle.'
  check (char_length(timeout_message) between 1 and 2000);
