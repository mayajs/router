import { CustomModule, MayaJsModule } from "../class";
import { MODULE_CONSTANTS } from "../utils/constants";
import {
  MayaJsContext,
  MayaJsRequest,
  MayaJsResponse,
  MayaJsRoute,
  MayaRouter,
  ModuleProperty,
  ModuleWithProviders,
  RouterContext,
  RouterDependencies,
  RouterMethods,
  RouterProps,
  Type,
} from "../interface";

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

export type Class = Type<any>;

export type ControllerType = Class;

export type ModuleCustomType = Class;

export type ModuleProviders = Class[];

export type ModuleImports = ModuleCustomType | ModuleWithProviders;

export type ExpressJsMiddleware = (req: MayaJsRequest, res: MayaJsResponse, next: MayaJsNextFunction, error: any) => void;

export type MayaJsMiddleware = (context: MayaJsContext, next: MayaJsNextFunction, error: any) => void;

export type Middlewares = ExpressJsMiddleware | MayaJsMiddleware;

export type ControllerMiddleware = {
  [key in RequestMethod]: Middlewares[];
};

export type ResponseSender = (context: RouterContext) => Promise<void>;

export type MayaJsNextfunction = (error?: any) => void;

export type RouterFunction = RouterProps & RouterMethods;

export type RouterMapper = (parent?: string, _module?: CustomModule | null) => (route: MayaJsRoute) => void;

export type RouterMapperFactory = (router: RouterFunction, app: MayaRouter, _module?: CustomModule | null) => RouterMapper;

export type ModuleMapper = (imported: ModuleImports) => void;

export type ParentModule = CustomModule | MayaJsModule | null;

export type ModuleMapperFactory = (router: RouterFunction, parentModule?: ParentModule | { path: string }) => ModuleMapper;

export type FindDependency = (name: string, dependencies: RouterDependencies) => void;
