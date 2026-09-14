alter table games
  add column if not exists final_message text not null
  default 'Congratulations! You completed the game.'
  check (char_length(final_message) between 1 and 2000);
