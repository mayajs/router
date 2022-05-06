import { MayaJsRoute, MayaRouter, MethodRoute, Route, RouterContext, RouterProps, Type, VisitedRoutes } from "../interface";
import { CONTROLLER_ROUTES, DEPS, MODULE, MODULE_BOOTSTRAP } from "../utils/constants";
import { mapDependencies, pathUrl } from "../utils/helpers";
import { RequestMethod, RouteCallback } from "../types";
import { AppRoot, Module } from "../class";
import middleware from "./middleware";
import regex from "../utils/regex";
import functions from "./router";
import { websocket, wsDisconnect } from "./websocket";

export const props: RouterProps = {
  root: new AppRoot(),
  routes: { "": { middlewares: [] } as any },
  visitedRoutes: {},
  middlewares: [],
  context: {} as any,
  dependencies: {},
};

const app: MayaRouter = {
  init: () => null,
  use: (_plugin) => app,
  add: (_routes) => null,
  bootstrap: (_app) => null,
  headers: { "X-Powered-By": "MayaJS" },
  router: functions(props),
  ...props,
};

app.bootstrap = function (customModule) {
  const _module = customModule as any;
  const isModule = Reflect.getMetadata(MODULE, customModule) || _module[MODULE];
  if (!isModule) throw new Error(`${customModule.name} is not a valid custom module.`);

  const isBootstrap = Reflect.getMetadata(MODULE_BOOTSTRAP, customModule) || _module[MODULE_BOOTSTRAP];
  if (!isBootstrap) throw new Error(`Failed to bootstrap ${customModule.name} module.`);

  _module.imports.forEach(this.router.moduleMapper(_module));
  app.router.root = _module;
};

app.add = function (routes) {
  // Check if routes is an array
  if (!Array.isArray(routes)) return this.router.addRouteToList(routes);

  // Map routes and add each route to the list
  routes.forEach(this.router.mapper());
};

app.init = function () {
  // Initialize mayajs router
  this.router = functions({ ...app });

  websocket();

  process.on("SIGKILL", wsDisconnect).on("SIGINT", wsDisconnect).on("exit", wsDisconnect).on("disconnect", wsDisconnect);
};

app.use = function (plugin) {
  // Add middleware to the list
  if (plugin) this.router.routes[""].middlewares.push(plugin);

  return this;
};

/**
 * A function that will be called when a mapping all controller routes.
 *
 * @param _module - The current module.
 * @param options - The options that will be used to build a controller route.
 * @returns A params and controller route.
 */
function controllerRouteBuilder(
  _module: Module,
  options: { path: string; controller: Type<any>; method: RequestMethod }
): { params: { [x: string]: string }; route?: MayaJsRoute } {
  const deps = Reflect.getMetadata(DEPS, options.controller) || options.controller.dependencies;
  const routes = Reflect.getMetadata(CONTROLLER_ROUTES, options.controller) as MethodRoute[];
  const dependencies = mapDependencies(app.router.dependencies, _module, deps);
  const controller = new options.controller(...dependencies);
  let params = {};
  let selectedRoute: MayaJsRoute | undefined;
  if (routes.length > 0) {
    const routesBody: MayaJsRoute[] = routes.map(({ methodName, path, middlewares, requestMethod }: MethodRoute): MayaJsRoute => {
      const callback = (args: any) => controller[methodName as RequestMethod](args) as RouteCallback;
      return { middlewares, dependencies: [], method: requestMethod, regex: regex(path), callback, path };
    });
      const hasMatchingMethod = options.method.toLocaleLowerCase() === route.method.toLocaleLowerCase();
      if (!hasMatchingMethod) return false;
      const routePath = pathUrl(route.path);
      const pathPattern = regex(routePath, true);
      const matched = pathPattern.exec(options.path);
    });
  }

}

/**
 * A function that will be called when a mapping all routes.
 *
 * @param options - The options that will be used to map the routes.
 * @param callback - The callback that will be called when a route is matched.
 * @returns A function that will be called when a mapping all routes.
 */
function routesMapper(
  options: { path: string; context: RouterContext; method: RequestMethod },
  callback: (options: { params: { [x: string]: string }; route?: MayaJsRoute }) => boolean
): (item: Route) => boolean | undefined {
  // Extract method, path and context from the options
  const { method, path, context } = options;

  // Return a function that will be called when the route is found
  return (item: Route) => {
    // Create a route path
    const routePath = pathUrl(item.path);

    // Create a route regex pattern
    const pathRegex = regex(routePath);

    // Checked if the route path matches the current path
    const matched = pathRegex.exec("/" + path);

    // Check `path` if does not match and immediately exit
    if (!matched) return false;

    // Check `path` if matches and add params to the current context
    if (matched.groups) context.params = { ...context.params, ...matched.groups };

    // Check if the route is a controller route
    if (item?.controller) {
      // Create a build options for controller route builder
      const buildOptions = { controller: item?.controller, path: ("/" + path).replace(pathRegex, ""), method };

      // Build the controller route
      const controllerRoute = controllerRouteBuilder(app.router.root, buildOptions);

      // Return a callback with the controller route
      return callback(controllerRoute);
    }
  };
}

/**
 * A function that manage an incoming request.
 *
 * @param context - The current router context.
 * @returns A promise that will be resolved when the router is ready.
 */
async function send(context: RouterContext): Promise<void> {
  // Get method, path and res in context object
  const { method, path, res } = context;

  // Create a list of routes that will be used to match the current path
  try {
    // Check if path exist in visited routes
    let selectedRoute: MayaJsRoute | null = app.router.visitedRoutes?.[path]?.[method] ?? null;

    // Check if selected route is not null
    if (selectedRoute) {
      // If selected route is not null, set the selected route params to the context params
      context.params = { ...context.params, ...(selectedRoute as VisitedRoutes).params };
    } else {
      // If selected route is null, map all routes
      app.router.root.routes.some(
        // Create a mapper function that will be called when mapping routes
        routesMapper({ method, path, context }, (result) => {
          // Check if a route was not found and return false
          if (!result.route) return false;

          // Set the selected route when route is found
          selectedRoute = result.route;

          // Add params to the current context
          context.params = { ...context.params, ...result.params };

          // Return true to stop the loop
          return true;
        })
      );
    }

    // Set headers to the response
    Object.keys(app.headers).forEach((key) => res.setHeader(key, app.headers[key]));

    // Create router context
    app.router.context = { ...context };

    // Set route middlewares
    const middlewares = selectedRoute?.middlewares !== undefined ? selectedRoute.middlewares : [];

    // Create a factory method for executing current route
    const execute = async (ctx: RouterContext) => {
      // Set the current router context
      app.router.context = ctx;

      // Execute selected route
      if (selectedRoute) res.send(await app.router.executeRoute(path, selectedRoute));
    };

    // Run middlewares before calling the main route callback
    return middleware([...app.router.middlewares, ...middlewares], app.router.context, execute);
  } catch (error: any) {
    // Send error to the client
    res.send({ message: error?.message ?? error }, 500);
  }
}

// Export app instance and send function
export { app, send };
