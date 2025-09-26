export const Card = ({ children, className = "" }) => {
  return (
    <div
      className={`overflow-hidden rounded-sm border border-gray-700 py-3 px-4 ${className}`}
    >
      {children}
    </div>
  );
};
