import { MayaJsContext, MethodRoute, ModuleWithProviders, Route, Type } from "../interface";
import { Class, ControllerMiddleware, ControllerType, ModuleCustomType, ModuleProviders, ParentModule } from "../types";

export abstract class Services {
  root: boolean = false;
  injectable: boolean = true;
  dependencies: any[] = [];
}

export abstract class Module {
  module: ModuleCustomType = class extends Module {};
  declarations: ControllerType[] = [];
  imports: ModuleWithProviders[] = [];
  exports: (ModuleCustomType | ControllerType)[] = [];
  providers: ModuleProviders[] = [];
  dependencies: (Type<any> | Class)[] = [];
  routes: Route[] = [];
  parent: ParentModule = null;
  path = "";
}

/**
 * An abstract class that define all the methods for a single route
 */
export class Controller {
  middlewares: Partial<ControllerMiddleware> = {};
  routes: MethodRoute[] = [];
  dependencies: (Type<Services> | Class)[] = [];
  GET = (_ctx: MayaJsContext): Promise<any> | any => null;
  POST = (_ctx: MayaJsContext): Promise<any> | any => null;
  DELETE = (_ctx: MayaJsContext): Promise<any> | any => null;
  PUT = (_ctx: MayaJsContext): Promise<any> | any => null;
  PATCH = (_ctx: MayaJsContext): Promise<any> | any => null;
  OPTIONS = (_ctx: MayaJsContext): Promise<any> | any => null;
  HEAD = (_ctx: MayaJsContext): Promise<any> | any => null;
}

export abstract class CustomModule extends Module {
  __mod__ = true;
  bootstrap: Type<Controller> | null = null;
  key = "";

  constructor(..._args: any) {
    super();
  }

  invoke(_parent: ParentModule): void {
    return;
  }

  static forRoot(..._args: any): ModuleWithProviders {
    return { module: CustomModule, providers: [] };
  }
}

export class AppRoot extends Module {}
