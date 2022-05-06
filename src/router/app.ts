import { MayaJsContext, MayaRouter, RouterContext, RouterProps, VisitedRoutes } from "../interface";
import { ResponseSender } from "../types";
import middleware from "./middleware";
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

function controllerRouteBuilder(
  _module: Module,
  options: { path: string; controller: Type<any>; method: RequestMethod }
): { params: { [x: string]: string }; route?: MayaJsRoute } {
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
  const { method, path, context } = options;
  return (item: Route) => {
    const routePath = pathUrl(item.path);
    const pathRegex = regex(routePath);
    const matched = pathRegex.exec("/" + path);
    if (!matched) return false;
    if (matched.groups) context.params = { ...context.params, ...matched.groups };
    if (item?.controller) {
      const buildOptions = { controller: item?.controller, path: ("/" + path).replace(pathRegex, ""), method };
      const controllerRoute = controllerRouteBuilder(app.router.root, buildOptions);
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

  try {
  // Check if path exist in visited routes or in non-param routes
    let selectedRoute: MayaJsRoute | null = app.router.visitedRoutes?.[path]?.[method] ?? null;

    if (selectedRoute) {
      context.params = { ...context.params, ...(selectedRoute as VisitedRoutes).params };
    } else {
      app.router.root.routes.some(
        routesMapper({ method, path, context }, (result) => {
          if (!result.route) return false;
          selectedRoute = result.route;
          context.params = { ...context.params, ...result.params };
          return true;
        })
      );
    }

    // Set headers to the response
    Object.keys(app.headers).forEach((key) => res.setHeader(key, app.headers[key]));

    app.router.context = { ...context };

    const middlewares = selectedRoute?.middlewares !== undefined ? selectedRoute.middlewares : [];

    // Create a factory method for executing current route
    const execute = async (ctx: RouterContext) => {
      app.router.context = ctx;
      if (selectedRoute) res.send(await app.router.executeRoute(path, selectedRoute));
    };

    // Run middlewares before calling the main route callback
    return middleware([...app.router.middlewares, ...middlewares], app.router.context, execute);
  } catch (error: any) {
    res.send({ message: error?.message ?? error }, 500);
  }
}

// Export app instance and send function
export { app, send };
