import { MayaJsResponse } from "../interface";
import merge from "../utils/merge";
import http from "http";

const contentTypeValues = ["text/plain", "application/json", "text/html"];
const contentType = contentTypeValues.map((type) => ({ "Content-Type": type }));

function ResponseFunctions(res: http.ServerResponse): MayaJsResponse {
  const endResponse = (value: any) => {
    if (value) res.write(`${value}`);
    res.end();
  };

  return merge(res, {
    send(value: any, statusCode = 200) {
      statusCode = this.statusCode ?? statusCode;
      const isText = typeof value === "string";
      const isError = value instanceof Error;
      const code = isError ? 500 : statusCode;

      if (!isText) return this.json(!value?.message ? { message: value.message } : value, code);

      res.writeHead(code, contentType[0]);
      endResponse(value);
    },
    json(json: object, statusCode = 200) {
      res.writeHead(this.statusCode ?? statusCode, contentType[1]);
      endResponse(JSON.stringify(json));
    },
    html(html: string, statusCode = 200) {
      res.writeHead(this.statusCode ?? statusCode, contentType[2]);
      endResponse(html);
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    statusCode: 200,
  });
}

export default ResponseFunctions;
