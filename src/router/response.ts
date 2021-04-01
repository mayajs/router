import { ResponseObjectProps, ResponseObject } from ".";
import http from "http";

function ResponseFunctions(res: http.ServerResponse): ResponseObjectProps {
  const endResponse = (value: any) => {
    res.write(value);
    res.end();
  };

  return {
    send(value: any) {
      const contentType = "Content-Type";
      const isJSON = value instanceof Object;
      res.writeHead(200, { [contentType]: isJSON ? "application/json" : "text/plain" });
      endResponse(isJSON ? JSON.stringify(value) : value);
    },
    json(json: object) {
      res.writeHead(200, { "Content-Type": "application/json" });
      endResponse(JSON.stringify(json));
    },
    html(html: string) {
      res.writeHead(200, { "Content-Type": "text/html" });
      endResponse(html);
    },
  };
}

export = function createResponseObject(res: http.ServerResponse): ResponseObject {
  return Object.assign(res, ResponseFunctions(res));
};
