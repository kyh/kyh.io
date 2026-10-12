import { Demo } from "@/components/demo";
import { standings, totals } from "@/lib/standings";

export const revalidate = 10;

const HomePage = async () => {
  const [rows, total] = await Promise.all([standings(), totals()]);
  return (
    <main>
      <h1 className="visually-hidden">Clawders</h1>
      <Demo standings={rows} totals={total} />
    </main>
  );
};

export default HomePage;
