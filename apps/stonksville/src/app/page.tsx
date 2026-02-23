import { Suspense } from "react";

import { getTodaysPuzzle, getGameState } from "@/lib/puzzle-query";
import { getAllCompanies } from "@/lib/companies-query";

import { Game } from "./game";

const TodaysGame = async () => {
  const [puzzle, companies] = await Promise.all([
    getTodaysPuzzle(),
    getAllCompanies(),
  ]);

  if (!puzzle) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-muted-foreground">No puzzle available today.</p>
      </div>
    );
  }

  const initialState = await getGameState(puzzle.id);

  return (
    <Game puzzle={puzzle} companies={companies} initialState={initialState} />
  );
};

const Page = () => {
  return (
    <Suspense>
      <TodaysGame />
    </Suspense>
  );
};

export default Page;
