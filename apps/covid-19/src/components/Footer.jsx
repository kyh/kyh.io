export const Footer = () => {
  return (
    <footer>
      <div className="flex justify-between max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-sm text-gray-400">
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
