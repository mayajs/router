function regex(url: string) {
  const base = (val: string) => new RegExp(`^${val}$`);
  const notParam = (val: string) => `(?:\\/?(${val}))`;
  const isParam = (val: string) => `(?:\\/?(?<${val}>[\\w\\-]+?))`;
  const regex = url
    .split("/")
    .map((val) => (val.includes(":") ? isParam(val.substring(1)) : notParam(val)))
    .join("");

  return base(regex);
}

export default regex;
