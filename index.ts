declare const paramBrand: unique symbol;
declare const nonParamBrand: unique symbol;

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | ReadonlyArray<QueryValue>>;

export type WithHash = string & {
  hash(fragment: string): string;
};

export type Terminable = {
  query(params: QueryParams): WithHash;
  hash(fragment: string): string;
};

export type NonParamNode<C> = string &
  Terminable & {
    readonly [nonParamBrand]: C;
  } & {
    readonly [K in keyof C]: C[K];
  };

export type ParamNode<R> = string & {
  readonly [paramBrand]: R;
} & ((value: string | number) => R);

export type RawView<T> = T extends { readonly [paramBrand]: infer R }
  ? RawView<R>
  : T extends { readonly [nonParamBrand]: infer C }
  ? string & Terminable & { readonly [K in keyof C]: RawView<C[K]> }
  : T extends Record<string, any>
  ? { readonly [K in keyof T]: RawView<T[K]> }
  : T;

export interface RouteConstructor {
  new (path: string): NonParamNode<{}>;
  new (path: string, param: `:${string}`): ParamNode<NonParamNode<{}>>;
  new <C extends Record<string, any>>(path: string, children: C): NonParamNode<C>;
  new <C extends Record<string, any>>(
    path: string,
    param: `:${string}`,
    children: C
  ): ParamNode<NonParamNode<C>>;
}

const SPEC = Symbol("smart-routes:spec");

interface Spec {
  segment: string;
  paramName: string | null;
  children: Record<string, any>;
}

interface NodeState {
  spec: Spec;
  currentPath: string;
  template: boolean;
}

function buildInitialPath(segment: string, paramName: string | null): string {
  return paramName ? segment + "/:" + paramName : segment;
}

function serializeQuery(params: QueryParams): string {
  const sp = new URLSearchParams();
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined) continue;
        sp.append(key, String(item));
      }
    } else {
      sp.append(key, String(value));
    }
  }
  return sp.toString();
}

function makeTerminal(currentPath: string): any {
  return new Proxy(
    {},
    {
      get(_t, key) {
        if (key === Symbol.toPrimitive) return () => currentPath;
        if (key === "toString") return () => currentPath;
        if (key === "valueOf") return () => currentPath;
        if (key === "hash") {
          return (fragment: string) =>
            currentPath + "#" + encodeURIComponent(fragment);
        }
        return undefined;
      },
    }
  );
}

function makeNode(state: NodeState): any {
  const { spec, currentPath, template } = state;
  const callable = !template && spec.paramName !== null;
  const target: any = callable ? function () {} : {};

  const handler: ProxyHandler<any> = {
    get(_t, key) {
      if (key === SPEC) return state;
      if (key === Symbol.toPrimitive) return () => currentPath;
      if (key === "toString") return () => currentPath;
      if (key === "valueOf") return () => currentPath;
      if (typeof key === "symbol") return undefined;

      if (key === "query") {
        return (params: QueryParams) => {
          const qs = serializeQuery(params);
          return makeTerminal(qs ? currentPath + "?" + qs : currentPath);
        };
      }
      if (key === "hash") {
        return (fragment: string) =>
          currentPath + "#" + encodeURIComponent(fragment);
      }

      const child = spec.children[key];
      if (!child) return undefined;
      const childState: NodeState | undefined = (child as any)[SPEC];
      if (!childState) return undefined;

      const childSpec = childState.spec;
      const childInit =
        currentPath + buildInitialPath(childSpec.segment, childSpec.paramName);
      return makeNode({ spec: childSpec, currentPath: childInit, template });
    },
    apply(_t, _thisArg, args) {
      if (template || spec.paramName === null) {
        throw new Error(`Route '${currentPath}' is not parameterized`);
      }
      const value = args[0];
      if (value === undefined || value === null) {
        throw new Error(
          `Route '${currentPath}' requires a value for ':${spec.paramName}'`
        );
      }
      const filled = currentPath.replace(
        new RegExp(":" + spec.paramName + "$"),
        encodeURIComponent(String(value))
      );
      return makeNode({
        spec: { segment: spec.segment, paramName: null, children: spec.children },
        currentPath: filled,
        template: false,
      });
    },
    has(_t, key) {
      return (
        key === SPEC ||
        key === "query" ||
        key === "hash" ||
        key in spec.children
      );
    },
  };

  return new Proxy(target, handler);
}

function RouteImpl(
  path: string,
  paramOrChildren?: string | Record<string, any>,
  children?: Record<string, any>
): any {
  let paramName: string | null = null;
  let kids: Record<string, any> = {};

  if (typeof paramOrChildren === "string") {
    if (!paramOrChildren.startsWith(":")) {
      throw new Error(
        `Route param must start with ':' (got '${paramOrChildren}')`
      );
    }
    paramName = paramOrChildren.slice(1);
    if (children) kids = children;
  } else if (paramOrChildren && typeof paramOrChildren === "object") {
    kids = paramOrChildren;
  }

  const spec: Spec = { segment: path, paramName, children: kids };
  return makeNode({
    spec,
    currentPath: buildInitialPath(path, paramName),
    template: false,
  });
}

export const Route: RouteConstructor = RouteImpl as unknown as RouteConstructor;

export function Raw<T>(node: T): RawView<T> {
  if (node == null) return node as any;

  const state: NodeState | undefined = (node as any)[SPEC];
  if (state) {
    return makeNode({
      spec: state.spec,
      currentPath: state.currentPath,
      template: true,
    }) as any;
  }

  if (typeof node === "object") {
    return new Proxy(node as any, {
      get(t, key) {
        return Raw((t as any)[key]);
      },
    }) as any;
  }

  return node as any;
}

const _configTracker = new WeakMap<object, { basePath: string }>();

export interface ConfigureOptions {
  basePath?: string;
}

export function configure<T extends Record<string, any>>(
  routes: T,
  opts: ConfigureOptions
): void {
  if (opts.basePath === undefined) return;

  const existing = _configTracker.get(routes);
  if (existing) {
    if (existing.basePath === opts.basePath) return;
    throw new Error(
      `smart-routes: basePath already set to '${existing.basePath}' for this routes object, ` +
        `cannot reassign to '${opts.basePath}'.`
    );
  }
  _configTracker.set(routes, { basePath: opts.basePath });

  for (const key of Object.keys(routes)) {
    const node = (routes as any)[key];
    if (!node) continue;
    const state: NodeState | undefined = node[SPEC];
    if (!state) continue;

    const newSpec: Spec = {
      segment: opts.basePath + state.spec.segment,
      paramName: state.spec.paramName,
      children: state.spec.children,
    };
    (routes as any)[key] = makeNode({
      spec: newSpec,
      currentPath: buildInitialPath(newSpec.segment, newSpec.paramName),
      template: false,
    });
  }
}
