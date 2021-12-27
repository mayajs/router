import { MayaJsRequest, MayaJsResponse, RouterContext } from "../interface";
import { app, send } from "./app";
import merge from "../utils/merge";
import response from "./response";
import { URL } from "url";
import { RequestMethod } from "../types";
import { statusCodeFactory } from "../utils/helpers";

async function handler(req: MayaJsRequest, res: MayaJsResponse) {
  const protocol = req.headers.referer ? req.headers.referer.split(":")[0] : "http";
  const fullUrl = protocol + "://" + req.headers.host;
  const parsedURL = new URL(req.url || "", fullUrl);
  const path = parsedURL.pathname.replace(/(^\/+)|(\/+$)/g, "");
  const query = Object.fromEntries(parsedURL.searchParams);
  const headers = req.headers;
  const method = (req.method || "") as RequestMethod;

  const context: RouterContext = {
    req,
    res: response(res),
    query,
    params: {},
    body: null,
    file: null,
    method,
    headers,
    path,
    setStatus: statusCodeFactory(res),
  };

  // Sends result back and end request
  send(context);
}

// Create mayajs router by merging the handler and app instance
export default merge(handler, app);
