export const PageHeader = ({ children }) => {
  return (
    <header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold leading-tight text-gray-900">
          {children}
        </h2>
      </div>
    </header>
  );
};
