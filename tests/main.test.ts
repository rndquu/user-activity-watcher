import { drop } from "@mswjs/data";
import { Value } from "@sinclair/typebox/value";
import { ValidationException } from "typebox-validators";
import { getEnv } from "../src";
import program from "../src/parser/payload";
import { run } from "../src/run";
import envConfigSchema from "../src/types/env-type";
import { db as mockDb } from "./__mocks__/db";
import dbSeed from "./__mocks__/db-seed.json";
import { server } from "./__mocks__/node";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

jest.mock("../src/parser/payload", () => {
  // Require is needed because mock cannot access elements out of scope
  const cfg = require("./__mocks__/results/valid-configuration.json");
  return {
    stateId: 1,
    eventName: "issues.assigned",
    authToken: process.env.GITHUB_TOKEN,
    ref: "",
    eventPayload: {
      issue: { html_url: "https://github.com/ubiquibot/user-activity-watcher/issues/1", number: 1, assignees: [{ login: "ubiquibot" }] },
      repository: {
        owner: {
          login: "ubiquibot",
        },
        name: "user-activity-watcher",
      },
    },
    settings: cfg,
  };
});

describe("Run tests", () => {
  beforeAll(() => {
    drop(mockDb);
    for (const item of dbSeed.repositories) {
      mockDb.repositories.create(item);
    }
  });

  it("Should fail on invalid environment", async () => {
    const oldEnv = { ...process.env };
    // @ts-expect-error Testing for invalid env
    delete process.env.SUPABASE_URL;
    // @ts-expect-error Testing for invalid env
    delete process.env.SUPABASE_KEY;
    await expect(getEnv()).rejects.toEqual(new ValidationException("The environment is" + " invalid."));
    process.env = oldEnv;
  });
  it("Should run", async () => {
    const result = await run(program, Value.Decode(envConfigSchema, process.env));
    expect(JSON.parse(result)).toEqual({ status: "ok" });
  });
});
