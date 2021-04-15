import { ModuleCustomType, ParentModule, ModuleMapper, ModuleMapperFactory } from "../types";
import { ModuleWithProviders } from "../interface";
import { mapDependencies } from "./helpers";
import { CustomModule } from "../class";

export const mapModules: ModuleMapperFactory = (router, parentModule = null): ModuleMapper => (imported) => {
  let args: any[] = [];
  let currentModule: any;
  let isCustomModule = false;

  if ((imported as ModuleWithProviders)?.module) {
    currentModule = (imported as ModuleWithProviders).module;
    const { dependencies = [], providers = [], imports = [] } = imported as ModuleWithProviders;
    currentModule["dependencies"] = dependencies;
    currentModule["providers"] = providers;
    currentModule["imports"] = imports;
    currentModule["parent"] = parentModule;
    isCustomModule = true;
  }

  if (!imported.hasOwnProperty("module")) currentModule = imported as ModuleCustomType;
  if (!currentModule) return;
  if (isCustomModule) args = mapDependencies(router.dependencies, currentModule);

  const tempModule = new currentModule(...args);

  if (parentModule) tempModule.parent = parentModule as CustomModule;
  if (isCustomModule) (tempModule as CustomModule).invoke();

  const imports = tempModule.imports ?? currentModule.imports;
  const _module = tempModule.imports ? tempModule : currentModule;
  imports.map(mapModules(router, _module));
};

export const declarationsMapper = (_module: ParentModule, name: string = ""): boolean => {
  let isDeclared = _module?.declarations !== undefined;

  if (_module && _module?.declarations) isDeclared = _module.declarations.some((item) => item.name === name);

  if (!isDeclared && _module !== null && _module?.parent) return declarationsMapper(_module.parent, name);

  return isDeclared;
};
