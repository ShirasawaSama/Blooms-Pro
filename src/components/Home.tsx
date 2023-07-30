import React from 'react'
import { app, core } from 'photoshop'
import { error, TimeCostContext } from '../utils'
import { generate, openElement, toFullOptions } from '../algorithm'
import lang from '../locales'

const Home: React.FC<{ refresh: () => void }> = ({ refresh }) => {
  const [, setTime] = React.useContext(TimeCostContext)
  return (
    <div className='home'>
      <div>
        <sp-button
          onClick={async () => {
            const oldTime = Date.now()
            try {
              const options = localStorage.getItem('options')
              await generate(options ? toFullOptions(JSON.parse(options)) : undefined)
            } catch (e: any) {
              console.error(e)
              error(e.message)
            }
            setTime(Date.now() - oldTime)
            refresh()
          }}
        >{lang.bloom}
        </sp-button>
        <sp-button
          variant='secondary'
          onClick={async () => {
            const oldTime = Date.now()
            try {
              const layer = app.activeDocument.activeLayers[0]
              if (layer) {
                await core.executeAsModal(() => openElement(layer.name).catch(console.error), { commandName: 'BloomsPro - openElement' })
              }
            } catch (e: any) {
              console.error(e)
              error(e.message)
            }
            setTime(Date.now() - oldTime)
            refresh()
          }}
        >{lang.edit}
        </sp-button>
      </div>
      <sp-checkbox
        style={{ margin: '6px 14px' }}
        checked={localStorage.getItem('enableMask') === 'true' || undefined}
        onClick={(e: any) => localStorage.setItem('enableMask', e.target.checked.toString())}
      >{lang.enableMask}
      </sp-checkbox>
    </div>
  )
}

export default Home
