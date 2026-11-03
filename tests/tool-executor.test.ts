import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ToolExecutor } from "../modes/agent/tool-executor";
import { ActionTracker } from "../modes/agent/action-tracker";
import { defaultAgentConfig } from "../modes/agent/types";

let dir: string;
let tracker: ActionTracker;
let exec: ToolExecutor;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "claw-"));
  fs.writeFileSync(path.join(dir, "a.txt"), "hello");
  fs.writeFileSync(path.join(dir, ".env"), "SECRET=1");
  const config = { ...defaultAgentConfig(), codebasePath: dir };
  tracker = new ActionTracker();
  exec = new ToolExecutor(tracker, config);
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("workspace safety", () => {
  test("blocks path traversal", () => {
    expect(() => exec.readFile("../../etc/passwd")).toThrow(/escapes workspace|excluded/);
  });
  test("blocks reading .env", () => {
    expect(() => exec.readFile(".env")).toThrow(/excluded/);
  });
});

describe("staging", () => {
  test("createFile stages without writing to disk", () => {
    exec.createFile("new.txt", "x");
    expect(fs.existsSync(path.join(dir, "new.txt"))).toBe(false);
    expect(tracker.pendingMutations()).toHaveLength(1);
  });
  test("nothing is written unless approved", () => {
    exec.createFile("new.txt", "x");
    exec.applyApprovedFromTracker();
    expect(fs.existsSync(path.join(dir, "new.txt"))).toBe(false);
  });
  test("approved create is written", () => {
    exec.createFile("new.txt", "x");
    for (const a of tracker.pendingMutations()) tracker.updateStatus(a.id, "approved", true);
    const { errors } = exec.applyApprovedFromTracker();
    expect(errors).toHaveLength(0);
    expect(fs.readFileSync(path.join(dir, "new.txt"), "utf8")).toBe("x");
  });
  test("refuses to create a file that already exists", () => {
    expect(() => exec.createFile("a.txt", "x")).toThrow(/already exists/);
  });
});

describe("symlinks", () => {
  test("a symlink cannot expose files outside the workspace", () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
    fs.writeFileSync(path.join(outside, "secret.txt"), "TOP-SECRET");
    fs.symlinkSync(outside, path.join(dir, "link"), "junction");
    expect(() => exec.readFile("link/secret.txt")).toThrow(/escapes workspace/);
    fs.rmSync(outside, { recursive: true, force: true });
  });
  test("a symlink cannot be used to write outside the workspace", () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
    fs.symlinkSync(outside, path.join(dir, "link"), "junction");
    expect(() => exec.createFile("link/evil.txt", "x")).toThrow(/escapes workspace/);
    fs.rmSync(outside, { recursive: true, force: true });
  });
});
