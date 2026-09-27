export const Progress = ({ value, total }) => (
  <progress
    className="h-2 w-full appearance-none overflow-hidden rounded bg-gray-700 [&::-moz-progress-bar]:bg-teal-500 [&::-webkit-progress-bar]:bg-gray-700 [&::-webkit-progress-value]:bg-teal-500"
    value={value}
    max={total}
  />
);
