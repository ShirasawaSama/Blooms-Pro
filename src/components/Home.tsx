import React from 'react'
import { error, TimeCostContext } from '../utils'
import { generate } from '../algorithm'
import lang from '../locales'

const Home: React.FC<{ refresh: () => void }> = ({ refresh }) => {
  const [, setTime] = React.useContext(TimeCostContext)
  return (
    <div className='home'>
      <sp-button
        onClick={async () => {
          const oldTime = Date.now()
          try {
            await generate()
          } catch (e: any) {
            console.error(e)
            error(e.message)
          }
          setTime(Date.now() - oldTime)
          refresh()
        }}
      >{lang.bloom}
      </sp-button>
      <sp-checkbox
        checked={localStorage.getItem('enableMask') === 'true' || undefined}
        onClick={(e: any) => localStorage.setItem('enableMask', e.target.checked.toString())}
      >{lang.enableMask}
      </sp-checkbox>
    </div>
  )
}

export default Home
