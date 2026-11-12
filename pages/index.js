import { Activity } from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

const PAGE_SIZE = 7
const PAGE_COUNT = 10
const MODES = ["baseline", "preload", "activity"]

function delayValue(value, fallback) {
  if (value === null || value === "" || !Number.isFinite(Number(value))) return fallback
  return Math.min(30000, Math.max(0, Number(value)))
}

function thumbnailUrl(id, settings) {
  return `/api/thumb/${id}?hop1=${settings.hop1}&hop2=${settings.hop2}`
}

function rowsForPage(rows, page) {
  return rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
}

export default function Home() {
  const [settings, setSettings] = useState(null)
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [keepVisited, setKeepVisited] = useState(false)
  const [visited, setVisited] = useState([1])
  const [log, setLog] = useState([])
  const measurements = useRef([])
  const active = useRef(null)
  const observer = useRef(null)
  const nextId = useRef(0)
  const logGeneration = useRef(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedMode = params.get("mode")
    setSettings({
      mode: MODES.includes(requestedMode) ? requestedMode : "baseline",
      hop1: delayValue(params.get("hop1"), 1500),
      hop2: delayValue(params.get("hop2"), 500),
    })
    setRows(Array.from({ length: 70 }, (_, index) => ({
      id: index + 1,
      label: `Image ${String(index + 1).padStart(2, "0")}`,
      time: `${String(9 + Math.floor(index / 12)).padStart(2, "0")}:${String((index % 12) * 5).padStart(2, "0")}`,
    })))
  }, [])

  useEffect(() => {
    if (!window.PerformanceObserver) return
    const countEntries = (entries) => {
      entries.forEach((entry) => {
        const path = new URL(entry.name, window.location.href).pathname
        measurements.current.forEach((measurement) => {
          if (path.startsWith("/api/thumb/")) {
            if (entry.startTime >= measurement.start && entry.startTime <= measurement.end) measurement.thumb += 1
            if (entry.redirectEnd > entry.redirectStart && entry.redirectEnd >= measurement.start && entry.redirectEnd <= measurement.end) measurement.image += 1
          } else if (path.startsWith("/api/image/") && entry.startTime >= measurement.start && entry.startTime <= measurement.end) {
            measurement.image += 1
          }
        })
      })
    }
    const resourceObserver = new PerformanceObserver((list) => countEntries(list.getEntries()))
    resourceObserver.observe({ type: "resource", buffered: true })
    observer.current = { instance: resourceObserver, countEntries }
    return () => {
      resourceObserver.disconnect()
      observer.current = null
    }
  }, [])

  useEffect(() => {
    if (!settings || settings.mode !== "preload" || page === PAGE_COUNT) return
    const images = rowsForPage(rows, page + 1).map((row) => {
      const image = new Image()
      image.src = thumbnailUrl(row.id, settings)
      return image
    })
    return () => images.forEach((image) => { image.src = "" })
  }, [page, rows, settings])

  function finishMeasurement(measurement, interrupted = false) {
    if (!measurement || measurement.finished) return
    measurement.finished = true
    measurement.end = performance.now()
    if (active.current === measurement) active.current = null
    window.setTimeout(() => {
      if (observer.current) observer.current.countEntries(observer.current.instance.takeRecords())
      measurements.current = measurements.current.filter((item) => item !== measurement)
      if (measurement.generation !== logGeneration.current) return
      setLog((previous) => [{
        id: measurement.id, mode: measurement.mode, from: measurement.from, to: measurement.to,
        duration: Math.round(measurement.end - measurement.start),
        thumb: measurement.thumb, image: measurement.image, interrupted,
      }, ...previous])
    }, 100)
  }

  function markLoaded(id, imagePage) {
    const measurement = active.current
    if (!measurement || measurement.to !== imagePage) return
    measurement.pending.delete(id)
    if (measurement.pending.size === 0) finishMeasurement(measurement)
  }

  useLayoutEffect(() => {
    const measurement = active.current
    if (!measurement || measurement.to !== page) return
    document.querySelectorAll(`tbody[data-page="${page}"] img`).forEach((image) => {
      if (image.complete) markLoaded(Number(image.dataset.id), page)
    })
  }, [page, settings])

  function changePage(nextPage) {
    if (nextPage === page || nextPage < 1 || nextPage > PAGE_COUNT) return
    finishMeasurement(active.current, true)
    const measurement = {
      id: nextId.current++, generation: logGeneration.current, mode: settings.mode, from: page, to: nextPage,
      start: performance.now(), end: Infinity, thumb: 0, image: 0,
      pending: new Set(rowsForPage(rows, nextPage).map((row) => row.id)), finished: false,
    }
    measurements.current.push(measurement)
    active.current = measurement
    setVisited((previous) => previous.includes(nextPage) ? previous : [...previous, nextPage])
    setPage(nextPage)
  }

  function changeMode(mode) {
    if (mode === settings.mode) return
    finishMeasurement(active.current, true)
    const url = new URL(window.location.href)
    url.searchParams.set("mode", mode)
    window.history.replaceState(null, "", url)
    setSettings((previous) => ({ ...previous, mode }))
    setPage(1)
    setVisited([1])
  }

  function clearLog() {
    logGeneration.current += 1
    measurements.current = []
    active.current = null
    setLog([])
  }

  const renderedPages = settings?.mode === "activity"
    ? [...new Set([page, ...(page < PAGE_COUNT ? [page + 1] : []), ...(keepVisited ? visited : [])])].sort((a, b) => a - b)
    : [page]

  return (
    <main className="min-h-screen bg-[#f5f6f4] text-[#202724]">
      <div className="mx-auto max-w-295 px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#d9dfd9] pb-7">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-[#52735f]"><span className="h-2 w-2 rounded-full bg-[#619b75]" /> Performance lab</div>
            <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Image pagination</h1>
            <p className="mt-2 text-sm text-[#69746d]">Compare how thumbnails load between pages.</p>
          </div>
          {settings && <div className="flex gap-5 text-xs text-[#68746c]"><span>Hop 1 <strong className="ml-1 font-mono text-[#293b30]">{settings.hop1} ms</strong></span><span>Hop 2 <strong className="ml-1 font-mono text-[#293b30]">{settings.hop2} ms</strong></span></div>}
        </header>

        {settings && <>
          <section className="flex flex-wrap items-center justify-between gap-4 py-6" aria-label="Loading mode">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-bold uppercase text-[#6e7971]">Loading mode</span>
              <div className="inline-flex rounded-md border border-[#d6ddd6] bg-white p-1" role="group" aria-label="Loading mode">
                {MODES.map((mode) => <button key={mode} type="button" onClick={() => changeMode(mode)} aria-pressed={settings.mode === mode} className={`rounded px-4 py-2 text-sm font-medium capitalize transition-colors ${settings.mode === mode ? "bg-[#243c30] text-white" : "text-[#66736a] hover:bg-[#f1f4f1]"}`}>{mode}</button>)}
              </div>
            </div>
            {settings.mode === "activity" && <label className="flex cursor-pointer items-center gap-2 text-sm text-[#536158]"><input type="checkbox" checked={keepVisited} onChange={(event) => setKeepVisited(event.target.checked)} className="h-4 w-4 accent-[#315d42]" /> Keep visited pages</label>}
          </section>

          <section className="overflow-hidden rounded-md border border-[#d9dfd9] bg-white" aria-label="Image table">
            <div className="flex items-center justify-between border-b border-[#e5e9e5] px-5 py-4 sm:px-6">
              <div><h2 className="text-base font-semibold">Image library</h2><p className="mt-1 text-xs text-[#7b867e]">70 items <span className="px-1">/</span> 7 per page</p></div>
              <span className="rounded bg-[#eff4ef] px-2.5 py-1 font-mono text-xs text-[#54715c]">{String(page).padStart(2, "0")} / 10</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-127.5 table-fixed text-left">
                <thead className="border-b border-[#e8ece8] bg-[#fafbfa] text-[11px] font-semibold uppercase text-[#8a948c]"><tr><th className="w-[42%] px-6 py-3">Label</th><th className="px-4 py-3">Time</th><th className="w-56 px-4 py-3">Thumbnail</th></tr></thead>
                {renderedPages.map((renderedPage) => {
                  const body = <tbody key={renderedPage} data-page={renderedPage} className="divide-y divide-[#edf0ed]">{rowsForPage(rows, renderedPage).map((row) => <tr key={row.id} className="text-sm"><td className="px-6 py-3 font-medium"><span className="mr-3 font-mono text-xs text-[#a2aba3]">{String(row.id).padStart(2, "0")}</span>{row.label}</td><td className="px-4 py-3 font-mono text-xs text-[#7b877d]">{row.time}</td><td className="px-4 py-3"><div className="aspect-video w-45 overflow-hidden rounded-sm bg-[#e1e5e1]"><img data-id={row.id} src={thumbnailUrl(row.id, settings)} alt={row.label} loading={renderedPage === page ? "lazy" : "eager"} onLoad={() => markLoaded(row.id, renderedPage)} onError={() => markLoaded(row.id, renderedPage)} className="h-full w-full object-cover" /></div></td></tr>)}</tbody>
                  return settings.mode === "activity" ? <Activity key={renderedPage} mode={renderedPage === page ? "visible" : "hidden"}>{body}</Activity> : body
                })}
              </table>
            </div>
            <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e9e5] px-5 py-4 sm:px-6">
              <button type="button" disabled={page === 1} onClick={() => changePage(page - 1)} className="rounded border border-[#dce2dc] px-3 py-2 text-xs font-medium text-[#47574d] hover:bg-[#f4f7f4] disabled:opacity-35">&larr; Previous</button>
              <div className="flex flex-wrap gap-1">{Array.from({ length: PAGE_COUNT }, (_, index) => index + 1).map((number) => <button key={number} type="button" onClick={() => changePage(number)} aria-current={page === number ? "page" : undefined} aria-label={`Page ${number}`} className={`h-8 w-8 rounded text-xs font-medium ${page === number ? "bg-[#315d42] text-white" : "text-[#748077] hover:bg-[#eff3ef]"}`}>{number}</button>)}</div>
              <button type="button" disabled={page === PAGE_COUNT} onClick={() => changePage(page + 1)} className="rounded border border-[#dce2dc] px-3 py-2 text-xs font-medium text-[#47574d] hover:bg-[#f4f7f4] disabled:opacity-35">Next &rarr;</button>
            </nav>
          </section>

          <section className="mt-9" aria-label="Measurement log">
            <div className="flex items-end justify-between gap-4 border-b border-[#d9dfd9] pb-4"><div><div className="mb-1 text-xs font-bold uppercase text-[#829087]">Results</div><h2 className="font-serif text-2xl font-semibold">Measurement log</h2></div><button type="button" onClick={clearLog} className="rounded border border-[#d6ddd6] bg-white px-3 py-2 text-xs font-medium text-[#526258] hover:bg-[#f1f4f1]">Clear log</button></div>
            <p className="mt-3 text-xs leading-5 text-[#7b867e]">Requests are observed resource entries started during each transition. Image redirects are inferred from resource timing; entries still in flight may not be counted.</p>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-140 text-left text-sm"><thead className="text-[11px] font-semibold uppercase text-[#929c94]"><tr><th className="py-3">Mode</th><th>Transition</th><th>All images</th><th>Thumb requests</th><th>Image requests</th></tr></thead><tbody className="divide-y divide-[#e2e7e2]">{log.map((entry) => <tr key={entry.id} className="text-[#536158]"><td className="py-3 capitalize">{entry.mode}</td><td className="font-mono text-xs">{entry.from} &rarr; {entry.to}</td><td className="font-mono text-xs">{entry.interrupted ? "Interrupted" : `${entry.duration} ms`}</td><td className="font-mono text-xs">{entry.thumb}</td><td className="font-mono text-xs">{entry.image}</td></tr>)}</tbody></table>{log.length === 0 && <p className="border-t border-[#e2e7e2] py-8 text-center text-sm text-[#a0a9a1]">No page changes recorded yet.</p>}</div>
          </section>
        </>}
      </div>
    </main>
  )
}