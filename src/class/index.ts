import { MayaJsContext, MethodRoute, ModuleWithProviders, Route, Type } from "../interface";
import { ControllerMiddleware, Class, ClassList, ParentModule } from "../types";
import { CONTROLLER_METHODS } from "../utils/constants";

export abstract class Services {
  root: boolean = false;
  injectable: boolean = true;
  dependencies: any[] = [];
}

export abstract class Module {
  module: Class = class extends Module {};
  declarations: ClassList = [];
  imports: ModuleWithProviders[] = [];
  exports: ClassList = [];
  providers: ClassList = [];
  dependencies: ClassList = [];
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
  GET = CONTROLLER_METHODS;
  POST = CONTROLLER_METHODS;
  PUT = CONTROLLER_METHODS;
}

export class CustomModule extends Module {
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
