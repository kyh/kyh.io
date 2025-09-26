export const iconMap = {
  trendUp: (
    <path d="M20 15a1 1 0 0 0 2 0V7a1 1 0 0 0-1-1h-8a1 1 0 0 0 0 2h5.59L13 13.59l-3.3-3.3a1 1 0 0 0-1.4 0l-6 6a1 1 0 0 0 1.4 1.42L9 12.4l3.3 3.3a1 1 0 0 0 1.4 0L20 9.4V15z" />
  ),
  trendDown: (
    <path d="M20 9a1 1 0 0 1 2 0v8a1 1 0 0 1-1 1h-8a1 1 0 0 1 0-2h5.59L13 10.41l-3.3 3.3a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 1.4-1.42L9 11.6l3.3-3.3a1 1 0 0 1 1.4 0l6.3 6.3V9z" />
  ),
  play: (
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
      clipRule="evenodd"
    />
  ),
  pause: (
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  ),
};

const iconSizeMap = {
  xs: "12px",
  sm: "20px",
  md: "24px",
  lg: "40px",
};

export const Icon = ({ icon = "", size = "sm", ...rest }) => {
  const iconPath = iconMap[icon];
  const iconSize = iconSizeMap[size];
  if (!iconPath) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      width={iconSize}
      height={iconSize}
      {...rest}
    >
      {iconPath}
    </svg>
  );
};
