import { RouterDependencies, RouterProps, Type } from "../interface";
import { ModuleProviders, ParentModule, RouterMapper } from "../types";
import merge from "./merge";

// We use '+' instead of template string '${}' because of performance gain
// See https://stackoverflow.com/questions/6094117/prepend-text-to-beginning-of-string
export const sanitizePath = (path: string) => {
  if (path === "" || path === "/") {
    return "";
  }

  if (path.startsWith("/")) {
    return path;
  }

  return "/" + path;
};

export const getFunctionProps = <T>(func: Function | Object): T => {
  const _this: any = {};

  for (const prop in func) {
    _this[prop] = (func as any)[prop];
  }

  return _this;
};

export const logger = {
  red: (value: string) => console.log(`\x1b[31m${value}\x1b[0m`),
};

const mapProviders = (name: string, _module?: ParentModule): undefined | ModuleProviders | Function => {
  if (!_module) return;
  const index = _module?.providers?.findIndex((item) => item.name === name);
  return index > -1 ? _module?.providers[index] : mapProviders(name, _module.parent);
};

const findDependency = (name: string, dependencies: RouterDependencies, props: RouterProps, _module?: ParentModule) => {
  if (dependencies[name] && name === "RoutesMapper") return (dependencies[name] as (...args: any) => RouterMapper)(props, props, _module);
  if (dependencies[name]) return dependencies[name];

  const provider = mapProviders(name, _module) as Type<ModuleProviders>;

  if (provider) {
    dependencies[name] = new provider();
    return dependencies[name];
  }
};

export function mapDependencies(routerDep: RouterDependencies, _module?: ParentModule, dependencies?: any[]) {
  const props = getFunctionProps<RouterProps>(mapDependencies);
  const _dependencies = dependencies ?? _module?.dependencies;
  const promitives = ["String", "Boolean", "Function", "Array"];
  return _dependencies
    ? _dependencies.map(({ name }) => {
        if (promitives.includes(name)) return undefined;
        const dependency = findDependency(name, routerDep, props, _module);
        if (!dependency) {
          logger.red(`${name} is not provided properly in a module.`);
          throw new Error();
        }
        return dependency;
      })
    : [];
}

export const dependencyMapperFactory = (app: RouterProps) => merge(mapDependencies, app);
