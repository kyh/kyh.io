import { readdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import sharp from "sharp";

const convertToWebp = async (src) => {
  const webpBuffer = await sharp(src).webp({ quality: 80 }).toBuffer();

  return webpBuffer;
};

const directoryPath = resolve(`${process.cwd()}/public/screenshots/`);

const main = async () => {
  console.log("Creating dynamic blur data for images in...", directoryPath);
  const files = await readdir(directoryPath);

  for (const file of files) {
    if (extname(file) === ".png") {
      console.log(`converting ${file}`);
      const webpBuffer = await convertToWebp(`${directoryPath}/${file}`);
      const webpFileName = `${file.replace(/\.[^/.]+$/, "")}.webp`;
      await writeFile(`${directoryPath}/${webpFileName}`, webpBuffer);
      console.log(`converted ${file} to ${webpFileName}`);
    }
  }
};

main().catch(console.error);
