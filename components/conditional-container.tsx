export const ConditionalContainer = ({
  condition,
  container,
  children,
}: {
  condition: boolean;
  container: (children: React.ReactNode) => React.ReactNode;
  children: React.ReactNode;
}) => <>{condition ? container(children) : children}</>;
