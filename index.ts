import { isNumber, isString } from 'util';

let path = '';

const applyParams = (route: string, param: number | string, paramName: string): string => {
  let parsedRoute = '';

  if (!param && !paramName) {
    parsedRoute += route;
  } else if (!param && paramName) {
    const temp = `${route}/${paramName}`;
    parsedRoute += temp;
  } else if (param && !paramName) {
    const temp = `${route}/${paramName}`;
    parsedRoute += temp;
  } else if (param && paramName) {
    let temp = `${route}/${param}`;
    parsedRoute += temp;
  }

  return parsedRoute;
};

const Route = function (
  this: any,
  route: string,
  childrenOrParam?: any | string,
  children?: any,
) {
  this.route = `/${route}`;

  if (isNumber(childrenOrParam) || isString(childrenOrParam)) {
    this.param = childrenOrParam as string;
    this.children = children as any;
  } else {
    this.children = childrenOrParam as any;
  }

  return (param: string | number) => {
    path += applyParams(this.route, param, this.param);

    return {
      ...this.children,
      exec: () => {
        const temp = path;
        path = '';
        return temp;
      },
    };
  };
} as any;

export {
  Route,
};
