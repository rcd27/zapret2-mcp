import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LocalExecutor } from "../../executor/local.js";
import { DockerExecutor } from "../../executor/docker.js";
import { SshExecutor } from "../../executor/ssh.js";

describe("createExecutor factory", () => {
  const envBackup: Record<string, string | undefined> = {};
  const envKeys = [
    "ZAPRET2_MODE",
    "ZAPRET2_CONTAINER_NAME",
    "ZAPRET2_SSH_HOST",
    "ZAPRET2_SSH_USER",
    "ZAPRET2_SSH_PORT",
    "ZAPRET2_SSH_KEY",
  ];

  beforeEach(() => {
    for (const key of envKeys) {
      envBackup[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (envBackup[key] !== undefined) {
        process.env[key] = envBackup[key];
      } else {
        delete process.env[key];
      }
    }
  });

  async function loadFactory() {
    // Dynamic import to pick up fresh env
    const mod = await import("../../executor/factory.js");
    return mod.createExecutor;
  }

  it("returns LocalExecutor when ZAPRET2_MODE=local", async () => {
    process.env.ZAPRET2_MODE = "local";
    const createExecutor = await loadFactory();
    const executor = createExecutor();
    expect(executor).toBeInstanceOf(LocalExecutor);
    expect(executor.label).toBe("local");
  });

  it("returns DockerExecutor by default (no ZAPRET2_MODE)", async () => {
    const createExecutor = await loadFactory();
    const executor = createExecutor();
    expect(executor).toBeInstanceOf(DockerExecutor);
    expect(executor.label).toBe("docker:zapret2-openwrt");
  });

  it("uses custom container name from ZAPRET2_CONTAINER_NAME", async () => {
    process.env.ZAPRET2_MODE = "docker";
    process.env.ZAPRET2_CONTAINER_NAME = "my-container";
    const createExecutor = await loadFactory();
    const executor = createExecutor();
    expect(executor).toBeInstanceOf(DockerExecutor);
    expect(executor.label).toBe("docker:my-container");
  });

  it("returns SshExecutor when ZAPRET2_MODE=ssh with host", async () => {
    process.env.ZAPRET2_MODE = "ssh";
    process.env.ZAPRET2_SSH_HOST = "192.168.1.1";
    const createExecutor = await loadFactory();
    const executor = createExecutor();
    expect(executor).toBeInstanceOf(SshExecutor);
    expect(executor.label).toBe("ssh:root@192.168.1.1:22");
  });

  it("throws when ZAPRET2_MODE=ssh without host", async () => {
    process.env.ZAPRET2_MODE = "ssh";
    const createExecutor = await loadFactory();
    expect(() => createExecutor()).toThrow("ZAPRET2_SSH_HOST is required");
  });

  it("throws on unknown mode", async () => {
    process.env.ZAPRET2_MODE = "unknown";
    const createExecutor = await loadFactory();
    expect(() => createExecutor()).toThrow("Unknown ZAPRET2_MODE");
  });

  it("handles case-insensitive mode (LOCAL)", async () => {
    process.env.ZAPRET2_MODE = "LOCAL";
    const createExecutor = await loadFactory();
    const executor = createExecutor();
    expect(executor).toBeInstanceOf(LocalExecutor);
  });
});
