import { isNull } from "./utils/isNull";
import { isString } from "./utils/isString";

type Argument = number | string;

type RouteChildren = Record<string, any>;

interface RouteProps {
  [key: string]: any;
  path: string;
  paramName: string | null;
  basePath: string;
}

const Route = function (
  this: RouteProps,
  path: string,
  paramOrChildren: string | RouteChildren,
  children?: RouteChildren,
) {
  this.path = path;
  this.paramName = isString(paramOrChildren) 
    ? paramOrChildren as RouteProps['paramName'] 
    : null;
  this.basePath = '';

  const updateChildren = (basePath: string): void => {
    const paths = isString(paramOrChildren) 
      ? children as RouteChildren 
      : paramOrChildren as RouteChildren;

    if (paths) {
      Object.keys(paths).forEach((key) => {
        paths[key]().setBase(basePath);
        this[key] = paths[key];
      });
    }
  };

  const setBase = (base: string): void => {
    this.basePath = base;
  };

  const getArgPath = (arg: Argument): string => {
    let argPath = '';

    if (arg && !isNull(this.paramName)) {
      argPath = `/${arg}`;
    } 
    else if (!arg && !isNull(this.paramName)) {
      argPath = `/${this.paramName}`;
    } 
    else if (arg && isNull(this.paramName)) {
      throw new Error(`Unexpected value \`${arg}\` provided to not parameterized route`);
    }

    return argPath;
  };

  const getPath = (arg: Argument): string => {
    let newPath = `${this.basePath}${this.path}`;

    newPath += getArgPath(arg);

    updateChildren(newPath);

    return newPath;
  };

  updateChildren(this.path);

  return (arg: Argument = '') => ({
    ...this,
    path: getPath(arg),
    setBase,
  });
} as any;

export {
  Route,
};
