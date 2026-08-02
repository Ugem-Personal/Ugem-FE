const frontendOrigin = process.env.SMOKE_FRONTEND_URL || "http://127.0.0.1:3000";
const backendOrigin = process.env.SMOKE_BACKEND_URL || "http://127.0.0.1:8080";

const failures = [];

const check = async (name, run) => {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : error}`);
    console.error(`FAIL ${name}`);
  }
};

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

for (const route of [
  "/",
  "/login",
  "/explore",
  "/register",
  "/route-does-not-exist",
]) {
  await check(`frontend ${route}`, async () => {
    const response = await fetch(`${frontendOrigin}${route}`);
    const html = await response.text();
    expect(response.status === 200, `expected 200, received ${response.status}`);
    expect(html.includes('id="root"'), "SPA root element is missing");
    expect(html.includes('lang="vi"'), "document language must be Vietnamese");
  });
}

await check("guest merchant discovery is public", async () => {
  const response = await fetch(
    `${backendOrigin}/api/v1/merchants?pageIndex=1&pageSize=3`,
  );
  const body = await response.json();
  expect(response.status === 200, `expected 200, received ${response.status}`);
  expect(body.success === true, "merchant discovery response is not successful");
});

for (const endpoint of ["live", "ready"]) {
  await check(`backend health/${endpoint}`, async () => {
    const response = await fetch(`${backendOrigin}/api/v1/health/${endpoint}`);
    const body = await response.json();
    expect(response.status === 200, `expected 200, received ${response.status}`);
    expect(body.success === true, "health response is not successful");
    expect(Boolean(body.traceId), "health response is missing traceId");
  });
}

await check("protected endpoint rejects anonymous access", async () => {
  const response = await fetch(`${backendOrigin}/api/v1/admin/staff`);
  const body = await response.json();
  expect(response.status === 401, `expected 401, received ${response.status}`);
  expect(body.success === false, "error envelope is invalid");
  expect(Boolean(body.traceId), "error response is missing traceId");
  expect(
    response.headers.get("x-content-type-options") === "nosniff",
    "Helmet security headers are missing",
  );
});

if (failures.length > 0) {
  console.error("\nSmoke checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("\nAll local smoke checks passed.");
}
