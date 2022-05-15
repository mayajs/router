import { MIME_TYPES } from "../utils/constants";
import { RouterContext } from "../interface";
import { promises as fs } from "fs";
import path from "path";

const resolveDir = (filepath: string) => path.resolve(process.cwd(), "./public" + filepath);

const extPattern = /\.(?<ext>\w*?)$/g;

export const isFileRequest = (url: string): boolean => {
  const ext = url.match(extPattern) ?? [];
  return ext?.length > 0;
};

export default async (context: RouterContext): Promise<void> => {
  const { res, req } = context;
  const filePath = req.url === "/" ? resolveDir("/index.html") : resolveDir(req.url ?? "");
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";

  if (!contentType) return res.send({ message: "File format not supported!" }, 404);

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    return res.end(data, "utf-8");
  } catch (error) {
    return res.send({ message: "File not found!" }, 404);
  }
};
