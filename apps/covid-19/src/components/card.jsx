export const Card = ({ children, className = "" }) => (
  <div className={`overflow-hidden rounded-sm border border-gray-700 px-4 py-3 ${className}`}>
    {children}
  </div>
);
