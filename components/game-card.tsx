import { Route } from '@/lib/string-utils';
import { useRouter } from 'next/navigation';
import { Card } from './ui/card';

type GameCardProps = {
  title: string;
  id: string;
  description?: string;
};

export const GameCard = ({ title, id, description }: GameCardProps) => {
  const router = useRouter();

  const redirectToGameDetails = () => {
    router.push(`${Route.GameDetails}/${id}`);
  };

  return (
    <Card
      className="flex-1 flex flex-col p-3 border-2 hover:bg-gray-300 cursor-pointer"
      onClick={redirectToGameDetails}
    >
      <div>{title}</div>
      <div>{description}</div>
    </Card>
  );
};
