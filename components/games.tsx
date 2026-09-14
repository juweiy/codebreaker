import { GameCard } from './game-card';

type GamesProps = {
  games: {
    title: string;
    id: string;
    description?: string;
  }[];
};

export const Games = ({ games }: GamesProps) => {
  return (
    <div className="flex flex-row gap-4">
      {games?.map((game, key) => (
        <GameCard
          key={key}
          title={game?.title}
          id={game?.id}
          description={game?.description}
        />
      ))}
    </div>
  );
};
