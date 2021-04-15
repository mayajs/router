import { MayaJsContext, ModuleWithProviders } from "../interface";
import { ControllerMiddleware, ControllerType, ModuleCustomType, ModuleImports, ModuleProviders, ParentModule } from "../types";

export abstract class Services {
  __injectable__ = true;
  dependencies: any[] = [];
}

export abstract class MayaJsModule {
  declarations: ControllerType[] = [];
  imports: ModuleImports[] = [];
  exports: (ModuleCustomType | ControllerType)[] = [];
  providers: ModuleProviders = [];
  dependencies: any[] = [];
  parent: ParentModule = null;
  path = "";
}

/**
 * An abstract class that define all the methods for a single route
 */
export class MayaJsController {
  middlewares: Partial<ControllerMiddleware> = {};
  routes: any[] = [];
  GET(ctx: MayaJsContext): Promise<any> | any {}
  POST(ctx: MayaJsContext): Promise<any> | any {}
  DELETE(ctx: MayaJsContext): Promise<any> | any {}
  PUT(ctx: MayaJsContext): Promise<any> | any {}
  PATCH(ctx: MayaJsContext): Promise<any> | any {}
  OPTIONS(ctx: MayaJsContext): Promise<any> | any {}
  HEAD(ctx: MayaJsContext): Promise<any> | any {}
}

export abstract class CustomModule extends MayaJsModule {
  invoke() {}
  static forRoot(...args: any): ModuleWithProviders {
    return { module: class extends CustomModule {}, providers: [] };
  }
}
