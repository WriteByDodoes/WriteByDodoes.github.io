const path = require("path");

const isPublished = (data) => !data || data.published !== false;

const filterPublished = (items) => {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => isPublished(item && item.data));
};

const fileNameSlug = (data) => {
  const inputPath = data && data.page && data.page.inputPath;
  if (!inputPath) return data && data.page ? data.page.fileSlug : "";
  return path.basename(inputPath, path.extname(inputPath));
};

const writingPermalink = (data) => {
  if (!isPublished(data)) return false;
  return `/posts/${fileNameSlug(data)}/`;
};

module.exports = {
  filterPublished,
  isPublished,
  writingPermalink,
};
