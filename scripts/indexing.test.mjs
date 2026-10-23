import test from "node:test";
import assert from "node:assert/strict";

const { allowIndexing, isProductionSite } = await import("../src/server/env.ts");

function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) {
    saved[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test("noindex is the default, including on production", () => {
  withEnv({ SITE_ENV: "preview", SITE_INDEXING: undefined }, () =>
    assert.equal(allowIndexing(), false),
  );
  withEnv({ SITE_ENV: "preview", SITE_INDEXING: "on" }, () => assert.equal(allowIndexing(), false));
  withEnv({ SITE_ENV: "production", SITE_INDEXING: undefined }, () => {
    assert.equal(isProductionSite(), true);
    assert.equal(allowIndexing(), false);
  });
  withEnv({ SITE_ENV: "production", SITE_INDEXING: "yes" }, () =>
    assert.equal(allowIndexing(), false),
  );
  withEnv({ SITE_ENV: "production", SITE_INDEXING: "on" }, () =>
    assert.equal(allowIndexing(), true),
  );
});
