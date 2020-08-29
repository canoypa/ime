const archiver = require("archiver");
const path = require("path");
const fs = require("fs");

const srcPath = path.resolve("src");
const distPath = "docs/raw";

const createPart = (partsPath) => {
  const name = path.basename(partsPath);

  const parts = fs
    .readdirSync(partsPath)
    .map((part) => path.join(partsPath, part));

  const text = parts.reduce((acc, cur) => {
    if (fs.statSync(cur).isDirectory()) return acc + createPart(cur).text;

    const raw = fs.readFileSync(cur, { encoding: "utf-8" });
    return (
      acc +
      raw
        .replace(/^\n|#.+\n/gm, "") // 空行とコメント削除
        .replace(/,(?:\s+)?/gm, "	") // xx, yy を xx  yy に変更
    );
  }, "");

  return { name, text };
};

const collect = (partsPaths) => {
  const parts = partsPaths.map((partsPath) => createPart(partsPath));
  const all = parts.reduce((acc, cur) => acc + cur.text, "");
  return { all, parts };
};

const createDic = (dicSrcPath) => {
  const zip = archiver("zip", { zlib: { level: 9 } });

  const outputName = `${path.basename(dicSrcPath)}.zip`;
  const output = fs.createWriteStream(path.resolve(distPath, outputName));

  const docPartsPaths = fs
    .readdirSync(dicSrcPath)
    .map((dir) => path.join(dicSrcPath, dir));
  const c = collect(docPartsPaths);

  zip.pipe(output);
  zip.append(c.all, { name: `${path.basename(dicSrcPath)}.txt` });
  c.parts.forEach((part) => {
    const name = `parts/${part.name}.txt`;
    zip.append(part.text, { name: name });
  });
  zip.finalize();
};

const init = (srcPath) => {
  const distDir = path.resolve(distPath);
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

  const srcDir = fs.readdirSync(srcPath);
  srcDir.forEach((dicSrcPath) => createDic(path.join(srcPath, dicSrcPath)));
};

init(srcPath);
