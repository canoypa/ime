const archiver = require("archiver");
const path = require("path");
const fs = require("fs");

const targets = fs.readdirSync(path.resolve("src"));

const createPart = (partsList) => {
  let result = {
    name: path.basename(partsList),
    text: "",
  };

  const parts = fs
    .readdirSync(partsList)
    .map((module) => path.join(partsList, module));

  parts.forEach((part) => {
    if (fs.statSync(part).isDirectory()) {
      result.text = result.text.concat(createPart(part).text);
    } else {
      const raw = fs.readFileSync(part, { encoding: "utf-8" });
      result.text = result.text.concat(raw);
    }
  });

  return result;
};

const collect = (dirList) => {
  let result = {
    all: "",
    parts: [],
  };

  dirList.forEach((dir) => result.parts.push(createPart(dir)));
  result.parts.forEach((part) => (result.all = result.all.concat(part.text)));

  return result;
};

const createDic = (dirPath) => {
  const zip = archiver("zip", { zlib: { level: 9 } });

  const outputName = `${path.basename(dirPath)}.zip`;
  const output = fs.createWriteStream(path.resolve("dist", outputName));

  const dirList = fs.readdirSync(dirPath).map((dir) => path.join(dirPath, dir));
  const c = collect(dirList);

  zip.pipe(output);
  zip.append(c.all, { name: `${path.basename(dirPath)}.txt` });
  c.parts.forEach((part) => {
    const name = `parts/${part.name}.txt`;
    zip.append(part.text, { name: name });
  });
  zip.finalize();
};

const init = (targets) => {
  targets.forEach((target) => createDic(path.resolve("src", target)));
};

init(targets);
