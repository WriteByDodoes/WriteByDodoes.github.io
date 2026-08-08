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
