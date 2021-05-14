import { RouteMethod, RouterMethods, RouterProps, MayaJsRoute, RouteBody, Route } from "../interface";
import { logger, mapDependencies, sanitizePath } from "../utils/helpers";
import { RequestMethod, RouteCallback, RouterFunction } from "../types";
import merge from "../utils/merge";
import regex from "../utils/regex";
import { props } from "./router";
import { declarationsMapper, mapModules } from "../utils/mapper";

// Export default route object
const router: RouterMethods = {
  addRouteToList: (route, _module) => {},
  findRoute: (path, method) => null,
  executeRoute: (path, route) => Promise.resolve(),
  visitedRoute: (path, method) => null,
  mapper: (path, method) => (route) => {},
  ...props,
};

router.addRouteToList = function (route, _module) {
  // Get the parent path
  const parent = _module?.parent ? _module?.parent.path : "";

  // Sanitize current route path
  const path = (parent + route.path).replace(/^\/+|\/+$/g, "");

  const createCommonRoute = (path: string[], routes: RouteBody, key: RequestMethod, options: MayaJsRoute, parent: Route): any => {
    const current = path[0];

    if (current === "") return (this.routes[""][key] = options);
    if (!routes?.[current]) routes[current] = { middlewares: [...(parent.middlewares ?? []), ...(parent.guards ?? [])] } as any;
    if (routes[current] && path.length === 1) return ((routes[current] as RouteBody)[key] = options);

    path.shift();
    return createCommonRoute(path, routes[current] as RouteBody, key, options, parent);
  };

  // List of request method name
  const methods = ["GET", "POST", "PUT", "HEAD", "DELETE", "OPTIONS", "PATCH"];

  if (route.controller && route.hasOwnProperty("controller")) {
    const dependencies = mapDependencies(this.dependencies, _module, route?.dependencies || (route.controller as any).dependencies);
    const controller = new route.controller(...dependencies);
    const controllerProps = Object.getOwnPropertyNames(Object.getPrototypeOf(controller)) as RequestMethod[];
    const routes = (controller as any)["routes"];

    routes.map(({ middlewares, methodName, path: routePath, requestMethod }: any) => {
      // Create callback function
      const callback = (args: any) => (controller as any)[methodName](args) as RouteCallback;

      // Create parent route
      const parent = path === "" ? "/" : path;

      routePath = routePath.startsWith("/") ? routePath : `/${routePath}`;
      middlewares = [...this.middlewares, ...(route?.middlewares ?? []), ...(route?.guards ?? []), ...middlewares];

      // Add controller route to list
      this.addRouteToList({ path: sanitizePath(parent + routePath), middlewares, [requestMethod]: callback });
    });

    controllerProps.map((key: RequestMethod) => {
      if (methods.includes(key)) {
        let middlewares = controller?.middlewares?.[key] ?? [];
        let guards = controller?.guards?.[key] ?? [];

        middlewares = [...this.middlewares, ...(route?.middlewares ?? []), ...guards, ...middlewares];

        // Create callback function
        const callback = (args: any) => controller[key](args) as RouteCallback;

        const options = { middlewares, dependencies: [], method: key, regex: regex(path), callback, path };

        createCommonRoute(path.split("/"), this.routes[""], key, options, route);
      }
    });
  }

  if (!route?.controller) {
    (Object.keys(route) as RequestMethod[]).map((key): void => {
      if (methods.includes(key) && route.hasOwnProperty("controller")) {
        throw new Error(`Property controller can't be used with ${key} method on route '${path}'`);
      }

      // Check if key is a method
      if (methods.includes(key) && !route.hasOwnProperty("controller")) {
        // Get current method
        const current = route[key] as RouteMethod;

        // Set default middlewares from route
        let middlewares = route?.middlewares ?? [];

        let guards = route?.guards ?? [];

        // Check if current method has middlewares
        if (current?.middlewares) {
          middlewares = [...middlewares, ...current.middlewares];
        }

        const routeCallback = (args: any) => (route[key] as RouteCallback)(args);

        // Create callback function
        const callback = current?.callback ?? routeCallback;

        const options = { middlewares: [...guards, ...middlewares], dependencies: [], method: key, regex: regex(path), callback, path };

        createCommonRoute(path.split("/"), this.routes[""], key, options, route);
      }
    });
  }
};

router.findRoute = function (path, method) {
  const callback = () => {};

  function findCommonRoute(paths: string[], routes: RouteBody, method: RequestMethod): null | MayaJsRoute {
    const current = paths[0];
    const currentRoute = routes[current] as RouteBody;
    const isEnd = routes[current] && paths.length === 1;

    if (!routes?.[current]) return null;
    if (isEnd && method !== "OPTIONS") return currentRoute[method];
    if (isEnd && method === "OPTIONS") return { middlewares: [...currentRoute.middlewares], method, regex: regex(path), callback, path };

    paths.shift();
    return findCommonRoute(paths, routes[current] as RouteBody, method);
  }

  if (path !== "") return findCommonRoute(path.split("/"), this.routes[""], method);

  return this.routes[""][method];
};

router.executeRoute = async function (path, route) {
  // Set message variable
  let message = "";

  try {
    const context = this.context;
    // Try to execute route callback
    message = await route.callback(context);

    if (!this.visitedRoutes[path]) {
      // Initialize path for caching
      this.visitedRoutes[path] = {} as any;
    }

    if (!this.visitedRoutes[path][route.method]) {
      // Cache path route if not on visited routes
      this.visitedRoutes[path][route.method] = { ...route, ...context };
    }
  } catch (error) {
    // Catch error when running callback
    message = error;
  }

  return message;
};

router.visitedRoute = function (path, method) {
  return this?.visitedRoutes && this?.visitedRoutes[path] && this?.visitedRoutes[path][method] ? this?.visitedRoutes[path][method] : null;
};

router.mapper = function (parent = "", _module = null) {
  const _this = this;

  return (route) => {
    // Create parent route
    parent = parent.length > 0 ? sanitizePath(parent) : "";

    // Sanitize route path
    route.path = parent + sanitizePath(route.path);

    if (_module !== null) _module.path = route.path;

    const controllerName = route?.controller?.name;
    let isDeclared = true;

    // Check if controller is declared on a module
    if (controllerName && _module !== null) isDeclared = declarationsMapper(_module, controllerName);

    // Throw error if controller is not declared in a module
    if (!isDeclared) {
      const moduleName = _module?.constructor.name;
      logger.red(`${controllerName} is not declared in ${moduleName}`);
      throw new Error();
    }

    // Add route to list
    _this.addRouteToList(route, _module);

    if (route?.children !== undefined && route?.loadChildren !== undefined) {
      logger.red(`Property 'loadChildren' can't be used with 'children' in route '${route.path}'`);
      throw new Error();
    }

    if (route?.controller !== undefined && route?.loadChildren !== undefined) {
      logger.red(`Property 'loadChildren' can't be used with 'controller' in route '${route.path}'`);
      throw new Error();
    }

    // Check if route has children
    if (route?.children && route?.children.length > 0) route.children.map(_this.mapper(route.path));

    // Load all children asynchronously
    if (route?.loadChildren) {
      route
        .loadChildren()
        .then(mapModules(_this, _module ?? { path: route.path }))
        .catch((error) => console.log(error));
    }
  };
};

export default (app: RouterProps): RouterFunction => merge(app, router);
