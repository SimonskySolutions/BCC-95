import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Text } from 'lucide-react'
import DataTable from './DataTable'
import { useLanguage } from '../i18n/useLanguage.js'

function normalizeTitle(value) {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function isOverviewTitle(value) {
  const title = normalizeTitle(value)
  return [
    'процесна карта и описание на процесите в бкк 95 as/is',
    'цел на документа',
    'структура на документа',
    'част i: основен поток (value stream)',
    'част ii: осигуряващи процеси',
  ].some((candidate) => title === candidate)
}

export default function DocumentationPanel({ stats, library }) {
  const { t } = useLanguage()
  const documentationColumns = useMemo(
    () => [
      { key: 'sn', label: t('doc.colSn') },
      { key: 'doc', label: t('doc.colDocument') },
      { key: 'owner', label: t('doc.colOwner') },
      { key: 'version', label: t('doc.colVersion') },
      { key: 'updated', label: t('doc.colUpdated') },
      { key: 'status', label: t('doc.colStatus') },
    ],
    [t],
  )

  const [activeView, setActiveView] = useState('as-is')
  const [sections, setSections] = useState([])
  const [activeSectionId, setActiveSectionId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [denseMode, setDenseMode] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    if (activeView !== 'as-is') return
    let isCancelled = false

    async function loadAsIsDocument() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/docs/vsm-as-is.html')
        if (!response.ok) {
          throw new Error(`Failed to load AS-IS file (${response.status})`)
        }

        const rawHtml = await response.text()
        const parser = new DOMParser()
        const parsed = parser.parseFromString(rawHtml, 'text/html')
        const root =
          parsed.querySelector('#vsm-documentation-doc') ??
          parsed.querySelector('#vsm-documentation') ??
          parsed.body

        root.querySelectorAll('script, style, .reader-tools, .reader-toc, .section-tabs').forEach((node) => node.remove())

        const rawSections = Array.from(root.querySelectorAll('.doc-section'))
        const sectionFallback = (index) => `${t('doc.sectionFallback')} ${index + 1}`
        const mappedSections =
          rawSections.length > 0
            ? rawSections.map((section, index) => ({
                id: `asis-section-${index + 1}`,
                title: section.querySelector('h2, h3, h4')?.textContent?.trim() || sectionFallback(index),
                html: section.innerHTML,
                isOverview: isOverviewTitle(section.querySelector('h2, h3, h4')?.textContent?.trim()),
              }))
            : [
                {
                  id: 'asis-section-1',
                  title: t('doc.asIsFallbackTitle'),
                  html: root.innerHTML,
                  isOverview: true,
                },
              ]

        if (!isCancelled) {
          setSections(mappedSections)
          setActiveSectionId(mappedSections[0]?.id || '')
        }
      } catch (fetchError) {
        if (!isCancelled) {
          const message = fetchError instanceof Error ? fetchError.message : String(fetchError)
          setError(message || t('doc.loadError'))
          setSections([])
          setActiveSectionId('')
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadAsIsDocument()
    return () => {
      isCancelled = true
    }
  }, [activeView, t])

  const displayedSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const overviewSections = sections.filter((section) => section.isOverview)
    const nonOverviewSections = sections.filter((section) => !section.isOverview)

    const filteredNonOverview = query
      ? nonOverviewSections.filter((section) => section.title.toLowerCase().includes(query))
      : nonOverviewSections

    const overviewHint = t('doc.overviewTitle').toLowerCase()
    const includeOverview =
      overviewSections.length > 0 &&
      (!query ||
        overviewHint.includes(query) ||
        'overview'.includes(query) ||
        overviewSections.some((section) => section.title.toLowerCase().includes(query)))

    const combinedOverview = includeOverview
      ? {
          id: 'overview-combined',
          title: t('doc.overviewTitle'),
          html: overviewSections.map((section) => section.html).join(''),
          isOverview: true,
        }
      : null

    return combinedOverview ? [combinedOverview, ...filteredNonOverview] : filteredNonOverview
  }, [sections, searchQuery, t])

  const activeSection = useMemo(
    () => displayedSections.find((section) => section.id === activeSectionId) || displayedSections[0],
    [displayedSections, activeSectionId],
  )

  const activeIndex = useMemo(
    () => displayedSections.findIndex((section) => section.id === activeSection?.id),
    [displayedSections, activeSection],
  )

  const activeSectionContent = useMemo(() => {
    if (!activeSection) return { html: '', headings: [], words: 0 }
    const parser = new DOMParser()
    const sectionDoc = parser.parseFromString(`<div>${activeSection.html}</div>`, 'text/html')
    const wrapper = sectionDoc.body.firstElementChild
    if (!wrapper) return { html: activeSection.html, headings: [], words: 0 }
    const normalizeHeadingTitle = (value) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase()

    Array.from(wrapper.querySelectorAll('.step-item:not(.detail)')).forEach((item) => {
      const titleEl = item.querySelector(':scope > h4')
      const next = item.nextElementSibling
      const nextIsDetail = !!(
        next &&
        next.classList?.contains('step-item') &&
        next.classList?.contains('detail')
      )

      if (titleEl && nextIsDetail) {
        const body = sectionDoc.createElement('div')
        body.className = 'collapsible-body'
        body.innerHTML = next.innerHTML

        const detailTopHeading = body.querySelector(':scope > h4')
        if (
          detailTopHeading &&
          normalizeHeadingTitle(detailTopHeading.textContent) === normalizeHeadingTitle(titleEl.textContent)
        ) {
          detailTopHeading.remove()
        }

        item.classList.add('collapsible')
        item.appendChild(body)
        next.remove()
        return
      }

      const bodyCandidates = Array.from(item.children).filter((child) => child !== titleEl)
      const hasInlineBody = bodyCandidates.some((child) =>
        ['H5', 'P', 'UL', 'OL', 'TABLE', 'DIV'].includes(child.tagName),
      )
      if (titleEl && hasInlineBody && bodyCandidates.length > 0) {
        const body = sectionDoc.createElement('div')
        body.className = 'collapsible-body'
        bodyCandidates.forEach((child) => body.appendChild(child))
        item.classList.add('collapsible')
        item.appendChild(body)
      }
    })

    const stepItems = Array.from(wrapper.querySelectorAll('.step-item:not(.detail)'))
    const byCode = new Map()
    stepItems.forEach((item) => {
      const titleText = item.querySelector(':scope > h4')?.textContent?.trim() || ''
      const codeMatch = titleText.match(/^(\d+\.\d+)/)
      const codeKey = codeMatch ? codeMatch[1] : null
      if (!codeKey) return

      const bodyText = item.querySelector('.collapsible-body')?.textContent?.trim() || ''
      const score = bodyText.length + (item.classList.contains('collapsible') ? 10000 : 0)
      const previous = byCode.get(codeKey)
      if (!previous || score > previous.score) {
        byCode.set(codeKey, { item, score })
      }
    })

    stepItems.forEach((item) => {
      const titleText = item.querySelector(':scope > h4')?.textContent?.trim() || ''
      const codeMatch = titleText.match(/^(\d+\.\d+)/)
      const codeKey = codeMatch ? codeMatch[1] : null
      if (!codeKey) return
      const selected = byCode.get(codeKey)?.item
      if (selected && selected !== item) {
        item.remove()
      }
    })

    const headings = []
    const seenOutlineTitles = new Set()
    const seenOutlineCodes = new Set()
    Array.from(wrapper.querySelectorAll('h3, h4')).forEach((heading) => {
      if (heading.closest('.collapsible-body')) return
      const normalized = normalizeHeadingTitle(heading.textContent)
      if (!normalized) return
      const codeMatch = normalized.match(/^(\d+\.\d+)/)
      const codeKey = codeMatch ? codeMatch[1] : null
      if (codeKey && seenOutlineCodes.has(codeKey)) return
      if (seenOutlineTitles.has(normalized)) return
      if (codeKey) seenOutlineCodes.add(codeKey)
      seenOutlineTitles.add(normalized)
      const id = `section-anchor-${headings.length + 1}`
      heading.id = id
      headings.push({
        id,
        title: heading.textContent?.trim() || `${t('doc.topicFallback')} ${headings.length + 1}`,
      })
    })

    const words = (wrapper.textContent || '').trim().split(/\s+/).filter(Boolean).length
    return {
      html: wrapper.innerHTML,
      headings,
      words,
    }
  }, [activeSection, t])

  const estimatedReadMinutes = useMemo(() => {
    if (!activeSectionContent.words) return 0
    return Math.max(1, Math.round(activeSectionContent.words / 180))
  }, [activeSectionContent.words])

  const isOverviewActive = !!activeSection?.isOverview

  useEffect(() => {
    if (!displayedSections.length) {
      setActiveSectionId('')
      return
    }
    const activeExists = displayedSections.some((section) => section.id === activeSectionId)
    if (!activeExists) {
      setActiveSectionId(displayedSections[0].id)
    }
  }, [displayedSections, activeSectionId])

  useEffect(() => {
    const root = contentRef.current
    if (!root) return undefined

    root.querySelectorAll('.step-item.detail').forEach((node) => {
      node.classList.remove('open')
    })
    root.querySelectorAll('.step-item.bar').forEach((node) => {
      node.classList.remove('open')
    })

    function handleBarClick(event) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('a, button, input, textarea, select, summary')) return

      const clickedStep = target.closest('.step-item.collapsible')
      if (!clickedStep || !root.contains(clickedStep)) return

      const shouldOpen = !clickedStep.classList.contains('open')
      root.querySelectorAll('.step-item.collapsible.open').forEach((node) => node.classList.remove('open'))
      if (shouldOpen) {
        clickedStep.classList.add('open')
        clickedStep.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }

    root.addEventListener('click', handleBarClick)
    return () => root.removeEventListener('click', handleBarClick)
  }, [activeSectionContent.html, denseMode])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t('doc.hubTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('doc.hubSubtitle')}</p>
          </div>
          <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setActiveView('as-is')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeView === 'as-is' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('doc.asIs')}
            </button>
            <button
              type="button"
              onClick={() => setActiveView('to-be')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeView === 'to-be' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('doc.toBe')}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        {activeView === 'as-is' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{t('doc.integratedTitle')}</h3>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('doc.searchPlaceholder')}
                className="h-9 w-full max-w-xs rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {loading ? (
              <div className="flex h-80 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                <span className="inline-flex items-center gap-2 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  {t('doc.loading')}
                </span>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="max-h-[72vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <div className="sticky top-0 z-10 mb-2 rounded-lg bg-slate-50 px-2 pb-2 pt-1 text-xs text-slate-500">
                    {displayedSections.length} {t('doc.sectionsCount')}
                  </div>
                  {displayedSections.map((section, index) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSectionId(section.id)}
                      className={`mb-1 w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        activeSection?.id === section.id
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="mr-2 text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                      {section.title}
                    </button>
                  ))}
                </aside>

                <article
                  className={`vsm-content max-h-[72vh] overflow-auto rounded-xl border border-slate-200 bg-white p-5 ${denseMode ? 'vsm-content--dense' : ''}`}
                >
                  {activeSection ? (
                    <div className="space-y-4">
                      {isOverviewActive ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {t('doc.overviewSection')}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{t('doc.overviewBody')}</p>
                        </div>
                      ) : (
                        <div className="-mx-5 mb-2 border-b border-slate-200 bg-white/95 px-5 pb-3 pt-1 backdrop-blur">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h4 className="text-base font-semibold text-slate-900">{activeSection.title}</h4>
                              <p className="text-xs text-slate-500">
                                {activeSectionContent.words.toLocaleString()} {t('doc.words')} · ~{estimatedReadMinutes}{' '}
                                {t('doc.minRead')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setDenseMode((value) => !value)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                <Text size={13} />
                                {denseMode ? t('doc.comfort') : t('doc.dense')}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                const prev = displayedSections[activeIndex - 1]
                                if (prev) setActiveSectionId(prev.id)
                              }}
                              disabled={activeIndex <= 0}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ChevronLeft size={14} />
                              {t('doc.previous')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = displayedSections[activeIndex + 1]
                                if (next) setActiveSectionId(next.id)
                              }}
                              disabled={activeIndex < 0 || activeIndex >= displayedSections.length - 1}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t('doc.next')}
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div ref={contentRef} dangerouslySetInnerHTML={{ __html: activeSectionContent.html }} />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">{t('doc.noSections')}</p>
                  )}
                </article>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            {t('doc.toBePlaceholder')}{' '}
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs text-slate-700">public/docs/vsm-to-be.html</code>{' '}
            {t('doc.toBePlaceholderSuffix')}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{item.value}</p>
            <p className="mt-2 text-xs text-slate-500">{item.note}</p>
          </article>
        ))}
      </section>

      <DataTable
        title={t('doc.libraryTitle')}
        subtitle={t('doc.librarySubtitle')}
        columns={documentationColumns}
        rows={library}
      />
    </div>
  )
}
