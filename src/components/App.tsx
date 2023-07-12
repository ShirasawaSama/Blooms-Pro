import React, { useEffect, useState } from 'react'
// @ts-ignore
import uxp from 'uxp'
import Home from './Home'
import Options from './Options'
import photoshop from 'photoshop'
import { TimeCostContext } from '../utils'
import type { Document } from 'photoshop/dom/Document'
import lang from '../locales'

const events = ['layersFiltered', 'close', 'hostFocusChanged']
const App: React.FC = () => {
  const [currentDocument, setCurrentDocument] = React.useState<Document>(() => photoshop.app.activeDocument)
  const [mode, setMode] = React.useState(0)
  const obj = useState(0)

  const refresh = () => photoshop.app.activeDocument?.layers && setMode(photoshop.app.activeDocument.layers.some(it => it.name === 'BloomsPro_SourceLayer') ? 2 : 0)

  useEffect(() => {
    let lastDocument: Document
    const fn = () => {
      refresh()
      if (lastDocument === photoshop.app.activeDocument) return
      lastDocument = photoshop.app.activeDocument
      setCurrentDocument(lastDocument)
    }
    photoshop.action.addNotificationListener(events, fn)
    fn()
    return () => { photoshop.action.removeNotificationListener(events, fn) }
  }, [])

  return (
    <>
      <sp-body size='S' class='github'>Blooms Pro By:&nbsp;
        <a
          href='https://github.com/ShirasawaSama/Blooms-Pro'
          onClick={() => uxp.shell.openExternal('https://github.com/ShirasawaSama/Blooms-Pro', lang.thanksForStar)}
        >Shirasawa
        </a>
      </sp-body>
      <TimeCostContext.Provider value={[obj[0], obj[1]]}>
        {mode === 2 ? <Options key={currentDocument?.id} refresh={refresh} /> : <Home refresh={refresh} />}
      </TimeCostContext.Provider>
    </>
  )
}

export default App
