import ContentLoader from "react-content-loader";
import type { IContentLoaderProps } from "react-content-loader";

export const Loader = ({ children, ...rest }: IContentLoaderProps) => (
  <ContentLoader backgroundColor="#252f3f" foregroundColor="#374151" {...rest}>
    {children}
  </ContentLoader>
);
