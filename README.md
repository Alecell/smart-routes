# Smart Routes ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-green.svg "PRs Welcome")

A framework-agnostic, strongly-typed way to centralize and reuse routes on web apps.

**This isn't a router** like `react-router` or `vue-router`. Smart Routes is a single-source-of-truth for route strings: declare once, use everywhere, and let TypeScript catch routing mistakes at compile time.

> **v2 is a breaking change.** If you're on v1, see [CHANGELOG.md](./CHANGELOG.md) — the `.path` accessor and mandatory `()` on non-parameterized routes are gone.

## Motivation

Large apps accumulate dozens of routes. Hand-written route strings lead to:

- Links pointing to the wrong route.
- Parameters sent to routes that don't accept them.
- Unreadable, unsearchable string literals scattered around.
- Painful renames — a route path change means grepping the entire codebase.

A centralized, type-checked route tree fixes all of this.

## Install

```
npm install smart-routes
```

## Basic usage

```ts
import { Route } from "smart-routes";

const routes = {
  home: new Route("/home"),
};

`${routes.home}`; // "/home"
```

No `.path`, no `()` on non-parameterized routes — the node **is** the string. It works anywhere a `string` is expected:

```tsx
<Link to={routes.home}>Home</Link>
```

## Parameterized routes

Declare the parameter as a segment prefixed with `:`. Parameterized routes are **callable** — pass the value when you need the filled path.

```ts
const routes = {
  user: new Route("/user", ":userId"),
};

`${routes.user(123)}`; // "/user/123"
`${routes.user}`; // "/user/:userId"  (the raw template)
```

Values are URL-encoded automatically (`encodeURIComponent`).

## Subroutes

```ts
const routes = {
  user: new Route("/user", {
    info: new Route("/info"),
  }),
};

`${routes.user.info}`; // "/user/info"
```

Mix parameterized and non-parameterized freely:

```ts
const routes = {
  user: new Route("/user", ":userId", {
    info: new Route("/info"),
    cart: new Route("/cart", ":cartId", {
      config: new Route("/config"),
    }),
  }),
};

`${routes.user(1).info}`; // "/user/1/info"
`${routes.user(1).cart(7)}`; // "/user/1/cart/7"
`${routes.user(1).cart(7).config}`; // "/user/1/cart/7/config"
```

## Raw template paths — `Raw()`

To get a deep template path (for registering routes in a router library), wrap the tree with `Raw`:

```tsx
import { Route, Raw } from "smart-routes";

const routes = {
  user: new Route("/user", ":userId", {
    cart: new Route("/cart", ":cartId", {
      config: new Route("/config"),
    }),
  }),
};

// Register with placeholders:
<Route path={Raw(routes).user.cart.config} element={<Config />} />;
// → "/user/:userId/cart/:cartId/config"

// Generate the filled link elsewhere:
<Link to={routes.user(1).cart(7).config} />;
// → "/user/1/cart/7/config"
```

`Raw()` also works on a subtree: `Raw(routes.user).cart.config`.

## Query strings and hash fragments

Any resolved route exposes `.query(...)` and `.hash(...)`:

```ts
routes.search.query({ q: "foo", page: 2 });
// → "/search?q=foo&page=2"

routes.user(1).config.query({ tab: "security" });
// → "/user/1/config?tab=security"

routes.docs.hash("install");
// → "/docs#install"

routes.user(1).config.query({ tab: "x" }).hash("anchor");
// → "/user/1/config?tab=x#anchor"
```

Query values accept `string | number | boolean | null | undefined | array`. `null`/`undefined` entries are skipped; arrays serialize as repeated keys (`?tag=a&tag=b`). Everything is URL-encoded.

> `query` and `hash` are reserved names on resolved routes — avoid using them as child route names.

## Base path — `configure()`

If your app is deployed under a sub-path, declare your routes as usual and prepend the prefix once:

```ts
import { Route, configure } from "smart-routes";

export const routes = {
  user: new Route("/user", ":userId", {
    config: new Route("/config"),
  }),
  admin: new Route("/admin"),
};

configure(routes, { basePath: "/app" });

`${routes.user(1).config}`; // "/app/user/1/config"
`${routes.admin}`; // "/app/admin"
```

`configure()` is **set-once per routes object**. Calling it twice with the same `basePath` is a no-op (safe under HMR); a different value throws. If you don't need a base path, simply don't call `configure()`.

## Type safety

The TypeScript types catch the most common routing mistakes at compile time:

```ts
routes.home(1);
// ❌ TS error: home is not parameterized, not callable.

routes.user.cart;
// ❌ TS error: user is parameterized and uncalled — you can't traverse
//              into its children until you've given it a value.

routes.user(1).cart.config;
// ❌ TS error: cart is parameterized, must be called before .config.

routes.user(1).ghost;
// ❌ TS error: no child named 'ghost'.

routes.user(true);
// ❌ TS error: params accept string | number, not boolean.
```

The only time TS allows free traversal is inside `Raw(...)`, which is the explicit opt-in for template paths.

## Why `Raw()` and not more API?

Smart Routes is intentionally minimal. The full public surface is:

- `Route` — the declaration constructor.
- `Raw` — the template-mode unwrap for deep placeholder paths.
- `configure` — opt-in base path for the whole tree.
- `.query(...)` / `.hash(...)` — append query strings and hash fragments.

Everything else is types.
