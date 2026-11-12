import assert from "node:assert/strict"
import { mock, test } from "node:test"
import handler from "../pages/api/image/[id].js"

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    end() { return this },
    send(body) { this.body = body; return this },
  }
}

test("valid image ids fetch stable photos and return cacheable JPEGs", async () => {
  const urls = []
  const fetch = mock.method(globalThis, "fetch", async (url) => {
    urls.push(url)
    return { ok: true, arrayBuffer: async () => new Uint8Array([0xff, 0xd8]).buffer }
  })
  try {
    for (const id of [1, 2, 70, 1]) {
      const res = response()
      await handler({ method: "GET", query: { id: String(id), hop2: "0" } }, res)
      assert.equal(res.statusCode, 200)
      assert.equal(res.headers["Content-Type"], "image/jpeg")
      assert.equal(res.headers["Cache-Control"], "private, max-age=3600")
      assert.deepEqual(res.body, Buffer.from([0xff, 0xd8]))
    }
    assert.match(urls[0], /^https:\/\/images\.unsplash\.com\//)
    assert.notEqual(urls[0], urls[1])
    assert.equal(urls[0], urls[3])
  } finally {
    fetch.mock.restore()
  }
})

test("invalid requests and upstream failures do not return cacheable images", async () => {
  for (const request of [
    { method: "POST", query: { id: "1" } },
    { method: "GET", query: { id: "71" } },
  ]) {
    const res = response()
    await handler(request, res)
    assert.equal(res.statusCode, request.method === "POST" ? 405 : 400)
    assert.equal(res.headers["Cache-Control"], "no-store")
  }

  const fetch = mock.method(globalThis, "fetch", async () => ({ ok: false }))
  try {
    const res = response()
    await handler({ method: "GET", query: { id: "1", hop2: "0" } }, res)
    assert.equal(res.statusCode, 502)
    assert.equal(res.headers["Cache-Control"], "no-store")
  } finally {
    fetch.mock.restore()
  }
})
