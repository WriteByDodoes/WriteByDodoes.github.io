# Unpublished Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `published: false` prevent a writing Markdown file from producing a page or appearing anywhere in the blog while leaving its source file in GitHub.

**Architecture:** Put the publication rule in one CommonJS helper module shared by Eleventy's collection configuration and writing directory data. Unit-test the rule with Node's built-in test runner, then verify the complete Eleventy build with a temporary unpublished Markdown fixture.

**Tech Stack:** Node.js 22+, CommonJS, Node `node:test`, Eleventy 3.1, Nunjucks, Markdown/YAML front matter

## Global Constraints

- Treat a missing `published` field or `published: true` as public.
- Treat only the YAML boolean `published: false` as unpublished; the string `"false"` remains public.
- Apply the same behavior in local and production builds.
- Unpublished posts must have no generated HTML URL and must be absent from home, archives, categories, related-post recommendations, category counts, and sitemap output.
- Preserve Markdown source files in the repository and do not mark any existing post unpublished as part of this change.
- Add no draft UI, environment-specific preview behavior, or new runtime dependency.

---

## File Structure

- Create `src/_lib/publication.js`: the single publication policy, collection filtering, and writing permalink calculation.
- Create `test/publication.test.js`: unit coverage for default-public behavior, exact boolean handling, filtering, and permalink suppression.
- Modify `eleventy.config.js`: filter writing items through the shared publication policy before sorting and building every derived collection.
- Modify `src/writing/writing.11tydata.js`: delegate computed permalinks to the shared publication policy.
- Modify `package.json`: expose the Node test suite as `npm test`.
- Modify `README.md`: document the `published` front matter field and the public-repository limitation.

### Task 1: Shared publication policy and Eleventy integration

**Files:**
- Create: `src/_lib/publication.js`
- Create: `test/publication.test.js`
- Modify: `eleventy.config.js:1-4,201-204`
- Modify: `src/writing/writing.11tydata.js:1-13`
- Modify: `package.json:6-10`

**Interfaces:**
- Produces: `isPublished(data: object | undefined): boolean`
- Produces: `filterPublished(items: Array<{data?: object}>): Array<{data?: object}>`
- Produces: `writingPermalink(data: {published?: boolean, page?: {inputPath?: string, fileSlug?: string}}): string | false`
- Consumes: Eleventy collection items with post front matter under `item.data`; Eleventy computed permalink data with page metadata under `data.page`.

- [ ] **Step 1: Write the failing publication-policy tests**

Create `test/publication.test.js`:

```js
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
```

- [ ] **Step 2: Run the new test and verify the expected failure**

Run:

```bash
node --test test/publication.test.js
```

Expected: FAIL with `Cannot find module '../src/_lib/publication'`.

- [ ] **Step 3: Implement the minimal shared publication module**

Create `src/_lib/publication.js`:

```js
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
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
node --test test/publication.test.js
```

Expected: 3 tests pass and 0 fail.

- [ ] **Step 5: Integrate the shared rule with all writing collections and permalinks**

At the top of `eleventy.config.js`, add:

```js
const { filterPublished } = require("./src/_lib/publication");
```

Change `getWriting` in `eleventy.config.js` to filter before sorting:

```js
  const getWriting = (collectionApi) =>
    filterPublished(
      collectionApi.getFilteredByGlob("src/writing/**/*.{md,njk}")
    ).sort((a, b) => b.date - a.date);
```

Replace `src/writing/writing.11tydata.js` with:

```js
const { writingPermalink } = require("../_lib/publication");

module.exports = {
  eleventyComputed: {
    permalink: writingPermalink,
  },
};
```

Add the test script to `package.json` while preserving existing scripts:

```json
"test": "node --test"
```

- [ ] **Step 6: Run unit tests and the existing production build**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: all 3 tests pass, Eleventy completes without errors, and `git diff --check` prints nothing.

- [ ] **Step 7: Commit the shared behavior**

```bash
git add src/_lib/publication.js test/publication.test.js eleventy.config.js src/writing/writing.11tydata.js package.json
git commit -m "feat: support unpublished posts"
```

### Task 2: End-to-end exclusion verification and author documentation

**Files:**
- Temporarily create, then delete: `src/writing/2099-12-31-unpublished-verification.md`
- Modify: `README.md:60-87`

**Interfaces:**
- Consumes: `published: false` front matter handled by `isPublished`, `filterPublished`, and `writingPermalink` from Task 1.
- Produces: documented author workflow for hiding a post without deleting its Markdown source.

- [ ] **Step 1: Add a temporary unpublished verification post**

Create `src/writing/2099-12-31-unpublished-verification.md`:

```md
---
layout: layouts/writing.njk
title: "UNPUBLISHED_VERIFICATION_SENTINEL"
date: 2099-12-31
category: notes
published: false
---

UNPUBLISHED_VERIFICATION_SENTINEL
```

- [ ] **Step 2: Build and prove the post is absent everywhere**

Run:

```bash
npm run build
test ! -e _site/posts/2099-12-31-unpublished-verification/index.html
if rg -n "UNPUBLISHED_VERIFICATION_SENTINEL" _site; then exit 1; fi
test -e _site/posts/2026-07-16-who-takes-responsibility-for-the-world/index.html
```

Expected: Eleventy succeeds; the unpublished URL is absent; `rg` finds no sentinel in pages, archives, category pages, related recommendations, or sitemap; an existing public article still exists.

- [ ] **Step 3: Remove the temporary verification post**

Delete only `src/writing/2099-12-31-unpublished-verification.md`, then confirm:

```bash
test ! -e src/writing/2099-12-31-unpublished-verification.md
```

Expected: the command exits successfully and no existing writing file is changed.

- [ ] **Step 4: Document the front matter field and its limitation**

Add `published: true` to the recommended front matter example in `README.md`. Add these bullets under `작성 메모`:

```md
- `published`는 선택 필드이며, 생략하거나 `true`로 설정하면 글을 게시합니다.
- `published: false`로 설정하면 로컬과 배포 빌드 모두에서 해당 글의 HTML을 생성하지 않고 글 목록, 카테고리, 추천 글, 사이트맵에서도 제외합니다.
- 공개 GitHub 저장소의 Markdown 원본은 `published: false`여도 계속 공개됩니다. 이 설정은 블로그 게시만 막습니다.
```

- [ ] **Step 5: Run the final verification suite**

Run:

```bash
npm test
npm run build
git diff --check
git status --short
```

Expected: tests and build pass; whitespace validation is clean; status contains only the intended README change plus the already committed plan file if it has not yet been committed.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md
git commit -m "docs: explain unpublished post front matter"
```

- [ ] **Step 7: Confirm final scope**

Run:

```bash
git status --short
git log -3 --oneline
git diff origin/main...HEAD --stat
```

Expected: the worktree is clean; recent commits include the design, implementation, and documentation; the diff contains only publication behavior, its tests, and its documentation.
