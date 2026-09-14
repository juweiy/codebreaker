import { Footer } from '@/components/footer';
import { Hero } from '@/components/hero';
import { NavBar } from '@/components/nav-bar';

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <NavBar />
      <main id="main-content" className="flex-1">
        <Hero />
      </main>
      <Footer />
    </div>
  );
}
