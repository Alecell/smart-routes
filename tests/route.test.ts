import { describe, it, expect } from "vitest";
import { Route, Raw, configure } from "../index";

describe("Route — non-parameterized", () => {
  it("coerces to its path via template literal", () => {
    const routes = { home: new Route("/home") };
    expect(`${routes.home}`).toBe("/home");
  });

  it("coerces via String()", () => {
    const routes = { home: new Route("/home") };
    expect(String(routes.home)).toBe("/home");
  });

  it("exposes children as direct properties", () => {
    const routes = {
      user: new Route("/user", {
        info: new Route("/info"),
      }),
    };
    expect(`${routes.user.info}`).toBe("/user/info");
  });

  it("throws if called like a function", () => {
    const routes = { home: new Route("/home") };
    expect(() => (routes.home as any)(1)).toThrow();
  });
});

describe("Route — parameterized", () => {
  it("uncalled coerces to template path", () => {
    const routes = { user: new Route("/user", ":userId") };
    expect(`${routes.user}`).toBe("/user/:userId");
  });

  it("calling fills the parameter", () => {
    const routes = { user: new Route("/user", ":userId") };
    expect(`${routes.user(123)}`).toBe("/user/123");
  });

  it("accepts string params", () => {
    const routes = { user: new Route("/user", ":userId") };
    expect(`${routes.user("abc")}`).toBe("/user/abc");
  });

  it("URL-encodes param values", () => {
    const routes = { q: new Route("/q", ":term") };
    expect(`${routes.q("a b/c")}`).toBe("/q/a%20b%2Fc");
  });

  it("throws when called twice", () => {
    const routes = { user: new Route("/user", ":userId") };
    expect(() => (routes.user(1) as any)(2)).toThrow();
  });
});

describe("Route — deep chaining", () => {
  const routes = {
    user: new Route("/user", ":userId", {
      info: new Route("/info"),
      cart: new Route("/cart", ":cartId", {
        config: new Route("/config"),
        item: new Route("/item", ":itemId"),
      }),
    }),
  };

  it("non-param child after called param", () => {
    expect(`${routes.user(123).info}`).toBe("/user/123/info");
  });

  it("param child after called param", () => {
    expect(`${routes.user(123).cart(9)}`).toBe("/user/123/cart/9");
  });

  it("non-param grandchild of chained params", () => {
    expect(`${routes.user(123).cart(9).config}`).toBe(
      "/user/123/cart/9/config",
    );
  });

  it("param grandchild of chained params", () => {
    expect(`${routes.user(123).cart(9).item(7)}`).toBe(
      "/user/123/cart/9/item/7",
    );
  });

  it("reuses the same root across calls without leaking state", () => {
    const a = `${routes.user(1).cart(2).config}`;
    const b = `${routes.user(999).cart(888).config}`;
    const c = `${routes.user(1).cart(2).config}`;
    expect(a).toBe("/user/1/cart/2/config");
    expect(b).toBe("/user/999/cart/888/config");
    expect(c).toBe(a);
  });
});

describe("Raw — template traversal", () => {
  const routes = {
    user: new Route("/user", ":userId", {
      cart: new Route("/cart", ":cartId", {
        config: new Route("/config"),
      }),
    }),
    admin: new Route("/admin", {
      panel: new Route("/panel"),
    }),
  };

  it("returns deep template path from root", () => {
    expect(`${Raw(routes).user.cart.config}`).toBe(
      "/user/:userId/cart/:cartId/config",
    );
  });

  it("works on a subtree", () => {
    expect(`${Raw(routes.user).cart.config}`).toBe(
      "/user/:userId/cart/:cartId/config",
    );
  });

  it("works on non-parameterized subtrees", () => {
    expect(`${Raw(routes).admin.panel}`).toBe("/admin/panel");
  });

  it("raw nodes cannot be called", () => {
    expect(() => (Raw(routes).user as any)(1)).toThrow();
  });
});

describe("Route — non-canonical trees", () => {
  it("supports arbitrary naming and depth", () => {
    const r = {
      a: new Route("/x", {
        b: new Route("/y", ":z", {
          c: new Route("/w", {
            d: new Route("/leaf", ":id"),
          }),
        }),
      }),
    };
    expect(`${r.a.b(5).c.d(9)}`).toBe("/x/y/5/w/leaf/9");
    expect(`${Raw(r).a.b.c.d}`).toBe("/x/y/:z/w/leaf/:id");
  });

  it("handles sibling routes of mixed shapes under the same parent", () => {
    const r = {
      a: new Route("/x", {
        b: new Route("/y", ":z", {
          c: new Route("/w", {
            d: new Route("/d", ":did", {
              inner: new Route("/inner"),
            }),
            e: new Route("/e"),
            f: new Route("/f", ":fid"),
          }),
        }),
      }),
    };

    expect(`${r.a.b(1).c.d(10).inner}`).toBe("/x/y/1/w/d/10/inner");
    expect(`${r.a.b(1).c.e}`).toBe("/x/y/1/w/e");
    expect(`${r.a.b(1).c.f(20)}`).toBe("/x/y/1/w/f/20");

    const parent = r.a.b(1).c;
    expect(`${parent.d(10).inner}`).toBe("/x/y/1/w/d/10/inner");
    expect(`${parent.e}`).toBe("/x/y/1/w/e");
    expect(`${parent.f(20)}`).toBe("/x/y/1/w/f/20");
    expect(`${parent.d(99).inner}`).toBe("/x/y/1/w/d/99/inner");

    expect(`${Raw(r).a.b.c.d.inner}`).toBe("/x/y/:z/w/d/:did/inner");
    expect(`${Raw(r).a.b.c.e}`).toBe("/x/y/:z/w/e");
    expect(`${Raw(r).a.b.c.f}`).toBe("/x/y/:z/w/f/:fid");
  });
});

describe("Route — validation", () => {
  it("throws if param does not start with ':'", () => {
    expect(() => new (Route as any)("/user", "userId")).toThrow(
      /must start with ':'/,
    );
  });

  it("throws when called with undefined value", () => {
    const routes = { user: new Route("/user", ":userId") };
    expect(() => (routes.user as any)(undefined)).toThrow(/requires a value/);
  });
});

describe("Route — query string", () => {
  const routes = {
    search: new Route("/search"),
    user: new Route("/user", ":userId", {
      config: new Route("/config"),
    }),
  };

  it("appends query params to a non-parameterized route", () => {
    expect(`${routes.search.query({ q: "foo", page: 2 })}`).toBe(
      "/search?q=foo&page=2",
    );
  });

  it("appends query params after a called param chain", () => {
    expect(`${routes.user(1).config.query({ tab: "security" })}`).toBe(
      "/user/1/config?tab=security",
    );
  });

  it("URL-encodes query values", () => {
    expect(`${routes.search.query({ q: "a b/c&d" })}`).toBe(
      "/search?q=a+b%2Fc%26d",
    );
  });

  it("supports array values", () => {
    expect(`${routes.search.query({ tag: ["a", "b", "c"] })}`).toBe(
      "/search?tag=a&tag=b&tag=c",
    );
  });

  it("skips null and undefined values", () => {
    expect(
      `${routes.search.query({ q: "foo", missing: null, also: undefined })}`,
    ).toBe("/search?q=foo");
  });

  it("returns the path unchanged when query is empty", () => {
    expect(`${routes.search.query({})}`).toBe("/search");
  });

  it("supports number and boolean values", () => {
    expect(`${routes.search.query({ n: 42, b: true })}`).toBe(
      "/search?n=42&b=true",
    );
  });
});

describe("Route — hash fragment", () => {
  const routes = {
    docs: new Route("/docs"),
    user: new Route("/user", ":userId", {
      config: new Route("/config"),
    }),
  };

  it("appends a hash to a non-parameterized route", () => {
    expect(`${routes.docs.hash("install")}`).toBe("/docs#install");
  });

  it("appends a hash after a called param chain", () => {
    expect(`${routes.user(1).config.hash("section")}`).toBe(
      "/user/1/config#section",
    );
  });

  it("URL-encodes the fragment", () => {
    expect(`${routes.docs.hash("a b/c")}`).toBe("/docs#a%20b%2Fc");
  });

  it("composes after .query()", () => {
    expect(`${routes.user(1).config.query({ tab: "x" }).hash("anchor")}`).toBe(
      "/user/1/config?tab=x#anchor",
    );
  });
});

describe("Route — query/hash with Raw", () => {
  const routes = {
    user: new Route("/user", ":userId", {
      config: new Route("/config"),
    }),
  };

  it("query works on a Raw template", () => {
    expect(`${Raw(routes).user.config.query({ tab: "x" })}`).toBe(
      "/user/:userId/config?tab=x",
    );
  });

  it("hash works on a Raw template", () => {
    expect(`${Raw(routes).user.config.hash("top")}`).toBe(
      "/user/:userId/config#top",
    );
  });
});

describe("configure() — basePath", () => {
  it("prepends basePath to all root routes", () => {
    const routes = {
      user: new Route("/user", ":userId", {
        config: new Route("/config"),
      }),
      admin: new Route("/admin"),
    };
    configure(routes, { basePath: "/app" });

    expect(`${routes.user(1).config}`).toBe("/app/user/1/config");
    expect(`${routes.admin}`).toBe("/app/admin");
    expect(`${routes.user}`).toBe("/app/user/:userId");
  });

  it("works with Raw after configure", () => {
    const routes = {
      user: new Route("/user", ":userId", {
        config: new Route("/config"),
      }),
    };
    configure(routes, { basePath: "/app" });

    expect(`${Raw(routes).user.config}`).toBe("/app/user/:userId/config");
  });

  it("works with query/hash after configure", () => {
    const routes = {
      search: new Route("/search"),
    };
    configure(routes, { basePath: "/app" });

    expect(`${routes.search.query({ q: "x" }).hash("y")}`).toBe(
      "/app/search?q=x#y",
    );
  });

  it("is a no-op when called twice with the same basePath", () => {
    const routes = {
      user: new Route("/user", ":userId"),
    };
    configure(routes, { basePath: "/app" });
    configure(routes, { basePath: "/app" });

    expect(`${routes.user(1)}`).toBe("/app/user/1");
  });

  it("throws when called twice with different basePaths", () => {
    const routes = {
      user: new Route("/user", ":userId"),
    };
    configure(routes, { basePath: "/app" });

    expect(() => configure(routes, { basePath: "/other" })).toThrow(
      /basePath already set/,
    );
  });

  it("is a no-op when basePath is undefined", () => {
    const routes = {
      user: new Route("/user", ":userId"),
    };
    configure(routes, {});

    expect(`${routes.user(1)}`).toBe("/user/1");
  });

  it("isolates configuration per routes object", () => {
    const a = { user: new Route("/user", ":userId") };
    const b = { user: new Route("/user", ":userId") };
    configure(a, { basePath: "/app-a" });
    configure(b, { basePath: "/app-b" });

    expect(`${a.user(1)}`).toBe("/app-a/user/1");
    expect(`${b.user(1)}`).toBe("/app-b/user/1");
  });
});
