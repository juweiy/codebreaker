import { ThemeSwitcher } from './theme-switcher';

export function Footer() {
  return (
    <footer className="w-full border-t">
      <div className="page-shell flex items-center justify-between py-8 text-sm text-muted-foreground">
        <span>CodeBreaker · Your digital game master</span>
        <ThemeSwitcher />
      </div>
    </footer>
  );
}
