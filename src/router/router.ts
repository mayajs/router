import { RouteMethod, RouterMethods, RouterProps, MayaJsRoute, RouteBody, Route, RouterMapperArgs } from "../interface";
import { routeFinderFactory, logger, mapDependencies, sanitizePath } from "../utils/helpers";
import { RequestMethod, RouteCallback, RouterFunction } from "../types";
import merge from "../utils/merge";
import regex from "../utils/regex";
import { props } from "./app";
import { declarationsMapper, mapModules } from "../utils/mapper";

// Export default route object
const router: RouterMethods = {
  addRouteToList: (route, _module) => {
    /* This is intentional */
  },
  findRoute: (path, method) => null,
  executeRoute: (path, route) => Promise.resolve(),
  visitedRoute: (path, method) => null,
  mapper: (path, method) => (route) => {
    /* This is intentional */
  },
  ...props,
};

interface MapperArgs extends RouterMapperArgs {
  methods: string[];
}

function createCommonRoute(_this: RouterMethods, routePath: string[], routes: RouteBody, key: RequestMethod, options: MayaJsRoute, parentRoute: Route): void {
  const current = routePath[0];

  if ((parentRoute?.path === "" || !parentRoute?.path) && current === "") {
    _this.routes[""][key] = options;
    return;
  }
  if (current === "" && routePath.length === 1) {
    routes[key] = options;
    return;
  }
  if (!routes?.[current]) routes[current] = { middlewares: [...(parentRoute.middlewares ?? []), ...(parentRoute.guards ?? [])] } as any;
  if (routes[current] && routePath.length === 1) {
    (routes[current] as RouteBody)[key] = options;
    return;
  }

  routePath.shift();
  return createCommonRoute(_this, routePath, routes[current] as RouteBody, key, options, parentRoute);
}

function routerMapper({ _this, path, controller, route }: RouterMapperArgs) {
  return ({ middlewares, methodName, path: routePath, requestMethod }: any) => {
    // Create callback function
    const callback = (args: any) => controller[methodName](args) as RouteCallback;

    // Create parent route
    const parentRoute = path === "" ? "/" : path;

    routePath = routePath.startsWith("/") ? routePath : `/${routePath}`;
    middlewares = [..._this.routes[""].middlewares, ..._this.middlewares, ...(route?.middlewares ?? []), ...(route?.guards ?? []), ...middlewares];

    // Add controller route to list
    _this.addRouteToList({ path: sanitizePath(parentRoute + routePath), middlewares, [requestMethod]: callback });
  };
}

function propsControllerMapper({ _this, path, controller, route, methods }: MapperArgs) {
  return (key: RequestMethod) => {
    if (methods.includes(key)) {
      let middlewares = controller?.middlewares?.[key] ?? [];
      let guards = controller?.guards?.[key] ?? [];

      middlewares = [..._this.routes[""].middlewares, ..._this.middlewares, ...(route?.middlewares ?? []), ...guards, ...middlewares];

      // Create callback function
      const callback = (args: any) => controller[key](args) as RouteCallback;

      const options = { middlewares, dependencies: [], method: key, regex: regex(path), callback, path };

      createCommonRoute(_this, path.split("/"), _this.routes[""], key, options, route);
    }
  };
}

function addRouteMethod({ _this, path, route, methods }: Omit<MapperArgs, "controller">) {
  return (key: RequestMethod) => {
    if (methods.includes(key) && route.hasOwnProperty("controller")) {
      throw new Error(`Property controller can't be used with ${key} method on route '${path}'`);
    }

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

    const options = {
      middlewares: [..._this.routes[""].middlewares, ...guards, ...middlewares],
      dependencies: [],
      method: key,
      regex: regex(path),
      callback,
      path,
    };

    createCommonRoute(_this, path.split("/"), _this.routes[""], key, options, route);
  };
}

function loadChildrenMapper({ _this, path, route, methods }: Omit<MapperArgs, "controller">) {
  return (key: "loadChildren"): void => {
    if (route.path !== "") {
      const createPath = (paths: string[], routes: any): void => {
        if (paths.length === 0) return;
        if (!routes[paths[0]]) {
          routes[paths[0]] = {};
        }
        routes = routes[paths[0]];
        paths.shift();
        return createPath(paths, routes);
      };

      createPath(route.path.split("/"), _this.routes);
    }
  };
}

router.addRouteToList = function (route, _module) {
  // Sanitize current route path
  const path = route.path.replace(/^\/+/g, "");

  // List of request method name
  const methods = ["GET", "POST", "PUT", "HEAD", "DELETE", "OPTIONS", "PATCH"];

  if (route.path === "") route?.middlewares?.map((item) => this.routes[""].middlewares.push(item));

  const mapperArgs = { _this: this, path, route, methods };

  if (route.controller && route.hasOwnProperty("controller")) {
    const dependencies = mapDependencies(this.dependencies, _module, route?.dependencies || (route.controller as any).dependencies);
    const controller = new route.controller(...dependencies);
    const controllerProps = Object.getOwnPropertyNames(Object.getPrototypeOf(controller)) as RequestMethod[];
    const routes = controller["routes"];

    routes.map(routerMapper({ ...mapperArgs, controller }));
    controllerProps.forEach(propsControllerMapper({ ...mapperArgs, controller }));
  }

  const routeKeys = Object.keys(route) as (RequestMethod | "loadChildren")[];
  const routeMethods = routeKeys.filter((key) => methods.includes(key.toUpperCase()));

  if (routeMethods.length > 0) (routeMethods as RequestMethod[]).forEach(addRouteMethod(mapperArgs));

  const loadChildren = routeKeys.filter((key) => "loadChildren" === key.toLowerCase());

  if (loadChildren.length > 0) (loadChildren as "loadChildren"[]).forEach(loadChildrenMapper(mapperArgs));
};

router.findRoute = function (path, method) {
  console.log(this.routes[""]);
  return path !== "" ? routeFinderFactory(path)(path.split("/"), this.routes[""], method, []) : this.routes[""][method];
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
    message = `${(error as Error)?.message || error}`;
  }

  return message;
};

router.visitedRoute = function (path, method) {
  return this?.visitedRoutes && this?.visitedRoutes[path] && this?.visitedRoutes[path][method] ? this?.visitedRoutes[path][method] : null;
};

router.mapper = function (parent = "", _module = null) {
  return (route) => {
    // Create parent route
    parent = parent.length > 0 ? sanitizePath(parent) : "";

    // Sanitize route path
    route.path = parent + sanitizePath(route.path);

    if (_module !== null && !_module?.path) _module.path = route.path;

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

    if (route) {
      // Add route to list
      this.addRouteToList(route, _module);
    }

    if (route?.children !== undefined && route?.loadChildren !== undefined) {
      logger.red(`Property 'loadChildren' can't be used with 'children' in route '${route.path}'`);
      throw new Error();
    }

    if (route?.controller !== undefined && route?.loadChildren !== undefined) {
      logger.red(`Property 'loadChildren' can't be used with 'controller' in route '${route.path}'`);
      throw new Error();
    }

    // Check if route has children
    if (route?.children && route?.children.length > 0) route.children.forEach(this.mapper(route.path, _module));

    // Load all children asynchronously
    if (route?.loadChildren) {
      route
        .loadChildren()
        .then(mapModules(this, _module ?? { path: route.path }))
        .catch((error) => console.log(error));
    }
  };
};

export default (app: RouterProps): RouterFunction => merge(app, router);
