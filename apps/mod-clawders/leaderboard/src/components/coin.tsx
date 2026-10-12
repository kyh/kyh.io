// The game's star coin, drawn as it is in the HUD.
export const Coin = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 40 40">
    <circle cx="20" cy="20" fill="#c98a00" r="20" />
    <circle cx="20" cy="20" fill="#ffc61f" r="16.8" />
    <path
      d="M20 9l3.2 7.1 7.7.8-5.8 5.2 1.7 7.6L20 25.8l-6.8 3.9 1.7-7.6-5.8-5.2 7.7-.8z"
      fill="#ffe36a"
    />
  </svg>
);
