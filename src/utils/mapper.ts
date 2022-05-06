import { ModuleCustomType, ParentModule, ModuleMapper, ModuleMapperFactory } from "../types";
import { ModuleWithProviders } from "../interface";
import { mapDependencies } from "./helpers";
import { CustomModule } from "../class";

export const mapModules: ModuleMapperFactory =
  (router, path, parentModule = null): ModuleMapper =>
  (imported) => {
    let args: any[] = [];
    let currentModule: any;
    let isCustomModule = false;

    if ((imported as ModuleWithProviders)?.module) {
      currentModule = (imported as ModuleWithProviders).module;
      const { dependencies = [], providers = [], imports = [] } = imported as ModuleWithProviders;
      currentModule["dependencies"] = dependencies;
      currentModule["providers"] = providers;
      currentModule["imports"] = imports;
      isCustomModule = true;
    }

    if (isCustomModule && parentModule && (<CustomModule>parentModule).providers) {
      currentModule.providers.map((provider: any) => (<CustomModule>parentModule).providers.push(provider));
    }

    if (!imported.hasOwnProperty("module")) currentModule = imported as ModuleCustomType;
    if (!currentModule) return;

    currentModule["path"] = path;
    currentModule["parent"] = parentModule;

    if (currentModule.bootstrap) router.addRouteToList({ path: "", controller: currentModule.bootstrap });
    if (isCustomModule) args = mapDependencies(router.dependencies, currentModule);

    const tempModule = new currentModule(...args);

    if (parentModule) tempModule.parent = parentModule as CustomModule;
    if (isCustomModule && (tempModule as CustomModule).invoke) (tempModule as CustomModule).invoke(parentModule as CustomModule);

    const _imports = tempModule.imports ?? currentModule.imports;
    const _module = tempModule.imports ? tempModule : currentModule;

    _imports.map(mapModules(router, path, _module));
  };

export const declarationsMapper = (_module: ParentModule, name: string = ""): boolean => {
  let isDeclared = _module?.declarations !== undefined;

  if (_module && _module?.declarations) isDeclared = _module.declarations.some((item) => item.name === name);

  if (!isDeclared && _module !== null && _module?.parent) return declarationsMapper(_module.parent, name);

  return isDeclared;
};
