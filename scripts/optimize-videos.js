import { readdir, rename, unlink } from "node:fs/promises";
import { extname, resolve } from "node:path";
import ffmpeg from "fluent-ffmpeg";

const getTmpFileName = (src) => {
  return src.replace(/\.[^/.]+$/, "") + ".tmp.mp4";
};

const optimizeVideo = async (src, out) => {
  return new Promise((resolve) => {
    ffmpeg(src)
      .output(out)
      .videoCodec("libx264")
      .size("800x600")
      .noAudio()
      .on("error", (err) => {
        console.log("Error:", err.message);
      })
      .on("progress", (progress) => {
        console.log("Progress:", progress.frames);
      })
      .on("end", resolve)
      .run();
  });
};

const directoryPath = resolve(`${process.cwd()}/public/screenshots/`);

const main = async () => {
  console.log("Optimizing videos in...", directoryPath);
  const files = await readdir(directoryPath);

  for (const file of files) {
    if (extname(file) === ".mp4") {
      console.log(`optimizing ${file}`);
      const src = `${directoryPath}/${file}`;
      const tmpFileName = getTmpFileName(src);
      await optimizeVideo(src, tmpFileName);
      await unlink(src);
      await rename(tmpFileName, src);
      console.log(`done`);
    }
  }
};

main().catch(console.error);
