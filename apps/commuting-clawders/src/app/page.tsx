import { Demo } from "@/components/demo";
import { board } from "@/lib/standings";

const HomePage = async () => {
  const { rows, total } = await board();
  return (
    <main>
      <h1 className="visually-hidden">Commuting Clawders</h1>
      <Demo standings={rows} totals={total} />
    </main>
  );
};

export default HomePage;
