import { Card } from "components/Card";
import { Loader } from "components/Loader";

const Point = ({
  label = "",
  pointClassname = "",
  pointShadeClassname = "",
}) => {
  return (
    <span
      aria-label={label}
      className={`${pointShadeClassname} bg-opacity-50 mr-2 flex h-4 w-4 items-center justify-center rounded-full`}
    >
      <span className={`${pointClassname} h-2 w-2 rounded-full`} />
    </span>
  );
};

export const CardLabel = ({ label, lowercase }) => (
  <span
    className={`text-2xs font-medium text-gray-400 ${
      lowercase ? "" : "uppercase"
    }`}
  >
    {label}
  </span>
);

export const StatCard = ({
  pointClassname,
  pointShadeClassname,
  label,
  value,
  suffix,
  className,
  isLoading,
}) => {
  return (
    <Card className={className}>
      <div className="flex items-center">
        <Point
          label={label}
          pointClassname={pointClassname}
          pointShadeClassname={pointShadeClassname}
        />
        <CardLabel label={label} />
      </div>
      <div className="flex items-baseline pl-6">
        {isLoading ? (
          <Loader width="100%" height="21">
            <rect x="0" y="0" rx="5" ry="5" width="100%" height="100%" />
          </Loader>
        ) : (
          <>
            <span className="mr-1 text-sm text-gray-100">{value}</span>
            {!!suffix && (
              <span className="text-2xs text-gray-400">{suffix}</span>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export const StatRow = ({ className, label, value, lowercase, isLoading }) => (
  <div className={`flex items-center justify-between ${className}`}>
    <CardLabel label={label} lowercase={lowercase} />
    {isLoading ? (
      <Loader width="20%" height="21">
        <rect x="0" y="0" rx="5" ry="5" width="100%" height="100%" />
      </Loader>
    ) : (
      <span className="text-sm text-gray-100">{value}</span>
    )}
  </div>
);
