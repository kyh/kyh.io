import { About, useAbout } from "@/components/about";
import { Logo } from "@/components/logo";

const homeLink = (
  <a href="/" className="inline-flex px-3 py-5">
    <span className="sr-only">Logo</span>
    <Logo />
  </a>
);

export const Navigation = () => {
  const aboutProps = useAbout();

  return (
    <nav className="relative mx-auto mb-10 flex max-w-7xl justify-between">
      {homeLink}
      <div className="flex items-center gap-5 pr-2 md:gap-6">
        <button type="button" className="hover:underline" onClick={() => aboutProps.setRun(true)}>
          About
        </button>
        <a
          className="hover:underline"
          href="https://docs.google.com/spreadsheets/d/1MorR4RBtiFMexFv91w9sKcqBRIkLyv7tb394j8BHlig/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
        >
          Spreadsheet
        </a>
        <a
          className="hover:underline"
          href="https://github.com/kyh/tc"
          target="_blank"
          rel="noopener noreferrer"
        >
          Github
        </a>
      </div>
      <About {...aboutProps} />
    </nav>
  );
};
