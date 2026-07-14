const normalizeUrl = (value) => {
  if (!value) return "";
  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const env = process.env;

module.exports = {
  title: "Underground Novel",
  tagline: "",
  description: "소설과 메모를 쌓아가는 두더즈의 공간.",
  author: "두더즈",
  url: normalizeUrl(env.SITE_URL || "http://localhost:8080"),
  email: "",
};
