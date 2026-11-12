/**
 * Fetch a Picsum JPEG after hop2 and return it with a private one-hour cache policy.
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
    const image = await fetch(`https://picsum.photos/id/${id}/320/180`, { cache: "no-store" })
    if (!image.ok) return response.status(502).end()
    const bytes = Buffer.from(await image.arrayBuffer())
    response.setHeader("Content-Type", "image/jpeg")
    response.setHeader("Cache-Control", "private, max-age=3600")
    return response.status(200).send(bytes)
  } catch {
    return response.status(502).end()
  }
}