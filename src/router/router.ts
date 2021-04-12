import { MayaRouter, VisitedRoutes } from "../interface";
import { RequestMethod, ResponseSender, RouterFunction, RouterMapper } from "../types";
import routeMapper from "../utils/mapper";
import middleware from "./middleware";
import functions from "./functions";

export const props = {
  routes: {},
  routesWithParams: {},
  visitedRoutes: {},
  middlewares: [],
  context: {},
  dependencies: {
    RoutesMapper: routeMapper,
  },
};

const app: MayaRouter = { init: () => {}, use: (middleware) => app, add: (routes) => {}, headers: { "X-Powered-By": "MayaJS" }, ...props };

let router: RouterFunction;
let mapRoutes: RouterMapper;

app.add = function (routes) {
  // Check if routes is an array
  if (!Array.isArray(routes)) return router.addRouteToList(routes);

  // Map routes and add each route to the list
  routes.map(mapRoutes());
};

app.init = function () {
  const { routes, routesWithParams, visitedRoutes, middlewares, context, dependencies } = app;

  // Initialize mayajs router
  router = functions({ routes, routesWithParams, visitedRoutes, middlewares, context, dependencies });
  mapRoutes = routeMapper(router, app);
};

app.use = function (middleware) {
  // Add middleware to the list
  if (middleware) {
    router.middlewares.push(middleware);
  }
  return this;
};

// Sends a reponse message and ending the request
const send: ResponseSender = async (req, res, parsedUrl) => {
  // Get current method
  const method = req.method as RequestMethod;

  // Get path name
  let routePath = parsedUrl.pathname;

  // Remove "/" on the end of the route path
  if (routePath.endsWith("/")) routePath = routePath.slice(0, -1);

  // Check if path exist in visited routes or in non-param routes
  const route = router.visitedRoute(routePath, method) || router.findRoute(routePath, method);

  if (!route) {
    // Route was not found. Send back an error message
    return res.send({ message: `${method}: '${routePath}' was not found!` }, 404);
  }

  try {
    Object.keys(app.headers).map((key) => res.setHeader(key, app.headers[key]));

    // Create MayaJS params
    const params = (route as VisitedRoutes).params || { ...route.regex.exec(routePath)?.groups };

    // Create MayaJS context
    router.context = { req, res, query: { ...parsedUrl.query }, params, body: req?.body };

    // Create a factory method for executing current route
    const execute = async () => res.send(await router.executeRoute(routePath, route));

    const middlewares = route.middlewares !== undefined ? route.middlewares : [];

    // Run middlewares before calling the main route callback
    middleware([...router.middlewares, ...middlewares], router.context, execute);
  } catch (error) {
    // Send error back to client
    res.send(error);
  }
};

// Create mayajs router by merging the handler and functions
export { app, send };
