import archiver from "archiver";
import fs from "fs";
import path from "path";

// 単一ファイルを Set<[よみ, 単語, 品詞]> に変換
const parseFile = (file) => {
  return new Set(
    file
      .replace(/#.+/gm, "") // コメント行削除
      .replace(/^\r\n/gm, "") // 空行削除
      .replace(/\r\n$/, "") // 末端改行を削除
      .split(/\r\n/gm) // 改行で分解
      .map((v) => v.split(/,\s+/gm)) // よみ, 単語, 品詞 に分解
  );
};

// 子ディレクトリ/ファイルを再帰的に探索し、Set<[よみ, 単語, 品詞]> を返す
const convertDic = (fileOrFolderPath) => {
  const sett = new Set();

  const pathState = fs.statSync(fileOrFolderPath);
  const isDirectory = pathState.isDirectory();

  if (isDirectory) {
    fs.readdirSync(fileOrFolderPath).forEach((p) => {
      const set = convertDic(path.join(fileOrFolderPath, p));
      set.forEach((v) => {
        sett.add(v);
      });
    });
  } else {
    const file = fs.readFileSync(fileOrFolderPath, { encoding: "utf-8" });
    parseFile(file).forEach((v) => {
      sett.add(v);
    });
  }

  return sett;
};

// Set<[...]> をテキストに変換
const convertText = (set) => {
  // 最後に改行が必要
  return [...set].map((v) => v.join("	")).join("\n") + "\n";
};

// convertDic してテキスト化して zip する
const createDic = (distPath, dicPath) => {
  const zip = archiver("zip", { zlib: { level: 9 } });
  const outFileName = `${path.basename(dicPath)}.zip`;
  const output = fs.createWriteStream(path.resolve(distPath, outFileName));

  const all = convertText(convertDic(dicPath));

  zip.pipe(output);
  zip.append(all, { name: `${path.basename(dicPath)}.txt` });

  fs.readdirSync(dicPath).forEach((partLabel) => {
    const partPath = path.join(dicPath, partLabel);
    const part = convertText(convertDic(partPath));
    zip.append(part, { name: `parts/${partLabel}.txt` });
  });
  zip.finalize();
};

const main = () => {
  const srcPath = path.resolve("src");
  const distPath = path.resolve("dist");

  if (!fs.existsSync(distPath)) fs.mkdirSync(distPath);

  const srcDir = fs.readdirSync(srcPath);
  srcDir.forEach((dicLabel) => {
    const dicPath = path.join(srcPath, dicLabel);
    createDic(distPath, dicPath);
  });
};

main();
