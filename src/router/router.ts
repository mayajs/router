import { RouteMethod, RouterMethods, RouterProps, MayaJsRoute, RouteBody, Route, RouterMapperArgs, ModuleWithProviders } from "../interface";
import { routeFinderFactory, logger, mapDependencies, sanitizePath, dependencyMapper } from "../utils/helpers";
import { RequestMethod, RouteCallback, RouterFunction } from "../types";
import merge from "../utils/merge";
import regex from "../utils/regex";
import { props } from "./app";
import { declarationsMapper, mapModules } from "../utils/mapper";
import { CustomModule } from "../class";
import { DEPS } from "../utils/constants";

// Export default route object
const router: RouterMethods = {
  addRouteToList: (route, _module) => {
    return;
  },
  findRoute: (path, method) => null,
  executeRoute: (path, route) => Promise.resolve(),
  visitedRoute: (path, method) => null,
  mapper: (path, method) => (route) => {
    return;
  },
  moduleMapper: (parent) => (imported) => {
    return;
  },
  ...props,
};

interface MapperArgs extends RouterMapperArgs {
  methods: string[];
}

function createCommonRoute(
  _this: RouterMethods,
  routePath: string[],
  routeBody: RouteBody,
  key: RequestMethod,
  options: MayaJsRoute,
  parentRoute: Route
): void {
  const current = routePath[0];

  if ((parentRoute?.path === "" || !parentRoute?.path) && current === "") {
    _this.routes[""][key] = options;
    return;
  }
  if (current === "" && routePath.length === 1) {
    routeBody[key] = options;
    return;
  }
  if (!routeBody?.[current]) routeBody[current] = { middlewares: [...(parentRoute.middlewares ?? []), ...(parentRoute.guards ?? [])] } as any;
  if (routeBody[current] && routePath.length === 1) {
    (routeBody[current] as RouteBody)[key] = options;
    return;
  }

  routePath.shift();
  return createCommonRoute(_this, routePath, routeBody[current] as RouteBody, key, options, parentRoute);
}

function routerMapper({ _this, path, controller, route }: RouterMapperArgs) {
  return ({ middlewares, methodName, path: routePath, requestMethod }: any) => {
    // Create callback function
    const callback = (args: any) => controller[methodName](args) as RouteCallback;

    // Create parent route
    const parentRoute = path === "" ? "/" : path;

    routePath = routePath.startsWith("/") ? routePath : `/${routePath}`;
    const defaultMiddlewares = [..._this.routes[""].middlewares, ..._this.middlewares];
    middlewares = [...defaultMiddlewares, ...(route?.middlewares ?? []), ...(route?.guards ?? []), ...middlewares];

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
    if (current?.middlewares?.length) {
      middlewares = [...middlewares, ...current.middlewares];
    }

    const routeCallback = (args: any) => (route[key] as RouteCallback)(args);

    // Create callback function
    const callback = current?.callback ?? routeCallback;

    const options = {
      middlewares: [...guards, ...middlewares],
      dependencies: [],
      method: key,
      regex: regex(path),
      callback,
      path,
    };

    createCommonRoute(_this, path.split("/"), _this.routes[""], key, options, route);
  };
}

function loadChildrenMapper({ _this, route }: Omit<MapperArgs, "controller">) {
  return (): void => {
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
    const deps = Reflect.getMetadata(DEPS, route) || Reflect.getMetadata(DEPS, route.controller);
    const dependencies = mapDependencies(this.dependencies, _module, deps);
    const controller = new route.controller(...dependencies);
    const routes = controller["routes"];

    if (routes.length > 0) {
      routes.map(routerMapper({ ...mapperArgs, controller }));
    } else {
      const controllerProps = Object.getOwnPropertyNames(Object.getPrototypeOf(controller)) as RequestMethod[];
      controllerProps.forEach(propsControllerMapper({ ...mapperArgs, controller }));
    }
  }

  const routeKeys = Object.keys(route) as (RequestMethod | "loadChildren")[];
  const routeMethods = routeKeys.filter((key) => methods.includes(key.toUpperCase()));

  if (routeMethods.length > 0) (routeMethods as RequestMethod[]).forEach(addRouteMethod(mapperArgs));

  const loadChildren = routeKeys.filter((key) => "loadChildren" === key.toLowerCase());

  if (loadChildren.length > 0) (loadChildren as "loadChildren"[]).forEach(loadChildrenMapper(mapperArgs));
};

router.findRoute = function (path, method) {
  return path !== "" ? routeFinderFactory(path)(path.split("/"), this.routes[""], method, []) : this.routes[""][method];
};

router.executeRoute = async function (path, route) {
  const context = this.context;

  // Try to execute route callback
  const message = await route.callback(context);

  if (!this.visitedRoutes[path]) {
    // Initialize path for caching
    this.visitedRoutes[path] = {} as any;
  }

  if (!this.visitedRoutes[path][route.method]) {
    // Remove req and res object from context
    const { req, res, headers, setStatus, ...rest } = context;
    // Cache path route if not on visited routes
    this.visitedRoutes[path][route.method] = { ...route, ...rest };
  }

  return message;
};

router.visitedRoute = function (path, method) {
  return this.visitedRoutes?.[path]?.[method] ?? null;
};

router.moduleMapper = function moduleMapper(parent: CustomModule) {
  return (imported: ModuleWithProviders) => {
    const moduleProvider = imported.module;
    const { dependencies = [], providers = [], imports = [] } = imported;

    if (parent) providers.forEach((provider) => parent.providers.push(provider));

    const deps = Reflect.getMetadata(DEPS, moduleProvider) || dependencies;
    const args: any[] = parent ? dependencyMapper(parent, deps) : deps;
    const _module = new moduleProvider(...args);

    if (parent) _module.parent = parent;
    _module.providers = providers;
    _module.imports = imports;
    _module.invoke(parent);
    _module.imports.forEach(moduleMapper(_module));
  };
};

router.mapper = function (parent = "", _module = null) {
  return (route) => {
    // Create an object from route
    const routeObj = { ...route };

    // Create parent route
    parent = parent.length > 0 ? sanitizePath(parent) : "";

    // Sanitize route path
    routeObj.path = parent + sanitizePath(route.path);

    if (_module !== null && !_module?.path) _module.path = routeObj.path;

    const controllerName = routeObj?.controller?.name;
    let isDeclared = true;

    // Check if controller is declared on a module
    if (controllerName && _module !== null) isDeclared = declarationsMapper(_module, controllerName);

    // Throw error if controller is not declared in a module
    if (!isDeclared) {
      const moduleName = _module?.constructor.name;
      logger.red(`${controllerName} is not declared in ${moduleName}`);
      throw new Error();
    }

    if (routeObj) {
      // Add route to list
      this.addRouteToList(routeObj, _module);
    }

    if (routeObj?.children !== undefined && routeObj?.loadChildren !== undefined) {
      logger.red(`Property 'loadChildren' can't be used with 'children' in route '${routeObj.path}'`);
      throw new Error();
    }

    if (routeObj?.controller !== undefined && routeObj?.loadChildren !== undefined) {
      logger.red(`Property 'loadChildren' can't be used with 'controller' in route '${routeObj.path}'`);
      throw new Error();
    }

    // Check if route has children
    if (routeObj?.children && routeObj?.children.length > 0) routeObj.children.forEach(this.mapper(routeObj.path, _module));

    // Load all children asynchronously
    if (routeObj?.loadChildren) {
      routeObj
        .loadChildren()
        .then(mapModules(this, routeObj.path, _module ?? { path: routeObj.path }))
        .catch((error) => console.log(error));
    }
  };
};

export default (properties: RouterProps): RouterFunction => merge(properties, router);
