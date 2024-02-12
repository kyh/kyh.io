type ConditionalContainerProps = {
  condition: boolean;
  container: (children: React.ReactNode) => React.ReactNode;
  children: React.ReactNode;
};

export const ConditionalContainer = ({
  condition,
  container,
  children,
}: ConditionalContainerProps) => (
  <>{condition ? container(children) : children}</>
);
