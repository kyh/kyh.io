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
      className={`${pointShadeClassname} h-4 w-4 rounded-full flex items-center justify-center bg-opacity-50 mr-2`}
    >
      <span className={`${pointClassname} h-2 w-2 rounded-full`} />
    </span>
  );
};

export const CardLabel = ({ label, lowercase }) => (
  <span
    className={`font-medium text-gray-400 text-2xs ${
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
      <div className="flex pl-6 items-baseline">
        {isLoading ? (
          <Loader width="100%" height="21">
            <rect x="0" y="0" rx="5" ry="5" width="100%" height="100%" />
          </Loader>
        ) : (
          <>
            <span className="text-gray-100 text-sm mr-1">{value}</span>
            {!!suffix && (
              <span className="text-gray-400 text-2xs">{suffix}</span>
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
      <span className="text-gray-100 text-sm">{value}</span>
    )}
  </div>
);
