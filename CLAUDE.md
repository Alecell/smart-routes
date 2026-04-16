# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`smart-routes` is a framework-agnostic library to declare and reuse route definitions as a single source of truth. It is **not** a router — it doesn't render or navigate. It only builds path strings from a typed declarative tree, with the goal of preventing common mistakes: links to wrong routes, params sent to non-parameterized routes, hard-to-read scattered route literals.

Published to npm as `smart-routes`. Source is a single `index.ts` that compiles to `dist/`.

## Commands

- `npm run build` — runs `tsc`, emitting JS + `.d.ts` into `dist/` (per `tsconfig.json`).
- `npm install` — installs the (very small) dev deps: TypeScript 3.9, ts-node, `@types/node`.
- No test runner is configured.
- `prepublish` script runs `tsc` automatically before publishing.

`role.js` at the repo root is a scratch/manual smoke script (`node role.js`) that requires `./dist/index` and prints route compositions. It is **not** committed history-wise as a test — treat it as a sandbox for experimenting with the API after a build.

## Architecture

The whole library is the `Route` constructor in `index.ts`. Understanding it requires reading the file as a whole because of an unusual call-shape:

- `new Route(path, paramOrChildren?, children?)` returns a **function**, not a plain object. Every access to a route is `routes.foo()` — calling it returns a snapshot object with `.path`, plus child routes attached as properties (themselves callable functions).
- The second argument is overloaded: a **string** (treated as `paramName`, e.g. `':userId'`) or a **children record** (`Record<string, Route>`). When it's a string, the third argument carries the children.
- `path` is built lazily on each call. `getPath(arg)` concatenates `basePath + path + getArgPath(arg)`, then walks children via `updateChildren(newPath)` so each child's `basePath` is set to the parent's resolved path. This is why `routes.user(123).cart().item(456).path` works: each call mutates child base paths in place.
- `getArgPath` is the safety check: passing an argument to a route with no `paramName` throws `Unexpected value ... provided to not parameterized route`. Passing nothing to a parameterized route leaves the `:param` placeholder in the string (used when registering routes with a router lib).
- Slashes are **not** auto-prefixed (changed in 1.0.2). Each segment must include its own leading `/` if desired — see the README's "Complete example" where segments are bare (`'user'`, `'info'`) and the resulting paths are `user/:userId/info` style. Behavior depends on what the caller writes.

### Typing status

`dist/index.d.ts` currently exports `Route` as `any` — there is **no real type surface** today. Consumers get no autocomplete or type-checking on route trees, params, or `.path` access. Any future work on stronger types touches this file as the primary deliverable.

### Utils

`utils/isNull.ts` and `utils/isString.ts` are one-liner type guards used inside `index.ts`. No other internal modules.

## Conventions worth knowing

- Public API surface is intentionally tiny: only `Route` is exported.
- Breaking changes are tracked in `CHANGELOG.md`. The author prefers to avoid them but will bump major when the internal model changes (see 1.0.2 notes about removing `.exec()` and the global `path`).
- `tsconfig.json` targets ES5 / CommonJS with `strict: true`. Keep that target unless coordinating a release — downstream consumers may rely on the CJS output.
