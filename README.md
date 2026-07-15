# Underground Novel

Eleventy 3와 GitHub Pages로 운영하는 두더즈의 소설/메모 블로그입니다.

주요 언어는 한국어입니다. 코드는 MIT License, 콘텐츠는 CC BY-NC-SA 4.0 License를 따릅니다.

## Quick Start

요구사항:

- Node.js 22+
- npm

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:8080`에서 실행됩니다. 프로덕션 빌드는 `_site/`에 생성됩니다.

주요 명령:

```bash
npm run dev      # Eleventy 개발 서버
npm run build    # 프로덕션 빌드, 출력: _site/
npm run clean    # _site/ 삭제
```

## 프로젝트 구조

- `src/index.njk`: 홈, 최신 글 목록.
- `src/about.njk`: 소개 페이지 (`/about/`).
- `src/writing.njk`: 글 아카이브 (`/posts/`).
- `src/category.njk`: 카테고리별 글 목록 (`/categories/<key>/`).
- `src/writing/`: 글 마크다운 파일. 빌드 URL은 `/posts/<slug>/`.
- `src/_includes/layouts/base.njk`: 공통 레이아웃, canonical, description, Open Graph, Twitter card, CSP.
- `src/_includes/layouts/writing.njk`: 글 상세 레이아웃.
- `src/_includes/partials/`: 글 목록, 글 상세, 페이지네이션 공통 파셜.
- `src/_data/site.js`: 사이트 메타데이터(title, description, author, url).
- `src/assets/`: 프로필 이미지, 아이콘, 공통 JS.
- `src/styles/main.css`: 사이트 스타일.
- `src/robots.txt.njk`: `/robots.txt` 생성.
- `src/sitemap.xml.njk`: `/sitemap.xml` 생성.
- `eleventy.config.js`: 컬렉션, 필터, passthrough copy, 출력 설정.

## 글 작성

경로:

```text
src/writing/YYYY-MM-DD-title.md
```

빌드 URL:

```text
/posts/YYYY-MM-DD-title/
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

작성 메모:

- 필수 필드: `layout`, `title`, `date`, `category`
- `excerpt`는 글 목록 요약, SEO description, Open Graph description, Twitter description에 사용됩니다.
- `excerpt`가 없으면 본문 첫 문단을 160자 기준으로 잘라 meta description에 사용합니다.
- 글 상세 헤더에는 `excerpt`를 표시하지 않습니다. `excerpt`는 부제목이 아니라 목록/검색/공유용 요약으로 관리합니다.
- 카테고리 목록과 페이지네이션은 `eleventy.config.js`의 컬렉션, `postsByCategory` 필터, `buildPaginatedArchive`를 따릅니다.
- 이미지가 필요하면 `src/assets/`에 추가하고 사이트 경로 기준으로 참조합니다.

## SEO와 공유 미리보기

공통 SEO 메타는 `src/_includes/layouts/base.njk`에서 생성합니다.

- `<title>`은 페이지 `title`과 사이트 제목을 조합합니다.
- `meta description`은 `excerpt -> description -> 본문 첫 문단 -> 사이트 설명` 순서로 선택합니다.
- canonical URL은 `SITE_URL`과 Eleventy `page.url`을 기준으로 생성합니다.
- Open Graph 태그를 모든 페이지에 출력합니다: `og:title`, `og:description`, `og:url`, `og:type`, `og:site_name`, `og:locale`.
- Twitter card 태그를 모든 페이지에 출력합니다: `twitter:card`, `twitter:title`, `twitter:description`.
- 글 상세 페이지의 `og:type`은 `article`, 일반 페이지는 `website`입니다.
- 글 상세 본문의 `h1`~`h3`에는 자동 heading id가 붙고, 목차 UI에 사용됩니다.

검색 엔진 파일:

- `src/robots.txt.njk` -> `/robots.txt`
- `src/sitemap.xml.njk` -> `/sitemap.xml`
- `robots.txt`에는 `Sitemap: {SITE_URL}/sitemap.xml`이 포함됩니다.
- RSS/Atom feed는 현재 생성하지 않습니다.

## 환경변수

| 변수 | 용도 | 기본값 |
| --- | --- | --- |
| `SITE_URL` | canonical, sitemap, robots.txt의 기준 URL | `http://localhost:8080` |
| `PATH_PREFIX` | GitHub Pages 하위 경로 배포 prefix | `/` |

이 저장소는 `WriteByDodoes.github.io`(GitHub Pages user 사이트)로 배포되므로, 배포 워크플로우에서 `SITE_URL`과 `PATH_PREFIX`를 고정값으로 설정합니다. 광고, 분석 스크립트는 사용하지 않습니다.

## CSP와 외부 리소스

기본 레이아웃은 GitHub Pages 환경을 고려해 `meta` 기반 CSP를 사용합니다.

- CDN 스크립트나 스타일을 추가하면 `src/_includes/layouts/base.njk`의 CSP 허용 목록을 확인합니다.
- 현재 허용된 외부 리소스는 Pretendard 폰트(`cdn.jsdelivr.net`)와 Google Fonts(`fonts.googleapis.com`, `fonts.gstatic.com`)뿐입니다.

## GitHub Pages 배포

배포 워크플로우는 `.github/workflows/deploy.yml`입니다.

- `main` 브랜치 push 시 자동 배포합니다.
- `workflow_dispatch`로 수동 배포할 수 있습니다.
- GitHub Actions에서 Node.js 22와 `npm ci`를 사용합니다.
- `SITE_URL=https://writebydodoes.github.io`, `PATH_PREFIX=/`로 고정되어 있습니다.
- 빌드 산출물 `_site/`를 GitHub Pages artifact로 업로드합니다.

GitHub Settings > Pages에서 배포 소스가 GitHub Actions인지 확인하세요. 저장소에 Pages가 한 번도 활성화된 적이 없다면 Settings > Pages에서 최초 1회 수동으로 Source를 GitHub Actions로 지정해야 합니다.

## 라이선스

- 코드: MIT License (`LICENSE`)
- 콘텐츠: CC BY-NC-SA 4.0 (`LICENSE-CONTENT`)

콘텐츠 라이선스 적용 범위:

- `src/writing/**`
- 프로필 이미지: `src/assets/profile.png`

그 외 레이아웃, 템플릿, 스타일, 빌드 코드는 MIT License를 따릅니다. 제3자 라이브러리, 폰트는 각 원저작권과 라이선스가 우선합니다.
