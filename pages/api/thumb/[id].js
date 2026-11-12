import { randomUUID } from "node:crypto"

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store")
  if (request.method !== "GET") return response.status(405).end()
  const id = Number(request.query.id)
  if (!Number.isInteger(id) || id < 1 || id > 70) return response.status(400).end()
  const delay = Number(request.query.hop1)
  const hop1 = request.query.hop1 === undefined || !Number.isFinite(delay) ? 1500 : Math.min(30000, Math.max(0, delay))
  const hop2 = Number(request.query.hop2)
  const nextDelay = request.query.hop2 === undefined || !Number.isFinite(hop2) ? 500 : Math.min(30000, Math.max(0, hop2))
  await new Promise((resolve) => setTimeout(resolve, hop1))
  response.setHeader("Location", `/api/image/${id}?sig=${randomUUID()}&hop2=${nextDelay}`)
  return response.status(302).end()
}