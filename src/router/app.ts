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

// Sends a response message and ending the request
const send: ResponseSender = async (context: RouterContext) => {
  // Get method, path and res in context object
  const { method, path, res } = context;

  // Check if path exist in visited routes or in non-param routes
  const route = app.router.visitedRoute(path, method) || app.router.findRoute(path, method);

  if (!route) {
    // Route was not found. Send back an error message
    return res.send({ message: `${method}: '${path}' was not found!` }, 404);
  }

  try {
    Object.keys(app.headers).forEach((key) => res.setHeader(key, app.headers[key]));

    // Create MayaJS params
    const params = (route as VisitedRoutes).params || { ...route.regex.exec(path)?.groups };

    // Create MayaJS context
    app.router.context = { ...context, params };

    // Create a factory method for executing current route
    const execute = async (ctx: MayaJsContext) => {
      app.router.context = ctx;
      res.send(await app.router.executeRoute(path, route));
    };

    const middlewares = route.middlewares !== undefined ? route.middlewares : [];

    // Run middlewares before calling the main route callback
    middleware([...app.router.middlewares, ...middlewares], app.router.context, execute);
  } catch (error) {
    // Send error back to client
    res.send(error);
  }
};

// Export app instance and send function
export { app, send };
