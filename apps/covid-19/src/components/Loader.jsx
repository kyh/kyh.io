import ContentLoader from "react-content-loader";

export const Loader = ({ children, ...rest }) => {
  return (
    <ContentLoader
      backgroundColor="#252f3f"
      foregroundColor="#374151"
      {...rest}
    >
      {children}
    </ContentLoader>
  );
};
