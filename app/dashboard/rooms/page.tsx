import type { Metadata } from 'next';
import { DashboardRooms } from '@/components/room/dashboard-rooms';

export const metadata: Metadata = { title: 'My rooms' };

export default function DashboardRoomsPage() {
  return <DashboardRooms />;
}
