import React from 'react'
import { error, TimeCostContext } from '../utils'
import { generate } from '../algorithms/onxxic'
import lang from '../locales'

const Home: React.FC<{ refresh: () => void }> = ({ refresh }) => {
  const [, setTime] = React.useContext(TimeCostContext)
  return (
    <div className='home'>
      <sp-button
        onClick={async () => {
          try {
            const oldTime = Date.now()
            if (localStorage.getItem('oMode') === 'true') await generate()
            setTime(Date.now() - oldTime)
          } catch (e: any) {
            console.error(e)
            error(e.message)
          }
          refresh()
        }}
      >{lang.bloom}
      </sp-button>
      <sp-checkbox
        checked={localStorage.getItem('oMode') === 'true' || undefined}
        onClick={(e: any) => localStorage.setItem('oMode', e.target.checked.toString())}
      >O {lang.mode}
      </sp-checkbox>
    </div>
  )
}

export default Home
