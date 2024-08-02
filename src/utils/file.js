const fse = require("fs-extra");
const path = require("path");

/**
 * 列出项目所有文件
 * @param {*} rootPath
 * @param {*} excludePath  需要排除的目录
 * @returns
 */
function listFiles(srcFullPath) {
  let fileList = [];
  getFiles(srcFullPath, fileList);

  return fileList;
}

exports.listFiles = listFiles;

/**
 * 递归列出所有文件
 * @param parentPath 上一级目录
 * @param fileList 导出的文件列表
 * @param excludePath 需要排除的目录
 */
function getFiles(parentPath, fileList) {
  let files = fse.readdirSync(parentPath);

  files.forEach((item) => {
    item = path.join(parentPath, item);
    let stat = fse.statSync(item);
    try {
      if (stat.isDirectory()) {
        getFiles(item, fileList);
      } else if (stat.isFile()) {
        fileList.push(item);
      }
    } catch (error) {
      console.error(error);
    }
  });
}
