const fs = require("fs");
const path = require("path");

const assetsDir = path.resolve(__dirname, "assets/js");

function isFileEmptyOrWhitespace(filePath) {
  const content = fs.readFileSync(filePath, "utf-8").trim();
  return content === "";
}

function walkDir(dir, fileCallback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileCallback);
    } else {
      fileCallback(fullPath);
    }
  }
}

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  if (files.length === 0) {
    fs.rmdirSync(dir);
   
    removeEmptyDirs(path.dirname(dir));
    return;
  }

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      removeEmptyDirs(fullPath);
    }
  }

  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
   
    removeEmptyDirs(path.dirname(dir));
  }
}

walkDir(assetsDir, (filePath) => {
  if (filePath.endsWith(".js") && isFileEmptyOrWhitespace(filePath)) {
    fs.unlinkSync(filePath);
  
  }
});

removeEmptyDirs(assetsDir);
