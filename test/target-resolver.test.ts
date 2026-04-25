import { describe, it, expect } from "vitest";
import { classifyTarget } from "../src/target-resolver.js";

describe("classifyTarget", () => {
  it("classifies local absolute path", () => {
    expect(classifyTarget("/tmp/foo")).toEqual({ kind: "path", value: "/tmp/foo" });
  });
  it("classifies local relative path", () => {
    expect(classifyTarget("./local").kind).toBe("path");
  });
  it("classifies github URL", () => {
    expect(classifyTarget("https://github.com/foo/bar")).toEqual({ kind: "github", owner: "foo", repo: "bar" });
  });
  it("classifies owner/repo slug", () => {
    expect(classifyTarget("foo/bar")).toEqual({ kind: "github", owner: "foo", repo: "bar" });
  });
  it("classifies npm: prefix", () => {
    expect(classifyTarget("npm:left-pad")).toEqual({ kind: "npm", name: "left-pad" });
    expect(classifyTarget("npm:left-pad@1.2.3")).toEqual({ kind: "npm", name: "left-pad", version: "1.2.3" });
  });
});
