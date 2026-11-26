import "react";

declare module "react" {
  /** Custom properties (`--name`) a style sets for its stylesheet to read. */
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined;
  }
}
