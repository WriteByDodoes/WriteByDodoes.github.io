const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  filterPublished,
  isPublished,
  writingPermalink,
} = require("../src/_lib/publication");

const listFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });

const snapshotTree = (directory) => {
  if (!fs.existsSync(directory)) return null;
  return listFiles(directory)
    .map((filePath) => ({
      path: path.relative(directory, filePath),
      sha256: crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
};

test("posts are public unless published is the boolean false", () => {
  assert.equal(isPublished(), true);
  assert.equal(isPublished({}), true);
  assert.equal(isPublished({ published: true }), true);
  assert.equal(isPublished({ published: "false" }), true);
  assert.equal(isPublished({ published: false }), false);
});

test("filterPublished removes only posts marked with boolean false", () => {
  const publicByDefault = { data: { title: "Default" } };
  const explicitlyPublic = { data: { title: "Public", published: true } };
  const stringFalse = { data: { title: "String", published: "false" } };
  const unpublished = { data: { title: "Hidden", published: false } };

  assert.deepEqual(
    filterPublished([publicByDefault, explicitlyPublic, stringFalse, unpublished]),
    [publicByDefault, explicitlyPublic, stringFalse]
  );
  assert.deepEqual(filterPublished(null), []);
});

test("writingPermalink suppresses unpublished output", () => {
  assert.equal(
    writingPermalink({
      page: { inputPath: "./src/writing/2026-08-08-visible.md" },
    }),
    "/posts/2026-08-08-visible/"
  );
  assert.equal(
    writingPermalink({
      published: false,
      page: { inputPath: "./src/writing/2026-08-08-hidden.md" },
    }),
    false
  );
});

test("isolated Eleventy build excludes unpublished writing everywhere", () => {
  const repositoryPath = path.resolve(__dirname, "..");
  const realWritingPath = path.join(repositoryPath, "src", "writing");
  const realOutputPath = path.join(repositoryPath, "_site");
  const realWritingBefore = snapshotTree(realWritingPath);
  const realOutputBefore = snapshotTree(realOutputPath);
  const tempProjectPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "writebydodoes-publication-")
  );
  const tempSourcePath = path.join(tempProjectPath, "src");
  const tempOutputPath = path.join(tempProjectPath, "_site");
  const fixtureName = "2099-12-31-unpublished-publication-test.md";
  const fixturePath = path.join(tempSourcePath, "writing", fixtureName);
  const publicFixtureName = "2099-12-30-public-publication-test.md";
  const publicFixturePath = path.join(
    tempSourcePath,
    "writing",
    publicFixtureName
  );
  const unpublishedOutputPath = path.join(
    tempOutputPath,
    "posts",
    "2099-12-31-unpublished-publication-test",
    "index.html"
  );
  const publicOutputPath = path.join(
    tempOutputPath,
    "posts",
    "2099-12-30-public-publication-test",
    "index.html"
  );
  const sentinel = "UNPUBLISHED_PUBLICATION_TEST_SENTINEL";
  const publicSentinel = "PUBLIC_PUBLICATION_TEST_SENTINEL";

  try {
    fs.cpSync(path.join(repositoryPath, "src"), tempSourcePath, {
      recursive: true,
    });
    fs.writeFileSync(
      fixturePath,
      `---\nlayout: layouts/writing.njk\ntitle: Unpublished publication test\ndate: 2099-12-31\ncategory: notes\npublished: false\n---\n\n${sentinel}\n`
    );
    fs.writeFileSync(
      publicFixturePath,
      `---\nlayout: layouts/writing.njk\ntitle: Public publication test\ndate: 2099-12-30\ncategory: notes\n---\n\n${publicSentinel}\n`
    );

    assert.doesNotThrow(() => {
      execFileSync(
        process.execPath,
        [
          path.join(repositoryPath, "node_modules", "@11ty", "eleventy", "cmd.cjs"),
          `--config=${path.join(repositoryPath, "eleventy.config.js")}`,
        ],
        {
          cwd: tempProjectPath,
          env: { ...process.env, ELEVENTY_ENV: "production" },
          encoding: "utf8",
          stdio: "pipe",
        }
      );
    });

    const generatedFiles = listFiles(tempOutputPath);
    assert.equal(
      generatedFiles.some((filePath) =>
        fs.readFileSync(filePath).includes(Buffer.from(sentinel))
      ),
      false
    );
    assert.equal(fs.existsSync(unpublishedOutputPath), false);
    assert.equal(fs.existsSync(publicOutputPath), true);
    const sitemap = fs.readFileSync(
      path.join(tempOutputPath, "sitemap.xml"),
      "utf8"
    );
    assert.doesNotMatch(
      sitemap,
      /\/posts\/2099-12-31-unpublished-publication-test\//
    );
    assert.match(sitemap, /\/posts\/2099-12-30-public-publication-test\//);
    assert.match(
      fs.readFileSync(path.join(tempOutputPath, "posts", "index.html"), "utf8"),
      /<a href="\/categories\/notes\/">노트<\/a>\s*<span class="count">\(1\)<\/span>/
    );
    assert.deepEqual(snapshotTree(realWritingPath), realWritingBefore);
    assert.deepEqual(snapshotTree(realOutputPath), realOutputBefore);
  } finally {
    fs.rmSync(tempProjectPath, { recursive: true, force: true });
    assert.equal(fs.existsSync(tempProjectPath), false);
  }
});
