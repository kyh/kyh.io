import type { ReactNode } from "react";
import { Card } from "components/card";
import { Loader } from "components/loader";

interface PointProps {
  label: string;
  pointClassname: string;
  pointShadeClassname: string;
}

const Point = ({ label, pointClassname, pointShadeClassname }: PointProps) => (
  <span
    aria-label={label}
    className={`${pointShadeClassname} bg-opacity-50 mr-2 flex h-4 w-4 items-center justify-center rounded-full`}
  >
    <span className={`${pointClassname} h-2 w-2 rounded-full`} />
  </span>
);

const CardLabel = ({ label, lowercase = false }: { label: string; lowercase?: boolean }) => (
  <span className={`text-2xs font-medium text-gray-400 ${lowercase ? "" : "uppercase"}`}>
    {label}
  </span>
);

interface StatCardProps extends PointProps {
  value: ReactNode;
  suffix?: string;
  className?: string;
  isLoading: boolean;
}

export const StatCard = ({
  pointClassname,
  pointShadeClassname,
  label,
  value,
  suffix,
  className,
  isLoading,
}: StatCardProps) => (
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
          <span className="mr-1 text-sm text-gray-100 select-text">{value}</span>
          {suffix !== undefined && <span className="text-2xs text-gray-400">{suffix}</span>}
        </>
      )}
    </div>
  </Card>
);

interface StatRowProps {
  className?: string;
  label: string;
  value: ReactNode;
  lowercase?: boolean;
  isLoading: boolean;
}

export const StatRow = ({ className = "", label, value, lowercase, isLoading }: StatRowProps) => (
  <div className={`flex items-center justify-between ${className}`}>
    <CardLabel label={label} lowercase={lowercase} />
    {isLoading ? (
      <Loader width="20%" height="21">
        <rect x="0" y="0" rx="5" ry="5" width="100%" height="100%" />
      </Loader>
    ) : (
      <span className="text-sm text-gray-100 select-text">{value}</span>
    )}
  </div>
);
