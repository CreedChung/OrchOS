import { FilesystemService } from "@/modules/filesystem/service";

export interface ParsedAgentsPolicy {
  requiresSandbox: boolean;
  forbidCommit: boolean;
}

export class PolicyParser {
  static parseAgentsFile(filePath?: string): ParsedAgentsPolicy {
    if (!filePath) {
      return { requiresSandbox: false, forbidCommit: false };
    }

    const content = FilesystemService.readFile(filePath).content || "";
    const normalized = content.toLowerCase();

    return {
      requiresSandbox:
        normalized.includes("require sandbox") ||
        normalized.includes("sandbox required") ||
        normalized.includes("projectchatsrequiresandbox"),
      forbidCommit:
        normalized.includes("never commit") ||
        normalized.includes("do not commit") ||
        normalized.includes("forbid commit"),
    };
  }
}
