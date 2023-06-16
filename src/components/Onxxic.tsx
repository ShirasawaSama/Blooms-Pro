import React from 'react'
import Picker from './Picker'
import Slider from './Slider'
import Checkbox from './Checkbox'
import { app } from 'photoshop'
import { error, TimeCostContext } from '../utils'
import { getCurrentOptions, regenerate as _regenerate, GlowOptions, apply as _apply } from '../algorithms/onxxic'

const Onxxic: React.FC<{ refresh: () => void }> = ({ refresh }) => {
  const [time, setTime] = React.useContext(TimeCostContext)
  const options = getCurrentOptions()

  if (!options) return <div />

  let s = options.saturation / 100
  const v = options.lightness / 100

  const l = (2 - s) * v / 2

  if (l) {
    if (l === 1) {
      s = 0
    } else if (l < 0.5) {
      s = s * v / (l * 2)
    } else {
      s = s * v / (2 - l * 2)
    }
  }

  const apply = (isCancel = false) => _apply(isCancel).catch(e => {
    console.error(e)
    error(e.message)
  }).finally(refresh)

  async function regenerate (options: GlowOptions) {
    const oldTime = Date.now()
    try {
      try {
        await _regenerate(options)
      } catch (e: any) {
        console.error(e)
        error(e.message)
      }
    } finally {
      const time = Date.now() - oldTime
      setTime(old => old === time ? time + 1 : time)
    }
  }

  return (
    <div className='onxxic'>
      <div className='type'>
        <Picker
          placeholder='Mode'
          label='Mode'
          size='S'
          value={+(options.glowType === 'glare')}
          onChange={val => regenerate({ ...options, glowType: val ? 'glare' : 'bloom' })}
          class='mode'
        >
          <sp-menu-item> Bloom </sp-menu-item>
          <sp-menu-item> Glare </sp-menu-item>
        </Picker>
        {options.glowType === 'glare' && (
          <Picker
            placeholder='Ray Number'
            label='Ray Number'
            size='S'
            class='ray-number'
            value={+(options.rayNumber === 4)}
            onChange={val => regenerate({ ...options, rayNumber: val ? 4 : 2 })}
          >
            <sp-menu-item> 2 </sp-menu-item>
            <sp-menu-item> 4 </sp-menu-item>
          </Picker>
        )}
      </div>
      <sp-divider />
      <Slider
        value={options.intensity}
        value-label='%'
        label='Intensity'
        onChange={val => regenerate({ ...options, intensity: val })}
      />
      <Slider
        value={options.size}
        step={0.1}
        label='Size'
        onChange={val => regenerate({ ...options, size: val })}
      />
      <Slider
        value={options.threshold * 100 | 0}
        value-label='%'
        label='Threshold'
        onChange={val => regenerate({ ...options, threshold: val / 100 })}
      />
      <Slider
        value={options.brightness}
        max={255}
        label='Brightness'
        onChange={val => regenerate({ ...options, brightness: val })}
      />
      <Slider
        value={options.chromaticAberration}
        value-label='%'
        label='Chromatic Aberration'
        onChange={val => regenerate({ ...options, chromaticAberration: val })}
      />
      {options.glowType === 'glare' && (
        <>
          <sp-divider />
          <Slider
            value={options.angle}
            max={90}
            min={-90}
            value-label='°'
            label='Rotation'
            onChange={val => regenerate({ ...options, angle: val })}
          />
          <Slider
            value={options.detail}
            value-label='%'
            label='Post Blur'
            onChange={val => regenerate({ ...options, detail: val })}
          />
        </>
      )}
      <div className='bottom'>
        <sp-detail>{(time / 1000).toFixed(2)}s</sp-detail>
        <div>
          <sp-button variant='secondary' onClick={() => apply(true)} class='cancel'>Cancel</sp-button>
          <sp-button onClick={() => apply()}>Apply</sp-button>
        </div>
      </div>
      <div className='colorize'>
        {options.colorize && (
          <div
            className='picker'
            onClick={() => {
              const color = app.foregroundColor.hsb
              regenerate({ ...options, hue: color.hue, saturation: color.saturation, lightness: color.brightness })
            }}
            style={{ backgroundColor: `hsl(${options.hue}, ${s * 100}%, ${l * 100}%)` }}
          />
        )}
        <Checkbox
          class='checkbox'
          checked={options.colorize}
          onChange={colorize => {
            if (colorize) {
              const color = app.foregroundColor.rgb
              if (color.red || color.green || color.blue) {
                const color = app.foregroundColor.hsb
                regenerate({ ...options, hue: color.hue, saturation: color.saturation, lightness: color.brightness, colorize: true })
                return
              }
            }
            regenerate({ ...options, colorize })
          }}
        >Colorize
        </Checkbox>
      </div>
    </div>
  )
}

export default Onxxic
