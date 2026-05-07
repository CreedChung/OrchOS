import { os } from "@/server/orpc/base";
import { FilesystemService } from "@/server/modules/filesystem/service";

export const filesystemRouter = {
  browse: os.filesystem.browse.handler(async ({ input }) => {
    return FilesystemService.browse(input.path || "~");
  }),
  readFile: os.filesystem.readFile.handler(async ({ input }) => {
    return FilesystemService.readFile(input.path);
  }),
  writeFile: os.filesystem.writeFile.handler(async ({ input }) => {
    return FilesystemService.writeFile(input.path, input.content);
  }),
};
