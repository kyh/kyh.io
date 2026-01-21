export const Footer = () => {
  return (
    <footer>
      <div className="mx-auto flex max-w-7xl justify-between px-4 py-4 text-sm text-gray-400 sm:px-6 lg:px-8">
        <span>© {new Date().getFullYear()}, Kaiyu Hsu</span>
        <div>
          <a
            className="hover:text-gray-100"
            href="https://github.com/kyh/covid-19"
          >
            Github
          </a>
        </div>
      </div>
    </footer>
  );
};
