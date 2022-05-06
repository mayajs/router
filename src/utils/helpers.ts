import { DEPS, PRIMITIVES } from "./constants";
import { Services } from "../class";
import regex from "./regex";

// We use '+' instead of template string '${}' because of performance gain
// See https://stackoverflow.com/questions/6094117/prepend-text-to-beginning-of-string
export const sanitizePath = (path: string) => {
  if (path === "" || path === "/") {
    return "";
  }

  if (path.startsWith("/")) {
    return path;
  }

  return "/" + path;
};

export const logger = {
  red: (value: string) => console.log(`\x1b[31m${value}\x1b[0m`),
};

const mapProviders = (name: string, _module?: ParentModule): undefined | Type<Services> => {
  if (!_module || !_module?.providers) return;
  const index = _module?.providers?.findIndex((item) => item.name === name);
  return index > -1 ? _module?.providers[index] : mapProviders(name, _module.parent);
};

const findDependency = (name: string, dependencies: RouterDependencies, props: RouterProps, _module?: ParentModule) => {
  if (dependencies[name]) return dependencies[name];

  const provider = mapProviders(name, _module) as any;
  let args: any[] = [];

  if (!provider) return;
  if (provider?.dependencies?.length > 0) args = mapDependencies(dependencies, _module, provider.dependencies);

  const providerInstance: Services = new provider(...args);
  dependencies[name] = providerInstance;
  return providerInstance;
};

export function mapDependencies(routerDep: RouterDependencies, _module?: ParentModule, dependencies?: any[]) {
  const _dependencies = dependencies ?? _module?.dependencies;

  const mapDependencyItems = ({ name }: any) => {
    if (PRIMITIVES.includes(name)) return undefined;

    const dependency = findDependency(name, routerDep, props, _module);

    if (!dependency) {
      logger.red(`${name} is not provided properly in a module.`);
      throw new Error();
    }
    return dependency;
  };

  return _dependencies ? _dependencies.map(mapDependencyItems) : [];
}

export function statusCodeFactory(res: MayaJsResponse) {
  return (code: number) => {
    res.status(code);
  };
}

function routeBuilder(routes: RouteBody, isOptions: boolean, middlewares: Middlewares[], cb1: () => MayaJsRoute, cb2: (m: Middlewares[]) => MayaJsRoute) {
  routes?.middlewares?.map((item) => middlewares.push(item));
  return !isOptions ? cb1() : cb2(middlewares);
}

function getParamKeys(routes: RouteBody) {
  const keys = ["middlewares", "GET", "POST", "DELETE", "OPTIONS", "PUT", "PATCH"];
  const pattern = /:[\w-]+$/;
  return Object.keys(routes).filter((route) => !keys.includes(route) && pattern.test(route));
}

export function mapParamRoute(routes: RouteBody): RouteBody {
  const key = getParamKeys(routes)[0];
  return routes[key] as RouteBody;
}

export function routeFinderFactory(path: string) {
  return function routeFinder(paths: string[], routes: RouteBody, method: RequestMethod, middlewares: Middlewares[]): null | MayaJsRoute {
    const current = paths[0];
    const isEnd = paths.length === 1;
    const isOptions = method === "OPTIONS";
    const nextPath = [...paths];
    const tempMiddlewares = [...middlewares];
    nextPath.shift();

    let route = routes?.[current] as RouteBody;
    const paramKeys = getParamKeys(routes);

    const isOptionRoute = () => route[method];
    const isMethodRoute = (m: Middlewares[]) => ({ middlewares: m, method, regex: regex(path), callback: () => undefined, path });

    if (!route && paramKeys.length > 0) {
      for (const key of paramKeys) {
        route = routes[key] as RouteBody;

        if (!route) continue;
        if (isEnd) return routeBuilder(routes, isOptions, tempMiddlewares, isOptionRoute, isMethodRoute);
        const hasRoute = routeFinder(nextPath, route, method, tempMiddlewares);
        if (hasRoute) return hasRoute;
      }
    }

    if (!route) return null;
    if (isEnd) return routeBuilder(routes, isOptions, tempMiddlewares, isOptionRoute, isMethodRoute);

    return routeFinder(nextPath, route, method, middlewares);
  };
}

export const pathUrl = (url: string) => url.replace(/(^\/+)|(\/+$)/g, "");
