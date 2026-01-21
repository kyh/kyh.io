export const PageHeader = ({ children }) => {
  return (
    <header>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl leading-tight font-bold text-gray-900">
          {children}
        </h2>
      </div>
    </header>
  );
};
