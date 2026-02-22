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
      <section className="flex flex-1 items-center justify-center py-16">
        <p className="text-muted-foreground">No puzzle available today.</p>
      </section>
    );
  }

  const initialState = await getGameState(puzzle.id);

  return (
    <section className="flex flex-1 flex-col py-8">
      <Game puzzle={puzzle} companies={companies} initialState={initialState} />
    </section>
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
