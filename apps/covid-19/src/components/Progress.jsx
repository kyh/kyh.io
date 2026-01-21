export const Progress = ({ value, total }) => {
  return (
    <div className="flex h-2 overflow-hidden rounded bg-gray-700">
      <div
        style={{ width: `${(value / total) * 100}%` }}
        className="bg-teal-500"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin="0"
        aria-valuemax={total}
      />
    </div>
  );
};
