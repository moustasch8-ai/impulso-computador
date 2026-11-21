"use strict";
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(error => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForServer(baseUrl, child) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error("Servidor encerrou antes de ficar pronto.");
    try {
      const response = await fetch(baseUrl + "/api/health");
      if (response.ok) return response;
    } catch (_) {
      // O processo ainda pode estar inicializando o banco.
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error("Servidor não ficou pronto dentro do tempo de teste.");
}

(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "oferta-radar-test-"));
  const port = await freePort();
  const baseUrl = "http://127.0.0.1:" + port;
  const child = spawn(process.execPath, [path.join(__dirname, "server.js")], {
    cwd: __dirname,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      DATABASE_PATH: path.join(directory, "smoke.sqlite"),
      FRONTEND_ORIGINS: "https://moustasch8-ai.github.io"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let serverOutput = "";
  child.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
  child.stderr.on("data", chunk => { serverOutput += chunk.toString(); });

  try {
    const health = await waitForServer(baseUrl, child);
    const healthData = await health.json();
    assert.equal(healthData.ok, true);
    assert.equal(healthData.registrationRequired, false);

    const preflight = await fetch(baseUrl + "/api/offers", {
      method: "OPTIONS",
      headers: { Origin: "https://moustasch8-ai.github.io" }
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "https://moustasch8-ai.github.io");

    const offerPayload = {
      name: "Produto de teste",
      store: "Loja de teste",
      category: "Eletrônicos",
      old_price: 200,
      price: 150,
      coupon: "TESTE",
      destination_url: "https://www.example.com/produto",
      affiliate_url: "https://www.example.com/afiliado",
      expires_at: null
    };
    const createOffer = await fetch(baseUrl + "/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://moustasch8-ai.github.io" },
      body: JSON.stringify(offerPayload)
    });
    assert.equal(createOffer.status, 201);
    const offerResult = await createOffer.json();
    const offers = await (await fetch(baseUrl + "/api/offers")).json();
    assert.equal(offers.offers.length, 1);
    assert.equal(offers.offers[0].id, offerResult.id);

    const invalidOffer = await fetch(baseUrl + "/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...offerPayload, destination_url: "javascript:alert(1)" })
    });
    assert.equal(invalidOffer.status, 400);

    const redirectOffer = await fetch(baseUrl + "/go/" + offerResult.id, { redirect: "manual" });
    assert.equal(redirectOffer.status, 302);
    assert.equal(redirectOffer.headers.get("location"), offerPayload.affiliate_url);

    const linkPayload = {
      store: "Rede de afiliados",
      name: "Meu link de teste",
      url: "https://www.example.com/meu-link"
    };
    const createLink = await fetch(baseUrl + "/api/affiliate-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(linkPayload)
    });
    assert.equal(createLink.status, 201);
    const linkResult = await createLink.json();
    const links = await (await fetch(baseUrl + "/api/affiliate-links")).json();
    assert.equal(links.links.length, 1);
    assert.equal(links.links[0].id, linkResult.id);

    const redirectLink = await fetch(baseUrl + "/r/" + linkResult.id, { redirect: "manual" });
    assert.equal(redirectLink.status, 302);
    assert.equal(redirectLink.headers.get("location"), linkPayload.url);

    const stats = await (await fetch(baseUrl + "/api/stats")).json();
    assert.equal(stats.offers, 1);
    assert.equal(stats.links, 1);
    assert.equal(stats.clicks, 2);
    assert.equal(stats.offerClicks, 1);
    assert.equal(stats.linkClicks, 1);

    console.log("Oferta Radar smoke test: OK (health, CORS, public offer, validation, public link, redirects, click stats).");
  } catch (error) {
    console.error(error);
    if (serverOutput) console.error(serverOutput);
    process.exitCode = 1;
  } finally {
    child.kill("SIGTERM");
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", resolve);
      setTimeout(() => resolve(), 2000);
    });
    fs.rmSync(directory, { recursive:true, force:true });
  }
})();
