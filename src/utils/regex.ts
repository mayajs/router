function regex(url: string, full = false) {
  const base = (val: string) => new RegExp(`^${val}${full ? "$" : ""}`);
  const notParam = (val: string) => `(?:\\/(${val}))`;
  const isParam = (val: string) => `(?:\\/(?<${val}>[\\w\\-]+?))`;
  const pattern = url
    .split("/")
    .map((val) => (val.includes(":") ? isParam(val.substring(1)) : notParam(val)))
    .join("");

  return base(pattern);
}

export default regex;
