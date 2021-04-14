import { ModuleCustomType, ParentModule, ModuleMapper, ModuleMapperFactory } from "../types";
import { ModuleWithProviders, ModuleWithProvidersProps } from "../interface";
import { dependencyMapperFactory } from "./helpers";
import { CustomModule } from "../class";

export const mapModules: ModuleMapperFactory = (router, parentModule = null): ModuleMapper => (imported) => {
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
    args = mapDependencies(router.dependencies, tempModule);
  }

  const _module = new currentModule(...args);

  if (parentModule) _module.parent = parentModule as CustomModule;
  if (isCustomModule) (_module as CustomModule).invoke();

  _module.imports.map(mapModules(router, _module));
};

export const declarationsMapper = (_module: ParentModule, name: string = ""): boolean => {
  let isDeclared = _module?.declarations !== undefined;

  if (_module && _module?.declarations) isDeclared = _module.declarations.some((item) => item.name === name);

  if (!isDeclared && _module !== null && _module?.parent) return declarationsMapper(_module.parent, name);

  return isDeclared;
};
