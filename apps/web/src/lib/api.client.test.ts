import { beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();
const createPairingTokenMock = vi.fn();

vi.mock("@/lib/orpc/client", () => ({
  orpc: {
    localAgents: {
      list: listMock,
      createPairingToken: createPairingTokenMock,
    },
  },
}));

describe("api client", () => {
  beforeEach(() => {
    listMock.mockReset();
    createPairingTokenMock.mockReset();
  });

  it("returns empty local agents list when the request fails", async () => {
    listMock.mockRejectedValue(new Error("boom"));

    const { api } = await import("./api.client");

    await expect(api.listLocalAgents()).resolves.toEqual([]);
  });

  it("rewrites pairing token auth failures to a user-facing message", async () => {
    createPairingTokenMock.mockRejectedValue(new Error("unauthorized"));

    const { api } = await import("./api.client");

    await expect(api.createLocalAgentPairingToken()).rejects.toThrow(
      "Sign in to generate a local agent pairing token.",
    );
  });
});
