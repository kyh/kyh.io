import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { resolve, extname } from "node:path";

const getBase64 = async (src, size) => {
  const { data } = await sharp(src).resize(size).blur().toBuffer({
    resolveWithObject: true,
  });
  return `data:image/webp;base64,${data.toString("base64")}`;
};

const directoryPath = resolve(`${process.cwd()}/public/screenshots/`);

const main = async () => {
  console.log("Creating dynamic blur data for images in...", directoryPath);
  const files = await readdir(directoryPath);

  for (const file of files) {
    if (extname(file) === ".webp") {
      console.log(file, await getBase64(`${directoryPath}/${file}`, 16));
    }
  }
};

main().catch(console.error);
