import { React } from './react.js'
import { translate } from './i18n.js'
import { NativeOpenUIRenderer } from './native-answer.js'
import { openuiResultsForTurn } from './tool-results.js'
import { focusDSHComposer, insertOpenUIFollowUp } from './follow-up.js'
import { getRenderSettingsPath, useRenderSettings } from './render-settings.js'
import { SidebarIcon } from './icons.js'
import { DRAWING_AGENTS, playDrawingReveal } from './drawing-reveal.js'
import { Bug, Download, RotateCw } from 'lucide-react'

/** The main answer lives after the completed turn, outside folded process rows. */
export function OpenUITurnAnswer({ turn, seq, useChat, useInput, inputActions, openFile }) {
  const liveTurn = React.useRef({ number: turn.turn, seen: turn.status !== 'closed' })
  if (liveTurn.current.number !== turn.turn) liveTurn.current = { number: turn.turn, seen: turn.status !== 'closed' }
  if (turn.status !== 'closed') liveTurn.current.seen = true
  const nodes = useChat(snapshot => snapshot.nodes)
  const results = React.useMemo(() => openuiResultsForTurn(nodes.values(), turn.turn, {
    startSeq: turn.start?.seq,
    endSeq: seq,
  }), [nodes, turn.turn, turn.start?.seq, seq])
  if (!results.length) return null
  return <OpenUIAnswers results={results} animateNew={liveTurn.current.seen} useInput={useInput} inputActions={inputActions} openFile={openFile} />
}

function OpenUIAnswers({ results, animateNew, useInput, inputActions, openFile }) {
  const input = useInput(snapshot => snapshot)
  const inputRef = React.useRef(input)
  inputRef.current = input
  const [openError, setOpenError] = React.useState('')
  const onAction = React.useCallback(prompt => {
    insertOpenUIFollowUp(inputActions, inputRef.current, prompt)
    focusDSHComposer()
  }, [inputActions])
  const openSettings = React.useCallback(async () => {
    try {
      const path = await getRenderSettingsPath()
      if (!openFile) throw new Error(translate('error.openConfig'))
      await openFile(path)
      setOpenError('')
    } catch (error) {
      setOpenError(error?.message ?? translate('error.openConfig'))
    }
  }, [openFile])
  return <div className="openui-turn-answers">{results.map(result =>
    <OpenUIAnswer key={result.id} result={result} animateNew={animateNew} onAction={onAction} openSettings={openSettings} openError={openError} />
  )}</div>
}

function OpenUIAnswer({ result, animateNew, onAction, openSettings, openError }) {
  const { config, error: settingsError } = useRenderSettings()
  const content = React.useRef(null)
  const debugReplay = React.useRef(false)
  const animate = React.useRef(animateNew && config.animation.autoPlay).current
  const [revision, setRevision] = React.useState(0)
  const [debugging, setDebugging] = React.useState(false)
  const [debugReport, setDebugReport] = React.useState(null)
  React.useLayoutEffect(() => {
    if (!animate && !revision) return
    const debug = debugReplay.current
    debugReplay.current = false
    return playDrawingReveal(content.current, {
      fromStart: true,
      requireFocus: revision === 0,
      followScroll: config.animation.followScroll,
      debug,
      onDebugComplete: debug ? events => {
        setDebugReport(events)
        setDebugging(false)
      } : undefined,
    })
  }, [animate, result.id, revision])
  const replay = React.useCallback(() => setRevision(value => value + 1), [])
  const recordDebug = React.useCallback(() => {
    debugReplay.current = true
    setDebugReport(null)
    setDebugging(true)
    setRevision(value => value + 1)
  }, [])
  const downloadDebug = React.useCallback(() => {
    if (!debugReport) return
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, events: debugReport }, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `openui-drawing-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [debugReport])
  const toolbar = config.toolbar.map(action => {
    if (action === 'replay') return <button key={action} className="openui-answer-replay" type="button" title={translate('toolbar.replay')} aria-label={translate('toolbar.replay')} onClick={replay}>
      <RotateCw size={15} strokeWidth={1.8} aria-hidden="true" />
    </button>
    if (action === 'debug') return <button key={action} className="openui-answer-replay" type="button" title={translate('toolbar.debug')} aria-label={translate('toolbar.debug')} aria-busy={debugging} disabled={debugging} onClick={recordDebug}>
      <Bug size={15} strokeWidth={1.8} aria-hidden="true" />
    </button>
    if (action === 'download-log' && debugReport) return <button key={action} className="openui-answer-replay" type="button" title={translate('toolbar.download')} aria-label={translate('toolbar.download')} onClick={downloadDebug}>
      <Download size={15} strokeWidth={1.8} aria-hidden="true" />
    </button>
    return null
  })
  return <section className="openui-answer" aria-label="OpenUI Studio">
      <div className="openui-answer-header">
        {config.showEditButton && <button className="openui-answer-edit" type="button" title={translate('toolbar.edit')} aria-label={translate('toolbar.edit')} onClick={openSettings}>
          <SidebarIcon size={15} />
        </button>}
        <span>OpenUI Studio</span>
        {toolbar}
        {openError && <span className="openui-answer-error" role="alert">{openError}</span>}
        {settingsError && <span className="openui-answer-error" role="alert">render.js: {settingsError}</span>}
      </div>
      <div className="openui-answer-content" ref={content}>
        <NativeOpenUIRenderer key={revision} source={result.text} onAction={onAction} />
        <div className="openui-drawing-frame" aria-hidden="true"><i /><i /><i /><i /></div>
        {DRAWING_AGENTS.map(agent => <div className="openui-drawing-cursor" data-openui-agent={agent.id} key={agent.id} style={{ '--openui-drawing-color': agent.color }} aria-hidden="true">
          <span className="openui-drawing-cursor__caret" />
          <svg viewBox="0 0 20 24"><path d="M2 1.5 17.5 14l-6.7.7 3.5 7.1-3.1 1.5-3.5-7.1-4.3 5.1Z" /></svg>
          <span className="openui-drawing-cursor__flag"><b>{translate(agent.nameKey)}</b><em className="openui-drawing-cursor__activity" /></span>
        </div>)}
      </div>
    </section>
}

/** Keep the process row small; the result itself renders in the answer area. */
export function OpenUIToolStatus({ phase, block }) {
  if (phase === 'result' && !block.isError) return null
  const failed = phase === 'result' && block.isError
  return <span className="openui-tool-status" role={failed ? 'alert' : 'status'}>
    <SidebarIcon size={14} />
    {failed ? translate('status.error') : translate('busy.label')}
  </span>
}
