import { React } from './react.js'
import { translate } from './i18n.js'
import { NativeOpenUIRenderer } from './native-answer.js'
import { openuiResultsForTurn } from './tool-results.js'
import { insertOpenUIFollowUp } from './follow-up.js'
import { getRenderCSSPath } from './render-css.js'
import { SidebarIcon } from './icons.js'

/** The main answer lives after the completed turn, outside folded process rows. */
export function OpenUITurnAnswer({ turn, seq, useChat, useInput, inputActions, openFile }) {
  const nodes = useChat(snapshot => snapshot.nodes)
  const results = React.useMemo(() => openuiResultsForTurn(nodes.values(), turn.turn, {
    startSeq: turn.start?.seq,
    endSeq: seq,
  }), [nodes, turn.turn, turn.start?.seq, seq])
  if (!results.length) return null
  return <OpenUIAnswers results={results} useInput={useInput} inputActions={inputActions} openFile={openFile} />
}

function OpenUIAnswers({ results, useInput, inputActions, openFile }) {
  const input = useInput(snapshot => snapshot)
  const inputRef = React.useRef(input)
  inputRef.current = input
  const [openError, setOpenError] = React.useState('')
  const onAction = React.useCallback(prompt => {
    insertOpenUIFollowUp(inputActions, inputRef.current, prompt)
  }, [inputActions])
  const openCSS = React.useCallback(async () => {
    try {
      const path = await getRenderCSSPath()
      if (!openFile) throw new Error('无法打开样式文件')
      await openFile(path)
      setOpenError('')
    } catch (error) {
      setOpenError(error?.message ?? '无法打开样式文件')
    }
  }, [openFile])
  const answers = React.useMemo(() => results.map(result =>
    <section className="openui-answer" aria-label="OpenUI Studio" key={result.id}>
      <div className="openui-answer-header">
        <button className="openui-answer-edit" type="button" title="打开 render.css" aria-label="打开 OpenUI 样式文件" onClick={openCSS}>
          <SidebarIcon size={15} />
        </button>
        <span>OpenUI Studio</span>
        {openError && <span className="openui-answer-error" role="alert">{openError}</span>}
      </div>
      <div className="openui-answer-content">
        <NativeOpenUIRenderer source={result.text} onAction={onAction} />
      </div>
    </section>), [results, onAction, openCSS, openError])
  return <div className="openui-turn-answers">{answers}</div>
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
