const { DateTime } = require("luxon");

const CATEGORY_LABELS = {
  novel: "소설",
  notes: "노트",
  philosophy: "철학",
};

const CATEGORY_ORDER = ["novel", "notes", "philosophy"];
const ARCHIVE_PAGE_SIZE = 8;

const slugify = (value) => {
  if (!value) return "";
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const decodeHtmlEntities = (value) => {
  if (typeof value !== "string") return "";
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
};

const stripHtmlForText = (html) => {
  if (typeof html !== "string") return "";
  return decodeHtmlEntities(
    html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/?(br|p|div|section|article|header|footer|main|aside|nav|ul|ol|li|blockquote|pre|table|thead|tbody|tfoot|tr|th|td|h[1-6])\b[^>]*>/gi, " ")
      .replace(/<[^>]*>/g, "")
  );
};

const getHeadingText = (html) =>
  stripHtmlForText(String(html || "")).replace(/\s+/g, " ").trim();

const truncateText = (text, maxLength = 160) => {
  if (typeof text !== "string") return "";
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (!Number.isFinite(Number(maxLength)) || Number(maxLength) < 1) return normalized;
  const limit = Number(maxLength);
  if (normalized.length <= limit) return normalized;
  const candidate = normalized.slice(0, Math.max(1, limit)).trim();
  const sentenceEnd = Math.max(candidate.lastIndexOf("."), candidate.lastIndexOf("?"), candidate.lastIndexOf("!"));
  if (sentenceEnd >= Math.floor(limit * 0.45)) {
    return candidate.slice(0, sentenceEnd + 1).trim();
  }

  const wordEnd = candidate.lastIndexOf(" ");
  if (wordEnd >= Math.floor(limit * 0.6)) {
    return `${candidate.slice(0, wordEnd).trim()}…`;
  }

  return `${candidate}…`;
};

const firstParagraphText = (html, maxLength = 160) => {
  if (typeof html !== "string") return "";
  const firstParagraphMatch = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  const paragraphHtml = firstParagraphMatch ? firstParagraphMatch[1] : html;
  const text = stripHtmlForText(paragraphHtml);
  return truncateText(text, maxLength);
};

const createUniqueHeadingId = (text, counts) => {
  const base = slugify(text) || "section";
  counts[base] = (counts[base] || 0) + 1;
  return counts[base] === 1 ? base : `${base}-${counts[base]}`;
};

const addHeadingIds = (html) => {
  if (typeof html !== "string") return html;
  const counts = {};
  return html.replace(/<h([1-3])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
    const existingId = attrs.match(/\sid=(["'])(.*?)\1/i);
    if (existingId) return match;
    const id = createUniqueHeadingId(getHeadingText(inner), counts);
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });
};

const extractHeadings = (html) => {
  if (typeof html !== "string") return [];
  const headings = [];
  html.replace(/<h([1-3])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
    const idMatch = attrs.match(/\sid=(["'])(.*?)\1/i);
    const text = getHeadingText(inner);
    if (!idMatch || !text) return match;
    headings.push({
      id: idMatch[2],
      level: Number(level),
      text,
    });
    return match;
  });
  return headings;
};

const normalizePostPath = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+/g, "/");
};

const normalizeArchiveBasePath = (value) => {
  const normalized = normalizePostPath(value);
  if (!normalized) return "/";
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
};

const buildPaginatedArchive = (items, basePath, pageSize, extra = {}) => {
  const sourceItems = Array.isArray(items) ? items : [];
  const normalizedPageSize = Number.isFinite(Number(pageSize))
    ? Math.max(1, Number(pageSize))
    : ARCHIVE_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(sourceItems.length / normalizedPageSize));
  const normalizedBasePath = normalizeArchiveBasePath(basePath);
  const hrefForPageIndex = (pageIndex) =>
    pageIndex === 0 ? normalizedBasePath : `${normalizedBasePath}page/${pageIndex + 1}/`;
  const hrefs = Array.from({ length: pageCount }, (_, pageIndex) => hrefForPageIndex(pageIndex));

  return hrefs.map((href, pageIndex) => ({
    ...extra,
    items: sourceItems.slice(
      pageIndex * normalizedPageSize,
      (pageIndex + 1) * normalizedPageSize
    ),
    href,
    hrefs,
    baseHref: normalizedBasePath,
    previousHref: pageIndex > 0 ? hrefForPageIndex(pageIndex - 1) : "",
    nextHref: pageIndex + 1 < pageCount ? hrefForPageIndex(pageIndex + 1) : "",
    pageIndex,
    pageNumber: pageIndex + 1,
    pageCount,
    pageSize: normalizedPageSize,
    totalItems: sourceItems.length,
  }));
};

const getPostCategoryKey = (post) => (post && post.data && post.data.category) || "notes";

const filterPostsByCategory = (posts, category) => {
  if (!Array.isArray(posts)) return [];
  const categoryKey = typeof category === "string" ? category : category && category.key;
  if (!categoryKey) return [];
  return posts.filter((post) => getPostCategoryKey(post) === categoryKey);
};

const sitemapUrl = (value) => {
  if (typeof value !== "string") return "";
  return encodeURI(value).replace(/&/g, "&amp;");
};

const shuffle = (items) => {
  const shuffled = Array.isArray(items) ? [...items] : [];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets/*.{js,css,png,svg}": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/assets/icons": "assets/icons" });
  eleventyConfig.addPassthroughCopy({ "src/styles": "styles" });

  eleventyConfig.addFilter("slugify", slugify);
  eleventyConfig.addFilter("readableDate", (dateObj, format = "yyyy.MM.dd") =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat(format)
  );
  eleventyConfig.addFilter("isoDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toISODate()
  );
  eleventyConfig.addFilter("head", (items, count) => {
    if (!Array.isArray(items)) return [];
    return items.slice(0, count);
  });
  eleventyConfig.addFilter("sitemapUrl", sitemapUrl);
  eleventyConfig.addFilter("addHeadingIds", addHeadingIds);
  eleventyConfig.addFilter("extractHeadings", extractHeadings);
  eleventyConfig.addFilter("firstParagraphText", (html, maxLength = 160) =>
    firstParagraphText(html, maxLength)
  );

  const getWriting = (collectionApi) =>
    collectionApi
      .getFilteredByGlob("src/writing/**/*.{md,njk}")
      .sort((a, b) => b.date - a.date);

  const buildCategoryList = (items, order, labels, defaultKey) => {
    const grouped = {};

    order.forEach((key) => {
      grouped[key] = [];
    });

    items.forEach((item) => {
      const key = item.data.category || defaultKey;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    return [...order, ...Object.keys(grouped).filter((key) => !order.includes(key)).sort()]
      .map((key) => ({
        key,
        name: labels[key] || key,
        count: grouped[key] ? grouped[key].length : 0,
      }))
      .filter((category) => category.count > 0);
  };

  eleventyConfig.addCollection("writing", (collectionApi) => getWriting(collectionApi));
  eleventyConfig.addCollection("writingPages", (collectionApi) =>
    buildPaginatedArchive(getWriting(collectionApi), "/posts/", ARCHIVE_PAGE_SIZE)
  );
  eleventyConfig.addCollection("categoryList", (collectionApi) =>
    buildCategoryList(getWriting(collectionApi), CATEGORY_ORDER, CATEGORY_LABELS, "notes")
  );
  eleventyConfig.addCollection("categoryPages", (collectionApi) => {
    const posts = getWriting(collectionApi);
    return buildCategoryList(posts, CATEGORY_ORDER, CATEGORY_LABELS, "notes")
      .flatMap((category) =>
        buildPaginatedArchive(
          filterPostsByCategory(posts, category),
          `/categories/${category.key}/`,
          ARCHIVE_PAGE_SIZE,
          { category }
        )
      );
  });

  eleventyConfig.addFilter("postsByCategory", (posts, category) => {
    return filterPostsByCategory(posts, category);
  });

  eleventyConfig.addFilter("hybridRelatedPosts", (posts, currentUrl, limit = 4) => {
    if (!Array.isArray(posts)) return [];
    const normalizedCurrentUrl = normalizePostPath(currentUrl);
    if (!normalizedCurrentUrl) return [];

    const maxItems = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 4;
    if (maxItems < 1) return [];

    const currentIndex = posts.findIndex(
      (post) => normalizePostPath(post && post.url) === normalizedCurrentUrl
    );
    if (currentIndex === -1) return [];

    const toPath = (post) => normalizePostPath(post && post.url);
    const prevPost = posts[currentIndex + 1] || null;
    const nextPost = posts[currentIndex - 1] || null;

    const excluded = new Set([normalizedCurrentUrl]);
    [prevPost, nextPost].forEach((post) => {
      const pathKey = toPath(post);
      if (pathKey) excluded.add(pathKey);
    });

    const randomPool = shuffle(
      posts.filter((post) => {
        const pathKey = toPath(post);
        return pathKey && !excluded.has(pathKey);
      })
    );

    const usedPaths = new Set([normalizedCurrentUrl]);
    const results = [];
    let randomIndex = 0;

    const pushUnique = (post, role) => {
      if (!post) return false;
      const pathKey = toPath(post);
      if (!pathKey || usedPaths.has(pathKey)) return false;
      usedPaths.add(pathKey);
      results.push({ post, role });
      return true;
    };

    const pickRandom = () => {
      while (randomIndex < randomPool.length) {
        const candidate = randomPool[randomIndex];
        randomIndex += 1;
        if (pushUnique(candidate, "random")) return true;
      }
      return false;
    };

    if (!pushUnique(prevPost, "prev")) {
      pickRandom();
    }

    if (results.length < maxItems && !pushUnique(nextPost, "next")) {
      pickRandom();
    }

    while (results.length < maxItems && pickRandom()) {}

    return results;
  });

  eleventyConfig.addFilter("sitemapFilter", (items, prefix = "") => {
    if (!Array.isArray(items)) return [];
    const normalizedPrefix = typeof prefix === "string" ? prefix : "";
    return items.filter((item) => {
      if (!item || !item.url) return false;
      if (item.data && item.data.sitemap === false) return false;
      if (item.url === "/robots.txt") return false;
      if (item.url.endsWith("/sitemap.xml")) return false;
      if (normalizedPrefix && !item.url.startsWith(normalizedPrefix)) return false;
      return true;
    });
  });

  const pathPrefix = process.env.PATH_PREFIX || "/";

  return {
    pathPrefix,
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    dataTemplateEngine: "njk",
  };
};
