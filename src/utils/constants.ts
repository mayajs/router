import { ControllerMethod } from "../types";

export const CONTROLLER_ROUTES = "__routes__";
export const INJECTABLE = "__injectable__";
export const ROOT = "__root__";
export const DESIGN_PARAMS = "design:paramtypes";
export const DEPS = "__deps__";
export const MODULE = "__mod__";
export const MODULE_KEY = "__mod:key__";
export const MODULE_ROUTES = "__mod:routes__";
export const MODULE_IMPORTS = "__mod:imports__";
export const MODULE_EXPORTS = "__mod:exports__";
export const MODULE_DECLARATIONS = "__mod:declarations__";
export const MODULE_BOOTSTRAP = "__mod:bootstrap__";
export const MODULE_PROVIDERS = "__mod:providers__";
export const MODULE_CONSTANTS = { MODULE_IMPORTS, MODULE_EXPORTS, MODULE_DECLARATIONS, MODULE_BOOTSTRAP, MODULE_PROVIDERS };
export const METHODS = ["GET", "POST", "PUT", "HEAD", "DELETE", "OPTIONS", "PATCH"];
export const PRIMITIVES = ["String", "Boolean", "Function", "Array"];
export const CONTROLLER_METHODS: ControllerMethod = (_ctx) => null;

export enum MethodNames {
  get = "GET",
  post = "POST",
  put = "PUT",
  patch = "PATCH",
  delete = "DELETE",
  options = "OPTIONS",
  head = "HEAD",
}
