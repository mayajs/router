import response from "./router/response";
import RequestHelper from "./router/request";
import bodyParser from "./router/body_parser";
import invoker from "./router/middleware";
import Url from "./router/url";
import http from "http";
import cors from "./router/cors";

namespace Router {
  /**
   * A representation of additional methods for request object
   */
  export interface RequestObjectProps {
    body?: any;
    params?: { [key: string]: string };
    query?: { [key: string]: string };
  }

  /**
   * A representation of additional methods for response object
   */
  export interface ResponseObjectProps {
    send(args: any): void;
    json(json: object): void;
    html(html: string): void;
  }

  /**
   * An object representing NodeJS Server Response with additonal
   * methods added by the @mayajs/router api
   */
  export interface ResponseObject extends http.ServerResponse, ResponseObjectProps {}

  /**
   * An object representing NodeJS Incoming Message with additonal
   * methods added by the @mayajs/router api
   */
  export interface RequestObject extends http.IncomingMessage, RequestObjectProps {}

  /**
   * A MayaJS object containing a request and response object.
   * Also contains optional variables that are extracted in request and response object.
   */
  export interface MayaJSContext {
    req: RequestObject;
    res: ResponseObject;
    body?: any;
    params?: any;
    query?: any;
  }

  /**
   * An Object represents all CORS options
   */
  export interface CorsOptions {
    origin?: string;
    methods?: HttpMethods[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  }

  /**
   * An Object represents all MayaJS Router options
   */
  export interface MayaJSRouterOptions {
    cors?: Router.MayaJSMiddleware | Router.ExpressMiddleware | Router.CorsOptions;
  }

  /**
   * A function invoking the next middleware
   */
  export type NextFunction = (args?: any) => void;

  /**
   * A function that accepts a 'context' object that contains all the request information
   * and 'next' function that will execute the next middleware on the list
   */
  export type CallbackFunction = (obj: MayaJSContext, next?: NextFunction) => void;

  /**
   * A object params that handles request, response and error
   */
  export type MiddlewareParams = { req: http.IncomingMessage; res: http.ServerResponse; error?: any };

  /**
   * A function that acts as middle man to any route or another middleware function.
   * This function will run before any route will be initialized and call the next middleware if there is any.
   */
  export type MayaJSMiddleware = (obj: MiddlewareParams, next: NextFunction) => void;

  /**
   * A representation of ExpressJS middleware function.
   */
  export type ExpressMiddleware = (req: http.IncomingMessage, res: http.ServerResponse, next: NextFunction, error: any) => void;

  /**
   * A list of http methods in lower case
   */
  export type RequestMethod = "get" | "head" | "post" | "put" | "patch" | "delete" | "options";

  /**
   * A list of http methods in upper case
   */
  export type HttpMethods = "GET" | "HEAD" | "PUT" | "PATCH" | "POST" | "DELETE" | "OPTIONS";

  /**
   * An object to represent a route method function
   */
  export type RequestMethodFunction = { [method: string]: CallbackFunction };

  /**
   * A MayaJS route object
   */
  export type Route = { [url: string]: RequestMethodFunction };

  /**
   * A list of MayaJS Route
   */
  export type Routes = Route[];
}

/**
 * A simple and lightweight routing library for Node.
 *
 * ```ts
 * const router = new Router();
 * ```
 * See {@link https://github.com/mayajs/router/blob/master/README.md API documentation} for more info
 */
class Router {
  private url: Url;
  private request: RequestHelper;
  private middlewares: (Router.MayaJSMiddleware | Router.ExpressMiddleware)[];
  private corsHandler: Router.ExpressMiddleware;
  private errorHandler: (res: Router.ResponseObject, error: any) => void;

  /**
   * Create an instance of MayaJS Router class responsible for handling incoming http request. Serves as mapper of routes that are added using this router.
   * Allows third party package to be injected and use as middlewares.
   *
   * ```ts
   * import Router from "@mayajs/router";
   * import http from "http";
   *
   * const PORT = process.env.PORT || 3000; // This is not required
   * const router = new Router();
   *
   * router.get("path", ({ res, req, params, query, body }) => {
   *   res.send({ message: "Hello, World" });
   * });
   *
   * // Pass the router and initialize it for used
   * http.createServer(router.init).listen(PORT, () => {
   *   console.log("Server listening on port", PORT, "...");
   * });
   *
   * ```
   *
   * See {@link https://github.com/mayajs/router/blob/master/README.md API documentation} for more info
   */
  constructor(options?: Router.MayaJSRouterOptions, private routes: Router.Routes = []) {
    this.url = new Url();
    this.request = new RequestHelper();
    this.middlewares = [];
    this.corsHandler = this.setCorsMiddleware(options);
    this.errorHandler = (res: Router.ResponseObject, error: any) => {
      console.log(error);
      res.json({ status: "ERROR", message: "Internal Server Error" });
    };
  }

  /**
   * Emit a function correspond with current incoming request after all the middlewares are
   * finished executing.
   *
   * @return A function that can be consume by http.createServer
   */
  get init() {
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
      // Parse query string if there is any
      const query = req.url ? this.url.queryString(req) : "";

      // Find the url path key on the router list
      const { index, found, params, key } = this.url.find(this.routes, req.url?.replace(query, "") ?? "");

      // Checks if path is fount
      if (!found) {
        throw new Error("Request path doesn't exist!");
      }

      // Push a finalize middleware for the requested route
      this.middlewares.push(this.finalize({ index, query, params, key }));

      // Invoke all middlewares
      invoker(req, res, [bodyParser, this.corsHandler, ...this.middlewares]);
    };
  }

  /**
   * Catch all uncaugth error generated from the server
   *
   * @param callback A function that will be call when an error occured
   * @return Router instance
   */
  onError(callback: (res: http.ServerResponse, error: any) => void): Router {
    this.errorHandler = callback;
    return this;
  }

  /**
   * Adds a route in the list
   *
   * @param method A type of http method in lower case
   * @param url A url string
   * @param fn A function that will be call when this route is executed
   * @return Router instance
   */
  add(method: Router.RequestMethod, url: string, fn: Router.CallbackFunction): Router {
    // Sanitize url
    const requestPath = this.removePrefix(url ?? "");

    // Find the index of the url from the list of routes
    const { index, found } = this.url.find(this.routes, requestPath);

    // CHecks if the route is found
    const isFound = index >= 0 && found;

    isFound
      ? // Add method to existing object in routes array
        (this.routes[index][url] = { [method]: fn })
      : // Add method new object in routes array
        this.routes.push({ [url]: { [method]: fn } });

    return this;
  }

  /**
   * Accepts a function as a middleware to be a executed when a request is coming.
   *
   * @param middleware A function that will be execute before the routes
   * @return Router instance
   */
  use(middleware: Router.MayaJSMiddleware | Router.ExpressMiddleware | (Router.MayaJSMiddleware | Router.ExpressMiddleware)[]): this {
    Array.isArray(middleware)
      ? // Add an array of middleware in the list
        this.middlewares.push(...middleware)
      : // Add a single middleware in the list
        this.middlewares.push(middleware);

    return this;
  }

  /**
   * Handle GET request
   *
   * @param path Request path
   * @param method A callback function
   * @return Router instance
   *
   * ```ts
   * router.get("name-of-your-route", ({ res, req, params, query, body }) => {
   *   // Do your thing here
   * });
   * ```
   * See {@link https://github.com/mayajs/router/blob/master/README.md API documentation} for more info
   */
  get(path: string, fn: Router.CallbackFunction): Router {
    return this.add("get", path, fn);
  }

  /**
   * Handle POST request
   *
   * @param path Request path
   * @param method A callback function
   * @return Router instance
   *
   * ```ts
   * router.post("name-of-your-route", ({ res, req, params, query, body }) => {
   *   // Do your thing here
   * });
   * ```
   * See {@link https://github.com/mayajs/router/blob/master/README.md API documentation} for more info
   */
  post(path: string, fn: Router.CallbackFunction): Router {
    return this.add("post", path, fn);
  }

  /**
   * Handle PUT request
   *
   * @param path Request path
   * @param method A callback function
   * @return Router instance
   *
   * ```ts
   * router.put("name-of-your-route", ({ res, req, params, query, body }) => {
   *   // Do your thing here
   * });
   * ```
   * See {@link https://github.com/mayajs/router/blob/master/README.md API documentation} for more info
   */
  put(path: string, fn: Router.CallbackFunction): Router {
    return this.add("put", path, fn);
  }

  /**
   * Handle PATCH request
   *
   * @param path Request path
   * @param method A callback function
   * @return Router instance
   *
   * ```ts
   * router.patch("name-of-your-route", ({ res, req, params, query, body }) => {
   *   // Do your thing here
   * });
   * ```
   * See {@link https://github.com/mayajs/router/blob/master/README.md API documentation} for more info
   */
  patch(path: string, fn: Router.CallbackFunction): Router {
    return this.add("patch", path, fn);
  }

  /**
   * Handle DELETE request
   *
   * @param path Request path
   * @param method A callback function
   * @return Router instance
   *
   * ```ts
   * router.delete("name-of-your-route", ({ res, req, params, query, body }) => {
   *   // Do your thing here
   * });
   * ```
   * See {@link https://github.com/mayajs/router/blob/master/README.md API documentation} for more info
   */
  delete(path: string, fn: Router.CallbackFunction): Router {
    return this.add("delete", path, fn);
  }

  /**
   * Handle OPTIONS request
   *
   * @param path Request path
   * @param method A callback function
   * @return Router instance
   *
   * ```ts
   * router.options(({ res, req, params, query, body }) => {
   *   // Do your thing here
   * });
   * ```
   * See {@link https://github.com/mayajs/router/blob/master/README.md API documentation} for more info
   */
  options(path: string, fn: Router.CallbackFunction): Router {
    return this.add("options", path, fn);
  }

  /**
   * Build a final middleware
   *
   * @param Object that represent the current request
   */
  private finalize({ index, query, params, key }: { index: number; query: string; params: RegExpExecArray | null; key: string }) {
    return ({ req, res, error: body }: Router.MiddlewareParams) => {
      // Build request properties
      const reqProps = this.request.props(params, body, query);

      // Build a MayaJS context object from the current request and reponse
      const context = this.createContextObject(this.request.obj(req, reqProps), response(res));

      // GEt the method type
      const method = req.method?.toLocaleLowerCase() as Router.RequestMethod;

      try {
        // Call the route
        this.requestHandler(index, method, key, context);
      } catch (error) {
        // Handles uncaugth errors
        this.errorHandler(response(res), error);
      }
    };
  }

  /**
   * Execute a route from the given params
   *
   * @param index Position of the requested route from the list
   * @param method Method of the function
   * @param url The request path
   * @param context MayaJS context object
   */
  private requestHandler(index: number, method: Router.RequestMethod, url: string, context: Router.MayaJSContext): void {
    // Get router key from list
    const routeMethodKeys = Object.keys(this.routes[index][url]);

    // Checks if method exist on the route index
    const hasMethod = routeMethodKeys.includes(method);

    if (!hasMethod) {
      throw new Error(`Request ${method.toLocaleUpperCase()} method on path '/${url}' not found!`);
    }

    // Execute route method
    this.routes[index][url][method](context);
  }

  /**
   * Remove first charatcer from the string
   *
   * @param url Request path string
   * @return A url without a leading slash `\`
   */
  private removePrefix(url: string) {
    return url.substring(1);
  }

  /**
   * Build a context based on the request and reponse
   *
   * @param req Request object from MayaJS
   * @param res Response object from MayaJS
   * @return An object that will be used by the end user
   */
  private createContextObject(req: Router.RequestObject, res: Router.ResponseObject) {
    return { req, res, params: req.params, body: req.body, query: req.query };
  }

  private setCorsMiddleware(options?: Router.MayaJSRouterOptions) {
    if (typeof options?.cors === "object") {
      return cors(options?.cors as Router.CorsOptions);
    }
    return options && options.cors ? (options.cors as Router.ExpressMiddleware) : cors();
  }
}

export = Router;
