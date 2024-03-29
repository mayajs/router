import { ExpressJsMiddleware, ExpressJsMiddlewareError, MayaJsMiddleware, Middlewares } from "../types";
import { MayaJsContext } from "../interface";

/**
 * A helper function for invoking a list of MayaJS or ExpressJS middlewares.
 *
 * @param req Request object from http.IncomingMessage
 * @param res Response object from http.ServerResponse
 * @param middlewares List of middlewares
 * @param message A message from the previous middleware
 */
function middleware(middlewares: Middlewares[], ctx: MayaJsContext, callback: any, message?: any): void {
  const { req, res } = ctx;
  const context = { ...ctx, body: req.body, file: req.file };

  if (!middlewares.length) return callback(context);

  const current = middlewares[0];

  // Create next function
  const next = (error: any) => {
    if (error) return res.send(error, 400);
    return middleware(middlewares.slice(1), { ...context, req, res, error }, callback, error);
  };

  // Create middleware for express
  const expressMiddleware = () => (message ? (<ExpressJsMiddlewareError>current)(message, req, res, next) : (<ExpressJsMiddleware>current)(req, res, next));

  // Check if arguments are more than 2
  return current.length > 2 ? expressMiddleware() : (<MayaJsMiddleware>current)(context, next);
}

export default middleware;
