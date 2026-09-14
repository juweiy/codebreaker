import type { Metadata } from 'next';
import { DashboardGames } from '@/components/game/dashboard-games';

export const metadata: Metadata = { title: 'My games' };

export default function DashboardPage() {
  return <DashboardGames />;
}
