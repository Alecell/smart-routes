import { describe, it, expectTypeOf, assertType } from "vitest";
import { Route, Raw } from "../index";

const routes = {
  home: new Route("/home"),
  user: new Route("/user", ":userId", {
    info: new Route("/info"),
    cart: new Route("/cart", ":cartId", {
      config: new Route("/config"),
    }),
  }),
};

describe("type: non-parameterized", () => {
  it("is assignable to string", () => {
    assertType<string>(routes.home);
    expectTypeOf(routes.home).toMatchTypeOf<string>();
  });

  it("is not callable", () => {
    // Wrapped in unexecuted closure so the runtime never touches it.
    const _assert = () => {
      // @ts-expect-error home is not parameterized
      routes.home(1);
    };
    void _assert;
  });
});

describe("type: parameterized", () => {
  it("is callable with string or number", () => {
    expectTypeOf(routes.user).toBeCallableWith(123);
    expectTypeOf(routes.user).toBeCallableWith("abc");
  });

  it("rejects wrong-typed arg", () => {
    const _assert = () => {
      // @ts-expect-error booleans are not allowed as params
      routes.user(true);
    };
    void _assert;
  });

  it("uncalled does not expose children", () => {
    const _assert = () => {
      // @ts-expect-error cannot access cart on uncalled parametrized route
      routes.user.cart;
    };
    void _assert;
  });

  it("called exposes children", () => {
    assertType<string>(routes.user(1).info);
    expectTypeOf(routes.user(1).info).toMatchTypeOf<string>();
  });

  it("parametrized child must be called before further access", () => {
    const _assert = () => {
      // @ts-expect-error cart is parametrized, must be called
      routes.user(1).cart.config;
    };
    void _assert;
    assertType<string>(routes.user(1).cart(2).config);
  });

  it("non-existent children are type errors", () => {
    const _assert = () => {
      // @ts-expect-error no 'ghost' child
      routes.user(1).ghost;
    };
    void _assert;
  });
});

describe("type: Raw()", () => {
  it("allows free traversal on an otherwise-parametrized tree", () => {
    const raw = Raw(routes);
    assertType<string>(raw.user.cart.config);
    expectTypeOf(raw.user.cart.config).toMatchTypeOf<string>();
  });

  it("works on a single node", () => {
    const raw = Raw(routes.user);
    assertType<string>(raw.cart.config);
  });
});

describe("type: query/hash", () => {
  it("query is callable on a non-parameterized node", () => {
    expectTypeOf(routes.home.query).toBeFunction();
    assertType<string>(routes.home.query({ q: "x" }));
  });

  it("hash is callable on a non-parameterized node", () => {
    expectTypeOf(routes.home.hash).toBeFunction();
    assertType<string>(routes.home.hash("section"));
  });

  it("query is callable on a resolved param chain", () => {
    assertType<string>(routes.user(1).info.query({ tab: "x" }));
    assertType<string>(routes.user(1).cart(2).config.query({ a: 1 }));
  });

  it("hash is callable after query", () => {
    const withHash = routes.user(1).info.query({ tab: "x" });
    assertType<string>(withHash.hash("anchor"));
  });

  it("query is not callable on uncalled param", () => {
    const _assert = () => {
      // @ts-expect-error query not available before calling parametrized route
      routes.user.query({ x: 1 });
    };
    void _assert;
  });
});
