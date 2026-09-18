const test = require("node:test");
const assert = require("node:assert");

test("default application port is 3000", () => {
  const port = process.env.PORT || 3000;
  assert.strictEqual(Number(port), 3000);
});
