// import { ActionDescriptor } from '../am-to-uxp/ActionDescriptor'
// import { stringIDToTypeID, executeAction, DialogModes, charIDToTypeID } from '../am-to-uxp/index'
// import { ActionReference } from '../am-to-uxp/ActionReference'
// import { ActionList } from '../am-to-uxp/ActionList'
import photoshop, { core } from 'photoshop'
import type { Layer } from 'photoshop/dom/Layer'
import { setFullScreenMode, setPerformanceMode, fitToScreen, focusPluginPanel, togglePalettes, toggleColorPanel, isDarwin } from './utils'

const getStringFromID: (str: number) => string = (photoshop.action as any).getStringFromID
function charIDToTypeID (charID: string): number {
  return (charID.charCodeAt(0) * 0x1000000) + ((charID.charCodeAt(1) << 16) | (charID.charCodeAt(2) << 8) | charID.charCodeAt(3))
}

const { app, constants, action: { batchPlay } } = photoshop
// photoshop.action.addNotificationListener(['all'], console.log)

// const batchPlay = (...args: any[]) => {
//   args[0].forEach(it => {
//     it._options = {
//       dialogOptions: 'dontDisplay'
//     }
//   })
//   return ff(...args).then(it => console.log(args[0], it))
// }

const setActiveLayer = (layer: Layer) => {
  app.activeDocument.activeLayers.forEach(it => layer !== it && (it.selected = false))
  layer.selected = true
}
async function gaussianBlur (activeLay: Layer, blurSize: number) {
  setActiveLayer(activeLay)
  await batchPlay([{ _obj: 'gaussianBlur', radius: { _unit: 'pixelsUnit', _value: blurSize } }], {})
}
// window.charIDToTypeID = charIDToTypeID
// window.stringIDToTypeID = stringIDToTypeID
// window.ActionDescriptor = ActionDescriptor
// window.ActionList = ActionList
// window.ActionReference = ActionReference
// window.executeAction = (eventID: number) => {
//   // const obj = (descriptor ? descriptor.toBatchPlay())
//   const descToPlay = JSON.stringify([
//     {
//       _obj: (photoshop.action as any).getStringFromID(eventID),
//       // ...obj
//     }
//   ])
//   console.log(descToPlay)
// }
// window.DialogModes = {}
async function levelsB (activeLay: Layer, gamma: number) {
  setActiveLayer(activeLay)
  await batchPlay([{
    _obj: 'levels',
    presetKind: { _enum: 'presetKindType', _value: 'presetKindCustom' },
    adjustment: [{ channel: { _ref: 'channel', _enum: 'channel', _value: 'composite' }, input: [0, 255], gamma, _obj: 'levelsAdjustment' }]
  }], {})
}
async function motionBlur (activeLay: Layer, angle: number, blurDistance: number, times = 1) {
  setActiveLayer(activeLay)
  await batchPlay(new Array(times).fill({ _obj: 'motionBlur', angle, distance: { _unit: 'pixelsUnit', _value: blurDistance } }), { })
}
async function levels (activeLay: Layer, briLevel: number) {
  setActiveLayer(activeLay)
  await batchPlay([{
    _obj: 'levels',
    presetKind: { _enum: 'presetKindType', _value: 'presetKindCustom' },
    adjustment: [{ channel: { _ref: 'channel', _enum: 'channel', _value: 'composite' }, input: [0, briLevel], gamma: 1, _obj: 'levelsAdjustment' }]
  }], {})
}
async function exposure (lay: Layer, briLevel: number) {
  setActiveLayer(lay)
  await batchPlay([{ _obj: 'exposure', presetKind: { _enum: 'presetKindType', _value: 'presetKindCustom' }, exposure: (briLevel / 12.75) / 3.5, offset: 0, $gamm: 1 }], {})
}
async function blackAndWhite (layer: Layer) {
  setActiveLayer(layer)
  await batchPlay([{
    _obj: 'blackAndWhite',
    presetKind: { _enum: 'presetKindType', _value: 'presetKindDefault' },
    red: 40,
    yellow: 60,
    grain: 40,
    cyan: 60,
    blue: 20,
    magenta: 80,
    useTint: false,
    tintColor: { red: 225.000458, grain: 211.000671, blue: 179.00116, _obj: 'RGBColor' }
  }], {})
}
async function createRedAlert () {
  await batchPlay([{
    _obj: 'hueSaturation',
    presetKind: { _enum: 'presetKindType', _value: 'presetKindCustom' },
    colorize: true,
    adjustment: [{ hue: 90, saturation: 100, lightness: -30, _obj: 'hueSatAdjustmentV2' }]
  }], {})
}
async function changeHue (hue: number, saturation: number, lightness: number) {
  await batchPlay([{ _obj: 'hueSaturation', colorize: true, adjustment: [{ hue, saturation, lightness, _obj: 'hueSatAdjustmentV2' }] }], {})
}
async function updateHue (h: number, s: number, l: number, layerName: string, glowType: string) {
  const bloomsProLayers = app.activeDocument.layers.getByName(layerName).layers!
  const hueParsed = h
  let newHueValue = h
  for (let i = glowType !== 'glare' ? 1 : 2; i < bloomsProLayers.length; i++) {
    if (hueParsed < 50) {
      newHueValue += 2
    } else if ((hueParsed > 50) && (h < 128)) {
      newHueValue -= 2
    } else {
      if ((hueParsed > 128) && (hueParsed < 246)) {
        newHueValue += 2
      }
    }
    setActiveLayer(bloomsProLayers[i])
    await changeHue(newHueValue, s, l)
  }
}
async function addChromaticAberration (layer: Layer | undefined | null, amount: number, scale: number) {
  if (layer) setActiveLayer(layer)
  await addChromaToChannel('Rd  ', -amount * scale, amount)
  await addChromaToChannel('Bl  ', amount * scale, amount)
  await addChromaToChannel('Grn ', -(amount * 0.5) * scale, amount)
  await selectChannel('RGB ')
}
async function addChromaToChannel (channel: string, offset: number, zoom: number) {
  await selectChannel(channel)

  let channelName = ''
  switch (channel) {
    case 'Rd  ':
      channelName = 'chromaRED'
      break
    case 'Bl  ':
      channelName = 'chromaBLUE'
      break
    case 'Grn ':
      channelName = 'chromaGREEN'
      break
  }
  await batchPlay([
    { _obj: 'duplicate', _target: [{ _ref: 'channel', _enum: 'ordinal', _value: 'targetEnum' }], name: channelName },
    { _obj: 'show', null: [{ _ref: 'channel', _name: channelName }] },
    { _obj: 'hide', null: [{ _ref: 'channel', _enum: 'channel', _value: getStringFromID(charIDToTypeID(channel)) }] },

    { _obj: 'offset', horizontal: offset, vertical: offset, fill: { _enum: 'fillMode', _value: 'repeat' } } // moveOffset
  ], {})

  await applyChannel(channel)
  if (offset < 0) {
    offset = offset * -1
  }
  await zoomBlur(zoom)
}
async function applyChannel (channel: string) {
  let channelName = ''
  switch (channel) {
    case 'Rd  ':
      channelName = 'chromaRED'
      break
    case 'Bl  ':
      channelName = 'chromaBLUE'
      break
    case 'Grn ':
      channelName = 'chromaGREEN'
      break
  }
  await selectChannel(channel)
  await batchPlay([
    { _obj: 'applyImageEvent', with: { to: { _ref: [{ _ref: 'channel', _name: channelName }, { _ref: 'layer', _enum: 'ordinal', _value: 'merged' }] }, preserveTransparency: true, _obj: 'calculation' } },
    { _obj: 'delete', _target: [{ _ref: 'channel', _name: channelName }] }
  ], {})
}
async function selectChannel (channel: string) {
  await batchPlay([{ _obj: 'select', _target: [{ _ref: 'channel', _enum: 'channel', _value: getStringFromID(charIDToTypeID(channel)) }] }], {})
}
async function zoomBlur (amount: number) {
  await batchPlay([{ _obj: 'radialBlur', amount, blurMethod: { _enum: 'blurMethod', _value: 'zoom' }, blurQuality: { _enum: 'blurQuality', _value: '$Good' }, center: { horizontal: 0.5, vertical: 0.5, _obj: 'paint' } }], {})
}

function deleteLayer (layer: Layer) {
  layer.layers?.forEach(deleteLayer)
  setActiveLayer(layer)
  layer.allLocked = false
  layer.delete()
}

export interface GlowOptions {
  intensity: number
  size: number
  threshold: number
  angle: number
  glowType: 'bloom' | 'bloom-o' | 'glare'
  range: boolean
  colorize: boolean
  hue: number
  saturation: number
  lightness: number
  brightness: number
  times: number
  detail: number
  chromaticAberration: number
  layerName: string
  sameBlur: boolean
}
export async function generateGlow (options?: Partial<GlowOptions>, appliedGlow = false) {
  let { intensity, size, threshold, angle, glowType, range, colorize, hue, saturation, lightness, brightness, times, detail, chromaticAberration, layerName, sameBlur } = Object.assign({
    angle: 0,
    brightness: 0,
    chromaticAberration: 0,
    colorize: false,
    detail: 0,
    glowType: 'bloom',
    range: false,
    hue: 0,
    intensity: 100,
    lightness: 0,
    times: 4,
    saturation: 80,
    size: 20,
    threshold: 0.25,
    layerName: '',
    sameBlur: false
  }, options || {})
  async function blurLayer (layer: Layer) {
    if (glowType === 'glare') {
      if (detail > 0) {
        if (appliedGlow) {
          if (docWidth > docHeight) await doc.resizeImage(1500, undefined, docResolution, constants.ResampleMethod.BILINEAR, 0)
          else await doc.resizeImage(undefined, 1200, docResolution, constants.ResampleMethod.BILINEAR, 0)
        }
        setActiveLayer(layer)
        await batchPlay([{ _obj: 'ripple', amount: (detail * 10) - 1, rippleSize: { _enum: 'rippleSize', _value: 'large' } }], {})
        if (appliedGlow) await doc.resizeImage(docWidth, docHeight, docResolution, constants.ResampleMethod.BILINEAR, 0)
        docH = doc.height
        docW = doc.width
        docSize = Math.max(docH, docW)
        // if (glowType === 'bloom') {
        //   scale = scale2 = docSize / 5000
        // } else {
        scale = docSize / 400
        scale2 = docSize / 12000
        // }
      }
      let secondGlare: Layer | undefined
      let secondGlareAngle = 0
      if (times === 4) {
        secondGlare = (await layer.duplicate())!
        secondGlare.fillOpacity = intensity
        secondGlareAngle = angle + 90
        secondGlareAngle = secondGlareAngle > 90 ? -(-180 + secondGlareAngle) : -(90 + angle)
      }
      const motionBlurAmount = 10
      for (let o = 0; o < motionBlurAmount; o++) {
        await motionBlur(layer, -angle, size * scale)
        if (times === 4) {
          await motionBlur(secondGlare!, secondGlareAngle, size * scale)
          if (brightnessLevel > 0) await levels(secondGlare!, 200 + (brightnessLevel * 0.21568627450980393))
        }
        if (brightnessLevel > 0) await levels(layer, 200 + (brightnessLevel * 0.21568627450980393))
      }
    } else await gaussianBlur(layer, size * scale)
  }

  if (brightness > 253) brightness -= 3
  const doc = app.activeDocument
  const bloomsProSourceLayer = doc.layers.getByName('BloomsPro_SourceLayer')
  if (app.activeDocument.activeLayers.length !== 1 || app.activeDocument.activeLayers[0] !== bloomsProSourceLayer) {
    setActiveLayer(bloomsProSourceLayer)
  }
  bloomsProSourceLayer.visible = true
  const tmpLayer = doc.activeLayers[0]
  if (tmpLayer.name !== 'BloomsPro_SourceLayer') {
    console.error('Please select \'BloomsPro_SourceLayer\' to enable the engine')
    return
  }

  const glowParametersName = JSON.stringify({
    angle: angle | 0,
    brightness: brightness | 0,
    chromaticAberration: chromaticAberration | 0,
    colorize,
    detail: detail | 0,
    glowType,
    range,
    hue: hue | 0,
    intensity,
    lightness: lightness | 0,
    times: times | 0,
    saturation: saturation | 0,
    size,
    threshold,
    layerName,
    sameBlur
  })
  const brightnessLevel = 254 - brightness
  app.preferences.unitsAndRulers.rulerUnits = constants.RulerUnits.PIXELS
  const docWidth = doc.width
  const docHeight = doc.height
  const docResolution = doc.resolution
  let docH = docHeight
  let docW = docWidth
  let docSize = Math.max(docH, docW)
  let scale = 1
  let scale2 = 1
  if (glowType === 'glare') {
    scale = docSize / 400
    scale2 = docSize / 12000
  } else scale = scale2 = docSize / 5000
  const scale3 = docSize / 1500

  let bloomsProGrp: Layer
  let bloomsProGlow: Layer
  let outherGlow: Layer
  let luminosityMask: Layer

  if (doc.historyStates[2].name !== 'BloomsPro_Init') {
    if (doc.layers[0].name === 'MaskLayer') deleteLayer(doc.layers[0])
    if (doc.layers[0].name === 'BloomsPro_Grp') deleteLayer(doc.layers[0])
    setActiveLayer(tmpLayer)

    bloomsProGrp = (await doc.createLayerGroup({ name: 'BloomsPro_Grp' }))!
    bloomsProGlow = (await doc.createLayerGroup({ name: glowParametersName }))!
    bloomsProGlow.move(bloomsProGrp, constants.ElementPlacement.PLACEAFTER)
    outherGlow = (await tmpLayer.duplicate(bloomsProGlow, constants.ElementPlacement.PLACEINSIDE))!
    luminosityMask = (await outherGlow.duplicate(outherGlow, constants.ElementPlacement.PLACEBEFORE))!
    await blackAndWhite(luminosityMask)
    await createSnapshot('BloomsPro_Init')
  } else if (appliedGlow) {
    for (let c = 0; c < doc.layers.length - 1; c++) {
      if (doc.layers[c].name === 'BloomsPro_Grp') {
        deleteLayer(doc.layers[c])
        if (doc.layers[0].name === 'MaskLayer') deleteLayer(doc.layers[0])
        break
      }
    }
    setActiveLayer(tmpLayer)

    bloomsProGrp = (await doc.createLayerGroup({ name: 'BloomsPro_Grp' }))!
    bloomsProGlow = (await doc.createLayerGroup({ name: glowParametersName }))!
    bloomsProGlow.move(bloomsProGrp, constants.ElementPlacement.PLACEAFTER)
    outherGlow = (await tmpLayer.duplicate(bloomsProGlow, constants.ElementPlacement.PLACEINSIDE))!
    luminosityMask = (await outherGlow.duplicate(outherGlow, constants.ElementPlacement.PLACEBEFORE))!
    await blackAndWhite(luminosityMask)
  } else {
    await batchPlay([{ _obj: 'select', _target: [{ _ref: 'snapshotClass', _name: 'BloomsPro_Init' }] }], {})
    ;[bloomsProGrp, bloomsProGlow] = doc.layers
    bloomsProGlow.name = glowParametersName
    ;[luminosityMask, outherGlow] = doc.layers[1]!.layers!
  }

  if (appliedGlow) app.activeDocument.bitsPerChannel = constants.BitsPerChannelType.SIXTEEN
  await levelsB(outherGlow, threshold)
  await levelsB(luminosityMask, threshold)
  luminosityMask.blendMode = constants.BlendMode.MULTIPLY

  await batchPlay([
    { _obj: 'mergeLayersNew' },
    { _obj: 'levels', presetKind: { _enum: 'presetKindType', _value: 'presetKindCustom' }, adjustment: [{ channel: { _ref: 'channel', _enum: 'channel', _value: 'composite' }, input: [10, 255], _obj: 'levelsAdjustment' }] }
  ], {})

  const rangeLayer = (await outherGlow.duplicate(bloomsProGlow, constants.ElementPlacement.PLACEBEFORE))!
  outherGlow.blendMode = constants.BlendMode.SCREEN
  const coreGlow = (await outherGlow.duplicate())!
  await exposure(coreGlow, brightness)
  coreGlow.blendMode = constants.BlendMode.COLORDODGE
  await blackAndWhite(coreGlow)
  if (brightness > 0) await exposure(outherGlow, brightness)
  rangeLayer.blendMode = constants.BlendMode.NORMAL
  rangeLayer.name = 'BloomsPro_Range'
  rangeLayer.fillOpacity = 100
  setActiveLayer(rangeLayer)
  await createRedAlert()
  outherGlow.fillOpacity = intensity
  setActiveLayer(outherGlow)
  await blurLayer(outherGlow)
  if (sameBlur) {
    await gaussianBlur(outherGlow, size * scale2 * 4)
    await batchPlay(new Array(times).fill({ _obj: 'copyToLayer' }), {})
    if (glowType !== 'glare') coreGlow.fillOpacity = intensity
  } else {
    await batchPlay(new Array(times).fill({ _obj: 'copyToLayer' }), {})
    if (glowType !== 'glare') coreGlow.fillOpacity = intensity
    for (let i = 1; i <= times; i++) await gaussianBlur(doc.layers[2]!.layers![1 + i], size * scale2 * (2 ** i))
  }
  if (glowType === 'glare') await motionBlur(coreGlow, -angle, size * scale, 2)
  if (brightness > 0) await exposure(coreGlow, brightness)
  if (colorize) await updateHue(hue, saturation, lightness - 100, glowParametersName, glowType)
  setActiveLayer(bloomsProGlow)
  await batchPlay([{ _obj: 'mergeLayersNew' }], {})
  bloomsProGlow.blendMode = constants.BlendMode.SCREEN
  doc.layers.getByName(glowParametersName).move(bloomsProGrp, constants.ElementPlacement.PLACEINSIDE)
  rangeLayer.move(bloomsProGlow, constants.ElementPlacement.PLACEBEFORE)
  if ((intensity > 0) && (brightness > 0)) {
    await exposure(app.activeDocument.activeLayers[0], brightness)
    await batchPlay([{ _obj: 'brightnessEvent', brightness: (brightness / 1.7) / 2, center: 0, useLegacy: false }], {})
  }
  setActiveLayer(bloomsProGlow)
  rangeLayer.visible = false
  if (chromaticAberration > 0) {
    const chromaLayer = (await bloomsProGlow.duplicate())!
    chromaLayer.blendMode = constants.BlendMode.LIGHTEN
    bloomsProGlow.visible = false
    bloomsProSourceLayer.visible = false
    await addChromaticAberration(chromaLayer, chromaticAberration, scale3)
    bloomsProGlow.visible = true
    await batchPlay([{ _obj: 'mergeLayersNew' }], {})
  }
  rangeLayer.visible = range
  // setActiveLayer(bloomsProGrp)
  // bloomsProGrp.allLocked = true
  // setActiveLayer(bloomsProSourceLayer)
  // bloomsProSourceLayer.allLocked = true
  setActiveLayer(tmpLayer)
  // if (usingMask == true) {
  //   const idpast = charIDToTypeID('past')
  //   const desc8327 = new ActionDescriptor()
  //   const idinPlace = stringIDToTypeID('inPlace')
  //   desc8327.putBoolean(idinPlace, true)
  //   const idAntA = charIDToTypeID('AntA')
  //   const idAnnt = charIDToTypeID('Annt')
  //   const idAnno = charIDToTypeID('Anno')
  //   desc8327.putEnumerated(idAntA, idAnnt, idAnno)
  //   const idAs = charIDToTypeID('As  ')
  //   const idPxel = charIDToTypeID('Pxel')
  //   desc8327.putClass(idAs, idPxel)
  //   executeAction(idpast, desc8327, DialogModes.NO)
  //   with (doc.activeLayer) {
  //     move(doc.layers[0], ElementPlacement.PLACEBEFORE)
  //     name = 'MaskLayer'
  //     opacity = 60
  //     visible = false
  //     allLocked = true
  //   }
  // }
}

function createSnapshot (name: string) {
  return batchPlay([{ _obj: 'make', _target: [{ _ref: 'snapshotClass' }], from: { _property: 'currentHistoryState', _ref: 'historyState' }, name, using: { _enum: 'historyState', _value: 'fullDocument' } }], { })
}
async function optimizeBloomsPro () {
  const scaleFactor = 1500
  const rulerUnits = app.preferences.unitsAndRulers.rulerUnits
  if (rulerUnits !== constants.RulerUnits.PIXELS) {
    app.preferences.unitsAndRulers.rulerUnits = constants.RulerUnits.PIXELS
  }
  const docHeight = app.activeDocument.height
  const docWidth = app.activeDocument.width
  if ((docHeight > docWidth) && (docHeight > 1200)) {
    const docSizeLong = 1200
    await app.activeDocument.resizeImage(undefined, docSizeLong, 72, constants.ResampleMethod.BILINEAR, 0)
  } else if ((docWidth > docHeight) && (docWidth > scaleFactor)) {
    const docSizeLong = scaleFactor
    await app.activeDocument.resizeImage(docSizeLong, undefined, 72, constants.ResampleMethod.BILINEAR, 0)
  }
}
async function updateBloomsProSourceLayer (userDocument: string) {
  const bloomsProDoc = app.activeDocument
  app.activeDocument = app.documents.getByName(userDocument)
  hideElements()
  app.activeDocument = bloomsProDoc
  await batchPlay([{
    _obj: 'applyImageEvent',
    with: { to: [{ _ref: 'channel', _enum: 'channel', _value: 'RGB' }, { _ref: 'layer', _enum: 'ordinal', _value: 'merged' }, { _ref: 'document', _name: userDocument }], preserveTransparency: true, _obj: 'calculation' }
  }], {})
}
async function changeDocumentSize (isEditMode = false, userDoc = '', is16Bits = false) {
  if (isEditMode) {
    await updateBloomsProSourceLayer(userDoc)
  }
  if (is16Bits) {
    app.activeDocument.bitsPerChannel = constants.BitsPerChannelType.EIGHT
  }
  await createSnapshot('BloomsPro_HQ')
  await optimizeBloomsPro()
}
function hideElements () {
  const doc = app.activeDocument
  for (let i = 0; i < doc.layers.length; i++) {
    if (doc.layers[i].name.includes('BloomsPro_Element') && (doc.layers[i].kind === constants.LayerKind.SMARTOBJECT)) {
      doc.layers[i].visible = false
    }
  }
}
async function applyImage () {
  await batchPlay([{
    _obj: 'applyImageEvent',
    with: { _obj: 'calculation', calculation: { _enum: 'calculationType', _value: 'multiply' }, to: { _ref: [{ _enum: 'channel', _ref: 'channel', _value: 'RGB' }, { _enum: 'ordinal', _ref: 'layer', _value: 'merged' }] } }
  }], {})
}
async function createSmartObj () {
  await batchPlay([{ _obj: 'newPlacedLayer' }], { })
}
async function openSmartObj (objName: string) {
  await batchPlay([
    { _obj: 'select', _target: [{ _ref: 'layer', _name: objName }], makeVisible: false, layerID: [2] },
    { _obj: 'placedLayerEditContents' }
  ], {})
}
function showBloomsProSourceLayer () {
  app.activeDocument.layers.getByName('BloomsPro_SourceLayer').visible = true
  setActiveLayer(app.activeDocument.layers[app.activeDocument.layers.length - 1])
}
async function openBloomsProElement (bloomsProElementLayer: string, userDoc?: string) {
  try {
    await openSmartObj(bloomsProElementLayer)
  } catch (e) {
    return 'Sorry, this BloomsPro_Element cannot be opened, it may have been rasterized. Please render a new BloomsPro_Element.'
  }
  if (userDoc) {
    if (app.documents.getByName(userDoc).bitsPerChannel === constants.BitsPerChannelType.SIXTEEN) {
      app.activeDocument.bitsPerChannel = constants.BitsPerChannelType.SIXTEEN
    }
  }
  try {
    showBloomsProSourceLayer()
  } catch (e) {
    return 'Sorry, this BloomsPro_Element has no internal structure, probably it has been manually modified. Please select a different BloomsPro_Element.'
  }
  await changeDocumentSize(true, userDoc, true)
}
function convertBits () {
  if (app.activeDocument.bitsPerChannel !== constants.BitsPerChannelType.EIGHT) {
    app.activeDocument.bitsPerChannel = constants.BitsPerChannelType.EIGHT
  }
}

async function generateBloomsProElement () {
  const map: Record<string, true> = {}
  app.activeDocument.layers.forEach(it => (map[it.name] = true))
  let i = 1
  let name: string
  while (map[(name = 'BloomsPro_Element - Glow - ' + i)]) i++
  const bloomsProElement = (await app.activeDocument.activeLayers.add())!
  bloomsProElement.name = name
  hideElements()
  await applyImage()
  await createSmartObj()
  await openBloomsProElement(name)
  if (app.activeDocument.mode !== constants.DocumentMode.RGB) {
    await app.activeDocument.changeMode(constants.ChangeMode.RGB)
  }
  app.activeDocument.layers[0].name = 'BloomsPro_SourceLayer'
  await app.activeDocument.suspendHistory(() => changeDocumentSize(), 'BloomsPro - Initialize')
  convertBits()
  return name
}

export const getRangeLayer = () => app.activeDocument.layers.find(it => it.name === 'BloomsPro_Grp')?.layers?.find(it => it.name === 'BloomsPro_Range')

export async function apply (isCancel = false) {
  let error: Error | undefined
  const options = getCurrentOptions()
  if (!options) return
  await app.activeDocument.suspendHistory(async () => {
    if (isCancel) {
      await app.activeDocument.close(constants.SaveOptions.DONOTSAVECHANGES)
      app.activeDocument.layers.forEach(it => it.name === options.layerName && it.kind === constants.LayerKind.SMARTOBJECT && it.delete())
    } else {
      await batchPlay([{ _obj: 'select', _target: [{ _ref: 'snapshotClass', _name: 'BloomsPro_HQ' }] }], {})
      await generateGlow(options, true)
      app.activeDocument.bitsPerChannel = constants.BitsPerChannelType.EIGHT
      app.activeDocument.layers.getByName('BloomsPro_SourceLayer').visible = false
      app.activeDocument.layers[0]!.layers![0].visible = false
      await app.activeDocument.close(constants.SaveOptions.SAVECHANGES)
      app.activeDocument.layers.forEach(it => it.name === options.layerName && it.kind === constants.LayerKind.SMARTOBJECT && (it.blendMode = constants.BlendMode.SCREEN))
    }
    if (!isDarwin) await togglePalettes()
  }, 'BloomsPro - Apply')
  if (!isDarwin) setTimeout(setFullScreenMode, 50, false)
  if (error) throw error
}

export async function generate () {
  let error: Error | null = null
  if (!isDarwin) {
    await core.executeAsModal(togglePalettes, { commandName: 'Toggle Palettes' })
    await setFullScreenMode(true)
  }
  let layerName: string
  await app.activeDocument.suspendHistory(async () => {
    try {
      await setPerformanceMode()
      layerName = await generateBloomsProElement()
      await fitToScreen()
    } catch (e: any) {
      console.error(e)
      error = e
    }
  }, 'BloomsPro - Create')
  if (error) return error
  await app.activeDocument.suspendHistory(async () => {
    try {
      await generateGlow({ layerName })
      await focusPluginPanel()
      if (!isDarwin) await toggleColorPanel()
    } catch (e: any) {
      error = e
    }
  }, 'BloomsPro - Create')
  return error
}

export const getCurrentOptions = () => {
  try {
    return JSON.parse(app.activeDocument.layers.getByName('BloomsPro_Grp')!.layers![1].name) as GlowOptions
  } catch { }
  return null
}

export const regenerate = async (options: GlowOptions) => {
  let error: Error | undefined
  await core.executeAsModal(async () => {
  // await app.activeDocument.suspendHistory(async () => {
    try {
      await generateGlow(options)
    } catch (e: any) {
      error = e
    }
  }, { commandName: 'BloomsPro - Regenerate' })
  // }, 'BloomsPro - Regenerate')
  if (error) throw error
}
