import { MayaJsRouter, Route } from "./interface";
import { ExpressJsMiddleware, MayaJsMiddleware, Middlewares } from "./types";
import { CustomModule } from "./class";
import app from "./router";

export interface ExpressMiddlewares extends ExpressJsMiddleware {}
export interface MayaMiddlewares extends MayaJsMiddleware {}
export * from "./interface";
export * from "./types";
export * from "./class";
export * from "./utils/constants";

/**
 * A Nodejs library for managing routes. MayaJs use a declarative way of defining routes.
 * It also cache visited routes for faster execution of route callback.
 *
 * ```
 * import maya from "@mayajs/router";
 * import http from "http";
 *
 * const app = mayajs();
 *
 * app.add([
 *   {
 *    path: "hello",
 *    GET: ({ req, body, params, query }) => {
 *       return 'Hello, World!';
 *     },
 *   },
 * ]);
 *
 * http.createServer(app).listen(PORT, () => {
 *  console.log(`Server listening on port ${PORT}.`);
 * });
 * ```
 *
 * @return MayaJsRouter
 */
function maya(): MayaJsRouter {
  // Initialize MayaJs router
  app.init();

  // Return MayaJs router
  return app;
}

const use = (plugin: Middlewares) => app.use(plugin);

export class RouterModule extends CustomModule {
  invoke(parent: ParentModule) {
    const isRoot = Reflect.getMetadata(ROOT, RouterModule.constructor) as boolean;

    if (!isRoot) {
      throw new Error("RouterModule is not properly called using 'forRoot'.");
    }

    const routes = Reflect.getMetadata(MODULE_ROUTES, RouterModule.constructor) as Route[];
  }

  static forRoot(routes: Route[]): ModuleWithProviders {
    Reflect.defineMetadata(ROOT, routes, RouterModule.constructor);
    Reflect.defineMetadata(MODULE_ROUTES, routes, RouterModule.constructor);
    return { module: RouterModule, providers: [] };
  }
}

export { use };
export default maya;
