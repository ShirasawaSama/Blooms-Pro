import React from 'react'
import Picker from './Picker'
import Slider from './Slider'
import Checkbox from './Checkbox'
import lang from '../locales'
import { app, core } from 'photoshop'
import { error, TimeCostContext } from '../utils'
import { getCurrentOptions, regenerate as _regenerate, GlowOptions, apply as _apply, getRangeLayer, getGroup } from '../algorithm'

const glareTimes = [2, 4]
const bloomTimes = [1, 2, 3, 4, 5, 6, 7, 8]

const Options: React.FC<{ refresh: () => void }> = ({ refresh }) => {
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

  const apply = (isCancel = false) => _apply(localStorage.getItem('enableMask') === 'true', isCancel).catch(e => {
    console.error(e)
    error(e.message)
  }).finally(refresh)

  async function regenerate (options?: GlowOptions) {
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
    <div className='options'>
      <div className='type'>
        <Picker
          placeholder={lang.mode}
          label={lang.mode}
          size='S'
          value={options.glowType === 'bloom-soft' ? 1 : options.glowType === 'bloom' ? 0 : 2}
          onChange={val => regenerate({ ...options, glowType: val === 1 ? 'bloom-soft' : val === 0 ? 'bloom' : 'glare' })}
          class='mode'
        >
          <sp-menu-item> {lang.types.bloom} </sp-menu-item>
          <sp-menu-item> {lang.types.bloomSoft} </sp-menu-item>
          <sp-menu-item> {lang.types.glare} </sp-menu-item>
        </Picker>
        <Picker
          placeholder={options.glowType === 'glare' ? lang.glare.rayCount : lang.blurTimes}
          label={options.glowType === 'glare' ? lang.glare.rayCount : lang.blurTimes}
          size='S'
          class='ray-number'
          value={options.glowType === 'glare' ? +(options.times === 4) : options.times - 1}
          onChange={val => regenerate({ ...options, times: options.glowType === 'glare' ? (val ? 4 : 2) : val + 1 })}
        >
          {(options.glowType === 'glare' ? glareTimes : bloomTimes).map(i => <sp-menu-item key={i}>{i}</sp-menu-item>)}
        </Picker>
      </div>
      <sp-divider />
      <Slider
        value={options.intensity}
        value-label='%'
        label={lang.intensity}
        onChange={val => regenerate({ ...options, intensity: val })}
      />
      <Slider
        value={options.size}
        step={0.1}
        label={lang.size}
        onChange={val => regenerate({ ...options, size: val })}
      />
      <Slider
        value={options.threshold * 100 | 0}
        value-label='%'
        label={lang.threshold}
        onChange={val => regenerate({ ...options, threshold: val / 100 })}
      />
      <Slider
        value={options.brightness}
        max={255}
        label={lang.brightness}
        onChange={val => regenerate({ ...options, brightness: val })}
      />
      <Slider
        value={options.chromaticAberration}
        value-label='%'
        label={lang.chromaticAberration}
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
            label={lang.glare.rotation}
            onChange={val => regenerate({ ...options, angle: val })}
          />
          <Slider
            value={options.detail}
            value-label='%'
            label={lang.glare.postBlur}
            onChange={val => regenerate({ ...options, detail: val })}
          />
        </>
      )}
      <div className='bottom'>
        <sp-detail>{(time / 1000).toFixed(2)}{lang.second}</sp-detail>
        <div>
          <sp-button variant='secondary' onClick={() => apply(true)} class='cancel' style={{ marginRight: 8 }}>{lang.cancel}</sp-button>
          <sp-button onClick={() => apply()}>{lang.apply}</sp-button>
        </div>
      </div>
      <div className='colorize'>
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
        >{lang.colorize}
        </Checkbox>
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
      </div>
      <div className='checkboxs'>
        <Checkbox class='checkbox' checked={options.sameBlur} onChange={sameBlur => regenerate({ ...options, sameBlur })}>{lang.sameBlur}</Checkbox>
        {!options.sameBlur && <Checkbox class='checkbox' checked={options.linearBlur} onChange={linearBlur => regenerate({ ...options, linearBlur })}>{lang.linearBlur}</Checkbox>}
      </div>
      <div className='checkboxs'>
        <Checkbox class='checkbox' checked={options.skipSkin} onChange={skipSkin => regenerate({ ...options, skipSkin })}>{lang.skipSkin}</Checkbox>
        <Checkbox
          class='checkbox'
          id='show-original'
          checked={!getGroup()?.visible}
          onChange={() => {
            const layer = getGroup()
            if (!layer) return
            core.executeAsModal(async () => {
              layer.visible = !layer.visible
              const elm = document.getElementById('show-original') as any
              if (!elm) return
              elm.checked = layer.visible
            }, { commandName: 'Show Original' })
          }}
        >{lang.originalImage}
        </Checkbox>
        <Checkbox
          class='checkbox'
          id='show-range'
          checked={getRangeLayer()?.visible}
          onChange={() => {
            const layer = getRangeLayer()
            if (!layer) return
            core.executeAsModal(async () => {
              layer.visible = !layer.visible
              const elm = document.getElementById('show-range') as any
              if (!elm) return
              elm.checked = layer.visible
            }, { commandName: 'Show Range' })
          }}
        >{lang.showRange}
        </Checkbox>
      </div>
      <sp-label id='reset'><a href='#' onClick={() => regenerate()}>{lang.reset}</a></sp-label>
    </div>
  )
}

export default Options
