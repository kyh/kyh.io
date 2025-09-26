export const PageContainer = ({ children }) => {
  return (
    <main className="max-w-7xl mx-auto sm:px-6 lg:px-8 sm:flex justify-between w-full">
      {children}
    </main>
  );
};
