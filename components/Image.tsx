type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export const Image = ({ src, alt, width, height }: Props) => {
  return (
    <picture>
      <source srcSet={src} type="image/webp" />
      <source srcSet={src.replace(".webp", ".png")} type="image/png" />
      <img src={src} alt={alt} width={width} height={height} />
    </picture>
  );
};
