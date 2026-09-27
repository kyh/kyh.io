import ContentLoader from "react-content-loader";

export const Loader = ({ children, ...rest }) => (
  <ContentLoader backgroundColor="#252f3f" foregroundColor="#374151" {...rest}>
    {children}
  </ContentLoader>
);
