# Underground Novel

두더즈의 소설과 메모를 쌓아가는 공간. Eleventy 3와 GitHub Pages로 운영하는 정적 사이트입니다.

## Quick Start

```bash
npm install
npm run dev
```

개발 서버는 `http://localhost:8080`에서 실행됩니다.

```bash
npm run dev      # Eleventy 개발 서버
npm run build    # 프로덕션 빌드, 출력: _site/
npm run clean    # _site/ 삭제
```

## 프로젝트 구조

- `src/index.njk`: 홈, 최신 글 목록.
- `src/about.njk`: 소개 페이지.
- `src/writing.njk`: 글 아카이브 (`/posts/`).
- `src/category.njk`: 카테고리별 글 목록 (`/categories/<key>/`).
- `src/writing/`: 글 마크다운 파일. 빌드 URL은 `/posts/<slug>/`.
- `src/_includes/layouts/`: 공통 레이아웃과 글 상세 레이아웃.
- `src/_includes/partials/`: 글 목록, 글 상세, 페이지네이션 공통 파셜.
- `src/styles/main.css`: 사이트 스타일.
- `eleventy.config.js`: 컬렉션, 필터, 출력 설정.

## 글 작성

경로:

```text
src/writing/YYYY-MM-DD-title.md
```

권장 front matter:

```md
---
layout: layouts/writing.njk
title: "첫 번째 노트"
date: 2026-04-04
category: notes
excerpt: "본문 일부 요약"
---

본문을 마크다운으로 작성합니다.
```

카테고리:

- `novel`: 소설
- `notes`: 노트

## 라이선스

- 코드: 별도 명시 없는 한 자유롭게 참고 가능.
- 콘텐츠(글): CC BY-NC-SA 4.0.
