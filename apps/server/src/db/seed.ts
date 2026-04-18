import { OrganizationService } from "../modules/organization";
import { db } from "./index";
import { organizations } from "./schema";
import { sql } from "drizzle-orm";

export function seedData() {
  const existingOrgs = db
    .select({ count: sql<number>`count(*)` })
    .from(organizations)
    .get();
  if (existingOrgs?.count === 0) {
    OrganizationService.create("Personal");
  }
}
