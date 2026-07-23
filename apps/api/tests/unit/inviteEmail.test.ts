import { describe, expect, it } from "vitest";
import { formatFromHeader } from "../../src/utils/email";

describe("formatFromHeader", () => {
  it("wraps a normal event name around the sending address", () => {
    expect(formatFromHeader("Ola's Birthday Bash", "invites@eventflow.app")).toBe(
      "Ola's Birthday Bash <invites@eventflow.app>"
    );
  });

  it("falls back to the bare address when the event name is empty or whitespace", () => {
    expect(formatFromHeader("   ", "invites@eventflow.app")).toBe("invites@eventflow.app");
    expect(formatFromHeader("", "invites@eventflow.app")).toBe("invites@eventflow.app");
  });

  it("strips characters that would break the From header", () => {
    expect(formatFromHeader('Weird "Name" <injected>', "invites@eventflow.app")).toBe(
      "Weird Name injected <invites@eventflow.app>"
    );
  });

  it("strips embedded newlines to prevent header injection", () => {
    expect(formatFromHeader("Party\r\nBcc: evil@example.com", "invites@eventflow.app")).toBe(
      "PartyBcc: evil@example.com <invites@eventflow.app>"
    );
  });
});
