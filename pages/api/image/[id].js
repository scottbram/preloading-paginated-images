const PHOTOS = [
  "photo-1500530855697-b586d89ba3ee",
  "photo-1470770841072-f978cf4d019e",
  "photo-1500534623283-312aade485b7",
  "photo-1470252649378-9c29740c9fa8",
  "photo-1464822759023-fed622ff2c3b",
  "photo-1441974231531-c6227db76b6e",
  "photo-1472214103451-9374bd1c798e",
  "photo-1501785888041-af3ef285b470",
  "photo-1511497584788-876760111969",
  "photo-1447752875215-b2761acb3c5d",
]

/**
 * Fetch an Unsplash JPEG after hop2 and return it with a private one-hour cache policy.
 * Invalid ids and upstream failures return an error instead of a cacheable image.
 * @param {import("next").NextApiRequest} request
 * @param {import("next").NextApiResponse} response
 */
export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store")
  if (request.method !== "GET") return response.status(405).end()
  const id = Number(request.query.id)
  if (!Number.isInteger(id) || id < 1 || id > 70) return response.status(400).end()
  const delay = Number(request.query.hop2)
  const hop2 = request.query.hop2 === undefined || !Number.isFinite(delay) ? 500 : Math.min(30000, Math.max(0, delay))
  await new Promise((resolve) => setTimeout(resolve, hop2))
  try {
    const photo = PHOTOS[(id - 1) % PHOTOS.length]
    const image = await fetch(`https://images.unsplash.com/${photo}?w=320&h=180&fit=crop`, { cache: "no-store" })
    if (!image.ok) return response.status(502).end()
    const bytes = Buffer.from(await image.arrayBuffer())
    response.setHeader("Content-Type", "image/jpeg")
    response.setHeader("Cache-Control", "private, max-age=3600")
    return response.status(200).send(bytes)
  } catch {
    return response.status(502).end()
  }
}