export interface PolicyDecision {
  id: string;
  subjectType: string;
  subjectId: string;
  policySource: string;
  decision: "allow" | "deny" | "rewrite" | "fallback" | "require_human_approval";
  reason?: string;
  rewrite?: Record<string, unknown>;
  createdAt: string;
}
