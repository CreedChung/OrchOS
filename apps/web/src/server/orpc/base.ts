import { implement } from "@orpc/server";

import { appContract } from "@/lib/orpc/contracts";
import type { ORPCContext } from "@/server/orpc/context";

export const os = implement(appContract).$context<ORPCContext>();
