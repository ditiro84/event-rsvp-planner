import { describe, expect, it } from "vitest";
import { formatFromHeader } from "../../src/utils/email";

describe("formatFromHeader", () => {
  it("wraps a normal event name around the sending address", () => {
    expect(formatFromHeader("Ola's Birthday Bash", "invites@gadaova.com")).toBe(
      "Ola's Birthday Bash <invites@gadaova.com>"
    );
  });

  it("falls back to the bare address when the event name is empty or whitespace", () => {
    expect(formatFromHeader("   ", "invites@gadaova.com")).toBe("invites@gadaova.com");
    expect(formatFromHeader("", "invites@gadaova.com")).toBe("invites@gadaova.com");
  });

  it("strips characters that would break the From header", () => {
    expect(formatFromHeader('Weird "Name" <injected>', "invites@gadaova.com")).toBe(
      "Weird Name injected <invites@gadaova.com>"
    );
  });

  it("strips embedded newlines to prevent header injection", () => {
    expect(formatFromHeader("Party\r\nBcc: evil@example.com", "invites@gadaova.com")).toBe(
      "PartyBcc: evil@example.com <invites@gadaova.com>"
    );
  });
});
