import { MethodNames, RouteCallback, RouteMethod, RouterMethods, RouterProps, RouterFunction, MayaJSRouteParams } from "../interface";
import { mapDependencies, sanitizePath } from "../utils/helpers";
import merge from "../utils/merge";
import regex from "../utils/regex";
import { props } from "./router";

// Export default route object
const router: RouterMethods = {
  addRouteToList: (route, _module) => {},
  findRoute: (path, method) => null,
  executeRoute: (path, route) => Promise.resolve(),
  visitedRoute: (path, method) => null,
  ...props,
};

router.addRouteToList = function (route, _module) {
  // Sanitize current route path
  const path = route.path;

  // Check if path has params
  const hasParams = path.includes("/:");

  //  Check if path has a param and select the correct route list
  const list = !hasParams ? "routes" : "routesWithParams";

  // Initialize path if undefined
  if (!this[list][path]) this[list][path] = {} as any;

  // Set route to list with path as a key
  const setList = (key: MethodNames, options: MayaJSRouteParams) => (this[list][path][key] = options);

  // List of request method name
  const methods = ["GET", "POST", "PUT", "HEAD", "DELETE", "OPTIONS", "PATCH"];

  if (route.controller && route.hasOwnProperty("controller")) {
    const dependencies = mapDependencies(this.dependencies, _module, route?.dependencies || (route.controller as any).dependencies);
    const controller = new route.controller(...dependencies);
    const controllerProps = Object.getOwnPropertyNames(Object.getPrototypeOf(controller)) as MethodNames[];
    const routes = (controller as any)["routes"];

    routes.map(({ middlewares, methodName, path: routePath, requestMethod }: any) => {
      // Create callback function
      const callback = (args: any) => (controller as any)[methodName](args) as RouteCallback;

      // Create parent route
      const parent = path === "" ? "/" : path;

      // Add controller route to list
      this.addRouteToList({ path: sanitizePath(parent + routePath), middlewares, [requestMethod]: callback });
    });

    controllerProps.map((key: MethodNames) => {
      if (methods.includes(key)) {
        let middlewares = controller?.middlewares?.[key] ?? [];

        // Create callback function
        const callback = (args: any) => controller[key](args) as RouteCallback;

        // Add route to list
        setList(key, { middlewares, dependencies: [], method: key, regex: regex(path), callback });
      }
    });
  }

  if (!route?.controller) {
    (Object.keys(route) as MethodNames[]).map((key): void => {
      if (methods.includes(key) && route.hasOwnProperty("controller")) {
        throw new Error(`Property controller can't be used with ${key} method on route '${path}'`);
      }

      // Check if key is a method
      if (methods.includes(key) && !route.hasOwnProperty("controller")) {
        // Get current method
        const current = route[key] as RouteMethod;

        // Set default middlewares from route
        let middlewares = route?.middlewares ?? [];

        // Check if current method has middlewares
        if (current?.middlewares) {
          middlewares = [...middlewares, ...current.middlewares];
        }

        const routeCallback = (args: any) => (route[key] as RouteCallback)(args);

        // Create callback function
        const callback = current?.callback ?? routeCallback;

        // Add route to list
        setList(key, { middlewares, dependencies: [], method: key, regex: regex(path), callback });
      }
    });
  }
};

router.findRoute = function (path, method) {
  // Check if path exist on `routes`
  let route = this?.routes && this?.routes[path] ? this?.routes[path] : null;

  // Check if path exist on `routesWithParams`
  if (!route) {
    // Get keys from `routesWithParams` object
    const routeWithParamsKeys = Object.keys(this.routesWithParams);

    for (const key of routeWithParamsKeys) {
      // Get current route from key
      const current = this.routesWithParams[key];

      // Test if path will pass the route path regex pattern
      if (current[method].regex.test(path)) {
        route = current;
        break;
      }
    }
  }

  // Check if route method is same as the request
  return route ? route[method] : null;
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
      this.visitedRoutes[path][route.method] = { ...route, params: context.params, query: context.query, body: context.body };
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

export default (app: RouterProps): RouterFunction => merge(app, router as RouterMethods);
