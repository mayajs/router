import { ModuleCustomType, ParentModule, ModuleMapper, ModuleMapperFactory, RouterMapper, RouterMapperFactory } from "../types";
import { ModuleWithProviders, ModuleWithProvidersProps } from "../interface";
import { dependencyMapperFactory, logger, sanitizePath } from "./helpers";
import { CustomModule } from "../class";

const mapModules: ModuleMapperFactory = (router, app, parentModule = null): ModuleMapper => (imported) => {
  let args: any[] = [];
  let customModuleProps: ModuleWithProvidersProps = { dependencies: [], providers: [], imports: [] };
  let currentModule;
  let isCustomModule = false;

  if ((imported as ModuleWithProviders)?.module) {
    currentModule = (imported as ModuleWithProviders).module;
    const { dependencies, providers, imports } = imported as ModuleWithProviders;
    customModuleProps = { dependencies, providers, imports };
    isCustomModule = true;
  }

  if (!imported.hasOwnProperty("module")) currentModule = imported as ModuleCustomType;
  if (!currentModule) return;

  if (isCustomModule) {
    const mapDependencies = dependencyMapperFactory(router);
    const tempModule = new currentModule(...args);
    const { providers, imports, dependencies } = customModuleProps;
    tempModule.parent = parentModule as CustomModule;
    tempModule.providers = providers;
    tempModule.dependencies = dependencies ?? [];
    tempModule.imports = imports ?? [];
    args = mapDependencies(app.dependencies, tempModule);
  }

  if (currentModule.name === "RouterModule") args[1] = (parentModule as any)?.parent?.path ?? "";

  const _module = new currentModule(...args);

  if (parentModule) _module.parent = parentModule as CustomModule;
  if (isCustomModule) (_module as CustomModule).invoke();

  _module.imports.map(mapModules(router, app, _module));
};

const declarationsMapper = (_module: ParentModule, name: string = ""): boolean => {
  let isDeclared = _module?.declarations !== undefined;

  if (_module && _module?.declarations) isDeclared = _module.declarations.some((item) => item.name === name);

  if (!isDeclared && _module !== null && _module?.parent) return declarationsMapper(_module.parent, name);

  return isDeclared;
};

const routeMapper: RouterMapperFactory = (router, app, _module = null): RouterMapper => {
  // Recursive function for mapping array of routes
  const RouterMapper: RouterMapper = (parent = "") => (route) => {
    // Create parent route
    parent = parent.length > 0 ? sanitizePath(parent) : "";

    // Sanitize route path
    route.path = parent + sanitizePath(route.path);

    if (_module !== null) _module.path = route.path;

    const controllerName = route?.controller?.name;
    let isDeclared = true;

    if (controllerName && _module !== null) {
      isDeclared = declarationsMapper(_module, controllerName);
    }

    if (!isDeclared) {
      const moduleName = _module?.constructor.name;
      throw new Error(`${controllerName} is not declared in ${moduleName}`);
    }

    // Add route to list
    router.addRouteToList(route, _module);

    if (route?.children !== undefined && route?.loadChildren !== undefined) {
      logger.red(`Property 'loadChildren' can't be used with 'children' in route '${route.path}'`);
      throw new Error();
    }

    if (route?.controller !== undefined && route?.loadChildren !== undefined) {
      logger.red(`Property 'loadChildren' can't be used with 'controller' in route '${route.path}'`);
      throw new Error();
    }

    // Check if route has children
    if (route?.children && route?.children.length > 0) {
      // Map children's routes
      route.children.map(RouterMapper(route.path));
    }

    if (route?.loadChildren) {
      route
        .loadChildren()
        .then(mapModules(router, app, _module ?? { path: route.path }))
        .catch((error) => console.log(error));
    }
  };

  return RouterMapper;
};

export default routeMapper;
