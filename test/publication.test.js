const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  filterPublished,
  isPublished,
  writingPermalink,
} = require("../src/_lib/publication");

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

test("Eleventy builds when a writing post is unpublished", () => {
  const fixtureName = "2099-12-31-unpublished-publication-test.md";
  const fixturePath = path.join("src", "writing", fixtureName);
  const outputPath = path.join(
    "_site",
    "posts",
    "2099-12-31-unpublished-publication-test",
    "index.html"
  );
  const sentinel = "UNPUBLISHED_PUBLICATION_TEST_SENTINEL";

  fs.writeFileSync(
    fixturePath,
    `---\nlayout: layouts/writing.njk\ntitle: Unpublished publication test\ndate: 2099-12-31\ncategory: notes\npublished: false\n---\n\n${sentinel}\n`
  );

  try {
    assert.doesNotThrow(() => {
      execFileSync("npm", ["run", "build"], {
        encoding: "utf8",
        stdio: "pipe",
      });
    });
    assert.equal(fs.existsSync(outputPath), false);
    assert.equal(
      fs.readFileSync(path.join("_site", "index.html"), "utf8").includes(sentinel),
      false
    );
  } finally {
    fs.rmSync(fixturePath, { force: true });
  }
});
