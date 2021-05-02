import { MayaJsContext, MayaRouter, RouterContext, VisitedRoutes } from "../interface";
import { ResponseSender } from "../types";
import middleware from "./middleware";
import functions from "./functions";

export const props = {
  routes: {},
  routesWithParams: {},
  visitedRoutes: {},
  middlewares: [],
  context: {},
  dependencies: {},
};

const app: MayaRouter = {
  init: () => {},
  use: (middleware) => app,
  add: (routes) => {},
  headers: { "X-Powered-By": "MayaJS" },
  router: functions(props),
  ...props,
};

app.add = function (routes) {
  // Check if routes is an array
  if (!Array.isArray(routes)) return this.router.addRouteToList(routes);

  // Map routes and add each route to the list
  routes.map(this.router.mapper());
};

app.init = function () {
  // Destructure RouterProps
  const { routes, routesWithParams, visitedRoutes, middlewares, context, dependencies } = app;

  // Initialize mayajs router
  this.router = functions({ routes, routesWithParams, visitedRoutes, middlewares, context, dependencies });
};

app.use = function (middleware) {
  // Add middleware to the list
  if (middleware) this.router.middlewares.push(middleware);

  return this;
};

// Sends a reponse message and ending the request
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
    Object.keys(app.headers).map((key) => res.setHeader(key, app.headers[key]));

    // Create MayaJS params
    const params = (route as VisitedRoutes).params || { ...route.regex.exec(path)?.groups };

    // Create MayaJS context
    app.router.context = {
      ...context,
      params,
      setStatus(code: number) {
        res.status(code);
      },
    };

    // Create a factory method for executing current route
    const execute = async (context: MayaJsContext) => {
      app.router.context = context;
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
