import { action, core, app } from 'photoshop'
import { createContext } from 'react'
const { storage: { localFileSystem: fs }, host } = window.require('uxp')

export const isDarwin = window.require('os').platform() === 'darwin'

export async function prompt (
  heading: string,
  body: string,
  buttons: Array<string | { variant?: string, text: string }> = ['Cancel', 'Ok'],
  options = { title: heading, size: { width: 360, height: 280 } }
) {
  const [dlgEl, formEl, headingEl, dividerEl, bodyEl, footerEl] = [
    'dialog',
    'form',
    'sp-heading',
    'sp-divider',
    'sp-body',
    'footer'
  ].map((tag) => document.createElement(tag)) as any
  ;[headingEl, dividerEl, bodyEl, footerEl].forEach((el) => {
    el.style.margin = '6px'
    el.style.width = 'calc(100% - 12px)'
  })

  formEl.setAttribute('method', 'dialog')
  formEl.addEventListener('submit', () => dlgEl.close())

  footerEl.style.marginTop = '26px'

  dividerEl.setAttribute('size', 'large')

  headingEl.textContent = heading

  bodyEl.textContent = body

  buttons.forEach((btnText: any, idx) => {
    const btnEl = document.createElement('sp-button')
    btnEl.setAttribute(
      'variant',
      idx === buttons.length - 1 ? btnText.variant || 'cta' : 'secondary'
    )
    if (idx === buttons.length - 1) btnEl.setAttribute('autofocus', 'autofocus')
    if (idx < buttons.length - 1) btnEl.setAttribute('quiet', 'true')
    btnEl.textContent = btnText.text || btnText
    btnEl.style.marginLeft = '12px'
    btnEl.addEventListener('click', () => dlgEl.close(btnText.text || btnText))
    footerEl.appendChild(btnEl)
  })
  ;[headingEl, dividerEl, bodyEl, footerEl].forEach((el) => formEl.appendChild(el))
  dlgEl.appendChild(formEl)
  document.body.appendChild(dlgEl)

  return dlgEl.uxpShowModal(options)
}

export const alert = (body: string) => prompt('Info', body, ['Ok'])
export const warning = (body: string) => prompt('Warning', body, ['Ok'])
export const error = (body: string) => prompt('Error', body, ['Ok'])

export async function setPerformanceMode () {
  await action.batchPlay([{
    _obj: 'set',
    _target: [{ _property: 'playbackOptions', _ref: 'property' }, { _enum: 'ordinal', _ref: 'application', _value: 'targetEnum' }],
    to: { _obj: 'playbackOptions', performance: { _enum: 'performance', _value: 'accelerated' } }
  }], {})
}

export async function setFullScreenMode (flag: boolean) {
  await core.performMenuCommand({ commandID: flag ? 5993 : 5991 })
}

export async function fitToScreen () {
  await action.batchPlay([{ _obj: 'select', _target: [{ _ref: 'menuItemClass', _enum: 'menuItemType', _value: 'fitOnScreen' }] }], {})
}

export async function focusPluginPanel () {
  const [{ menuBarInfo }, { panelList }] = await action.batchPlay([
    { _obj: 'get', _target: [{ _property: 'menuBarInfo' }, { _ref: 'application', _enum: 'ordinal', _value: 'targetEnum' }] },
    { _obj: 'get', _target: [{ _property: 'panelList' }, { _ref: 'application', _enum: 'ordinal', _value: 'targetEnum' }] }
  ], {})
  const plugins = menuBarInfo.submenu.find((it: any) => it.menuID === 7200)
  const plugin = plugins.submenu.find((it: any) => it.title === 'Blooms Pro')
  const panel = plugin.submenu.find((it: any) => it.title === 'Blooms Pro')
  const panelState = panelList.find((it: any) => it.name === 'Blooms Pro')
  if (!panelState.visible || panelState.obscured) {
    await core.performMenuCommand({ commandID: panel.command })
  }
}

let jsxObj: any
export async function togglePalettes () {
  if (!jsxObj) {
    const pluginFolder = await fs.getPluginFolder()
    try {
      jsxObj = [
        {
          _obj: 'AdobeScriptAutomation Scripts',
          javaScript: {
            _path: await fs.createSessionToken(await pluginFolder.getEntry('jsx/toggle-palettes.jsx')),
            _kind: 'local'
          },
          javaScriptMessage: 'JSM',
          _isCommand: true,
          _options: { dialogOptions: 'dontDisplay' }
        }
      ]
    } catch (e) {
      console.log(e)
      return
    }
  }
  await action.batchPlay(jsxObj, { })
}

export const TimeCostContext = createContext([0 as number, (_: number | ((_: number) => number)) => {}] as const)

export const suspendHistory = async (fn: () => void | Promise<any>, name: string) => {
  let error: any
  await app.activeDocument.suspendHistory(async () => {
    try {
      await fn()
    } catch (e) {
      error = e
    }
  }, name)
  if (error) throw error
}

export const isNewVersionPS = !host.version.startsWith('23')
