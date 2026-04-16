# Changelog

## 2.1.0

Non-breaking additions. Existing v2.0 code keeps working unchanged.

**New:**

- `.query(params)` — append a query string to any resolved route. Accepts `Record<string, string | number | boolean | null | undefined | array>`. Null/undefined values are skipped, arrays serialize as repeated keys, everything is URL-encoded via `URLSearchParams`.
- `.hash(fragment)` — append a `#fragment` to any resolved route. Encoded via `encodeURIComponent`. Composes after `.query()`.
- `configure(routes, { basePath })` — opt-in, mutating, set-once. Prepends `basePath` to every root route in the given object. Calling twice with the same value is a no-op (HMR friendly); calling with a different value throws.
- Reserved names: `query` and `hash` are now reserved on `NonParamNode`. Avoid using them as child route names.

## 2.0.0

Major rewrite focused on ergonomics and type safety. The library is now centered on a Proxy-based runtime with a full TypeScript type surface — no more `any` in the public API.

**Breaking changes:**

- `.path` is gone. A route node **is** the path string (via `Symbol.toPrimitive`). Use it directly in template literals, `String()`, or any `string`-typed prop.
- Non-parameterized routes are no longer callable. Access them as plain properties: `routes.home`, not `routes.home()`.
- Parameterized routes are callable **once**. Chained access after a call needs the parent to be called first: `routes.user(1).cart(2).config` works; `routes.user.cart` is a type error.
- Template paths for deep trees (e.g. registering `/user/:userId/cart/:cartId` with a router lib) now go through the `Raw()` helper: `Raw(routes).user.cart`.
- Param values are URL-encoded by default.

**New:**

- Full TypeScript inference of the route tree. Child names, call signatures, parameter types — all checked at compile time.
- `Raw(tree)` — opt-in template traversal for a whole tree or a subtree.
- Test suite (vitest) covering runtime and types.

**Infrastructure:**

- TypeScript bumped to 5.x.
- `target` raised to ES2015 (Proxy is native).
- `ts-node` dependency removed.

## 1.0.2

- Slashes no longer auto-prepend; each segment must include its own leading `/`.
- Throws when a value is passed to a non-parameterized route.
- `.path` replaces `.exec()` to get the built URL.
