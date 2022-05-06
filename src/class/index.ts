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
  }
  POST(ctx: MayaJsContext): Promise<any> | any {
    /* This is intentional */
  }
  DELETE(ctx: MayaJsContext): Promise<any> | any {
    /* This is intentional */
  }
  PUT(ctx: MayaJsContext): Promise<any> | any {
    /* This is intentional */
  }
  PATCH(ctx: MayaJsContext): Promise<any> | any {
    /* This is intentional */
  }
  OPTIONS(ctx: MayaJsContext): Promise<any> | any {
    /* This is intentional */
  }
  HEAD(ctx: MayaJsContext): Promise<any> | any {
    /* This is intentional */
  }
}

export abstract class CustomModule extends MayaJsModule {
  invoke() {
    /* This is intentional */
  }
  static forRoot(...args: any): ModuleWithProviders {
    return { module: class extends CustomModule {}, providers: [] };
  }
}
