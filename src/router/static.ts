import { MIME_TYPES } from "../utils/constants";
import { RouterContext } from "../interface";
import { promises as fs } from "fs";
import path from "path";

const resolveDir = (filepath: string) => path.resolve(process.cwd(), "./public" + filepath);

const extPattern = /\.(?<ext>\w*?)$/g;

export const isFileRequest = (url: string): boolean => {
  const ext = url.match(extPattern) ?? [];
};
