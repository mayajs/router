import { CustomModule, MayaJsController, MayaJsModule } from "../class";
import { MayaJsContext, MayaJsRequest, MayaJsResponse, ModuleProperty, ModuleWithProviders, Type } from "../interface";
import { MODULE_CONSTANTS } from "../utils/constants";

/**
 * Generic `ClassDecorator` type
 */
export type InjectableDecorator<T> = (target: T, ...args: any[]) => void;

/**
 * Type for function request callback
 */
export type Callback = (...args: any[]) => void;

/**
 * Type of request method
 */
export type RequestMethod = "GET" | "POST" | "DELETE" | "OPTIONS" | "PUT" | "PATCH";

/**
 * List of module options keys
 */
export type ModuleOptionsKeys = keyof ModuleProperty;

/**
 * List of module constants keys
 */
export type ModuleConstantsKeys = keyof typeof MODULE_CONSTANTS;

export type MayaJsNextFunction = (error?: any) => Promise<void> | void;

export type RouteCallback = (ctx: MayaJsContext) => Promise<any> | any;

export type ControllerType = Type<MayaJsController>;

export type ModuleCustomType = Type<CustomModule | MayaJsModule>;

export type ModuleProviders = Type<any>[];

export type ModuleImports = ModuleCustomType | ModuleWithProviders;

export type ExpressJsMiddleware = (req: MayaJsRequest, res: MayaJsResponse, next: MayaJsNextFunction, error: any) => void;

export type MayaJsMiddleware = (context: MayaJsContext, next: MayaJsNextFunction, error: any) => void;

export type Middlewares = ExpressJsMiddleware | MayaJsMiddleware;

export type ControllerMiddleware = {
  [key in RequestMethod]: Middlewares[];
};

export type ParentModule = CustomModule | MayaJsModule | null;
