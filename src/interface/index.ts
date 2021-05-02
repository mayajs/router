import { CustomModule, Services } from "../class";
import http, { IncomingHttpHeaders } from "http";
import {
  Callback,
  RequestMethod,
  ModuleCustomType,
  ModuleProviders,
  ModuleImports,
  Middlewares,
  ControllerType,
  RouteCallback,
  RouterMapper,
  RouterFunction,
} from "../types";

export interface RouterFunctions {
  init: () => void;
  /**
   * A function that accept a middleware.
   *
   *   MayaJS Middleware
   * ```
   * const middleware = (options, next) => {
   *   // Do something here
   *   next();
   * };
   * ```
   * Other Middlewares i.e. Express
   * ```
   * const middleware = (req, res, next) => {
   *   // Do something here
   *   next();
   * };
   *
   * app.use(middleware);
   *
   * // Calling a middleware factory
   * app.use(middleware());
   *
   * // Using 'body-parser' as middleware
   * app.use(bodyParser.json());
   * ```
   * @param middleware Middlewares are functions that can be executed before calling the main route.
   */
  use: (middleware: Middlewares) => MayaRouter;
  /**
   * A function that adds the path for a route and reference the routes define to MayaJs route list.
   * This routes callback function will be executed everytime an incoming request has the same path or match its regex pattern.
   *
   * ```
   * app.add([
   * {
   *   // Route name or path name
   *   path: "path-name",
   *
   *   // Route specific middlewares
   *   middlewares: [],
   *
   *   // A route method definition
   *   GET: ({ req, body, file, params, query }) => {
   *
   *      // Response value
   *      return "Hello, World";
   *   },
   *
   *   // A method object that has callbacka and middlewares
   *   POST: {
   *
   *    // Method specific middlewares
   *    middlewares: [middleware],
   *
   *    // Method callback function
   *    callback: ({ req, body, params, query }) => {
   *      return "Hello, World";
   *    },
   *   },
   * }
   * ]);
   * ```
   *
   * @param routes A list of routes
   */
  add: (routes: MayaJsRoute[]) => void;
  headers: { [x: string]: string };
}

export type MayaJsRouter = ((req: any, res: any) => void) & RouterFunctions;
export type RouterDependencies = { [x: string]: Services };

export interface RouterHelperMethod {
  addRouteToList: (route: MayaJsRoute, _module?: CustomModule | null) => void;
  findRoute: (path: string, method: RequestMethod) => MayaJSRouteParams | null;
  executeRoute: (path: string, route: MayaJSRouteParams) => Promise<any>;
  visitedRoute: (path: string, method: RequestMethod) => VisitedRoutes | null;
  mapper: RouterMapper;
}

export interface RouterProps {
  routes: MayaJSRoutes<MayaJSRouteParams>;
  routesWithParams: MayaJSRoutes<MayaJSRouteParams>;
  visitedRoutes: MayaJSRoutes<VisitedRoutes>;
  middlewares: Middlewares[];
  context: any;
  dependencies: RouterDependencies;
}

export interface RouterMethods extends RouterHelperMethod, RouterProps {}

export interface MayaRouter extends RouterFunctions, RouterProps {
  router: RouterFunction;
}

export interface QueryParams {
  query: { [x: string]: string | string[] };
  params: { [x: string]: string };
  body: any;
  file: any;
}

export interface MiddlewareContext {
  res: MayaJsResponse;
  req: MayaJsRequest;
  error?: any;
}

export interface MayaJsContext extends MiddlewareContext, QueryParams {}

export interface RouterContext extends MayaJsContext {
  path: string;
  headers: IncomingHttpHeaders;
  method: RequestMethod;
}

export interface Route {
  /**
   * A list of dependencies for a controller
   */
  dependencies?: any[];
  /**
   * An array of MayaJS or other third party middlewares. These middlewares are called before the callback function
   *
   * ```
   * {
   *    middlewares: [middleware1, middleware2],
   * }
   * ```
   */
  middlewares?: Middlewares[];
}

/**
 * Type for what object is instances of
 */
export interface Type<T> extends Function {
  new (...args: any[]): T;
}

export interface ModuleWithProviders extends ModuleWithProvidersProps {
  module: ModuleCustomType;
}

export interface ModuleWithProvidersProps {
  providers: ModuleProviders;
  dependencies?: (Type<Services> | Function)[];
  imports?: ModuleImports[];
}

export interface MayaJsRoute extends Route, Partial<RouteMethodCallbacks> {
  /**
   * A name for a route endpoint
   */
  path: string;
  /**
   * A class for define a route controller
   */
  controller?: ControllerType;
  /**
   * A list of child routes that inherit the path of its parent
   */
  children?: MayaJsRoute[];
  /**
   * A list of guards
   */
  guards?: Middlewares[];
  /**
   * Lazy load a module
   */
  loadChildren?: () => Promise<ModuleCustomType>;
}

export interface MayaJSRouteParams extends Route {
  regex: RegExp;
  callback: RouteCallback;
  method: RequestMethod;
}

export interface MayaJSRoutes<T> {
  [x: string]: {
    [K in RequestMethod]: T;
  };
}

export interface VisitedRoutes extends MayaJSRouteParams, QueryParams {}

/**
 * A representation of additional methods for response object
 */
export interface ResponseObjectProps {
  send(args: any, statusCode?: number): void;
  json(json: object, statusCode?: number): void;
  html(html: string, statusCode?: number): void;
  status(code?: number): ResponseObjectProps;
}

/**
 * An object representing NodeJS Server Response with additonal
 * methods added by the @mayajs/router api
 */
export interface MayaJsResponse extends http.ServerResponse, ResponseObjectProps {}

/**
 * An object representing NodeJS Incoming Message with additonal
 * methods added by the @mayajs/router api
 */
export interface MayaJsRequest extends http.IncomingMessage, QueryParams {
  body: any;
  file: any;
}

/**
 *  A record of method name and its callback functions
 * */
export type RouteMethodCallbacks = {
  /**
   * A function that will be executed once the 'path-name' is the same with the request path
   *
   * ```
   * {
   *   GET: ({ req, body, params, query }) => {
   *       return 'Hello, world'; // You can also return a JSON object
   *   }
   * }
   * ```
   */
  [P in RequestMethod]: RouteCallback | RouteMethod;
};

export type RouteMethod = {
  middlewares?: Middlewares[];
  callback: RouteCallback;
};

export interface MethodRoute {
  /**
   * Route name
   */
  path: string;
  /**
   * HTTP method
   */
  requestMethod: RequestMethod;
  /**
   *  Method name within our class responsible for this route
   */
  methodName: string;
  /**
   * List of middlewares
   */
  middlewares: Callback[];
}

export interface ModuleProperty {
  bootstrap?: Array<Type<any>>;
  declarations?: Array<Type<any>>;
  imports?: Array<Type<any>>;
  exports?: Array<Type<any>>;
}

export interface ModelList {
  name: string;
  path: string;
}

export interface MayaJSModule extends Partial<ModuleProperty> {
  new (): {};
}

export interface RoutesOptions {
  path: string;
  canActivate?: Type<any>;
  canActivateChild?: Type<any>;
  controller?: Type<any>;
  children?: RoutesOptions[];
}

export interface ModelDictionary<T> {
  [k: string]: T;
}

export interface DecoratorMethodOptions {
  /**
   * Method route path
   */
  path?: string;
  /**
   * List of middlewares
   */
  middlewares?: Callback[];
}

/**
 * A representation of additional methods for response object
 */
export interface ResponseObjectProps {
  send(args: any, statusCode?: number): void;
  json(json: object, statusCode?: number): void;
  html(html: string, statusCode?: number): void;
}
