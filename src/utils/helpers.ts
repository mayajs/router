import { MayaJsResponse, RouterDependencies, RouterProps, Type } from "../interface";
import { ParentModule } from "../types";
import { Services } from "../class";

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

const mapProviders = (name: string, _module?: ParentModule): undefined | Type<Services> => {
  if (!_module || !_module?.providers) return;
  const index = _module?.providers?.findIndex((item) => item.name === name);
  return index > -1 ? _module?.providers[index] : mapProviders(name, _module.parent);
};

const findDependency = (name: string, dependencies: RouterDependencies, props: RouterProps, _module?: ParentModule) => {
  if (dependencies[name]) return dependencies[name];

  const provider = mapProviders(name, _module) as any;
  let args: any[] = [];

  if (!provider) return;
  if (provider?.dependencies?.length > 0) args = mapDependencies(dependencies, _module, provider.dependencies);

  const providerInstance: Services = new provider(...args);
  dependencies[name] = providerInstance;
  return providerInstance;
};

export function mapDependencies(routerDep: RouterDependencies, _module?: ParentModule, dependencies?: any[]) {
  const props = getFunctionProps<RouterProps>(mapDependencies);
  const _dependencies = dependencies ?? _module?.dependencies;
  const promitives = ["String", "Boolean", "Function", "Array"];

  const mapDependencyItems = ({ name }: any) => {
    if (promitives.includes(name)) return undefined;

    const dependency = findDependency(name, routerDep, props, _module);

    if (!dependency) {
      logger.red(`${name} is not provided properly in a module.`);
      throw new Error();
    }
    return dependency;
  };

  return _dependencies ? _dependencies.map(mapDependencyItems) : [];
}

export function statusCodeFactory(res: MayaJsResponse) {
  return (code: number) => {
    res.status(code);
  };
}
