export const Card = ({ children, className = "" }) => {
  return (
    <div
      className={`overflow-hidden rounded-sm border border-gray-700 px-4 py-3 ${className}`}
    >
      {children}
    </div>
  );
};
