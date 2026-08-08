const { writingPermalink } = require("../_lib/publication");

module.exports = {
  eleventyComputed: {
    permalink: writingPermalink,
  },
};
