import photoshop, { core } from 'photoshop'
import type { Layer } from 'photoshop/dom/Layer'
import { setPerformanceMode, fitToScreen, focusPluginPanel } from './utils'
import lang from './locales'

const { app, constants, action: { batchPlay } } = photoshop

const setActiveLayer = (layer: Layer) => {
  app.activeDocument.activeLayers.forEach(it => layer !== it && (it.selected = false))
  layer.selected = true
}
async function gaussianBlur (activeLay: Layer, blurSize: number) {
  setActiveLayer(activeLay)
  await batchPlay([{ _obj: 'gaussianBlur', radius: { _unit: 'pixelsUnit', _value: blurSize } }], {})
}

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

// eslint-disable-next-line no-unused-vars
enum ChannelType { RED = 'red', GREEN = 'green', BLUE = 'blue', RGB = 'RGB' }
async function addChromaticAberration (layer: Layer | undefined | null, amount: number, scale: number) {
  if (layer) setActiveLayer(layer)
  await addChromaToChannel(ChannelType.RED, -amount * scale, amount)
  await addChromaToChannel(ChannelType.BLUE, amount * scale, amount)
  await addChromaToChannel(ChannelType.GREEN, -(amount * 0.5) * scale, amount)
  await selectChannel(ChannelType.RGB)
}
async function addChromaToChannel (channel: ChannelType, offset: number, zoom: number) {
  await selectChannel(channel)

  const channelName = 'chroma' + channel.toUpperCase()
  await batchPlay([
    { _obj: 'duplicate', _target: [{ _ref: 'channel', _enum: 'ordinal', _value: 'targetEnum' }], name: channelName },
    { _obj: 'show', null: [{ _ref: 'channel', _name: channelName }] },
    { _obj: 'hide', null: [{ _ref: 'channel', _enum: 'channel', _value: channel }] },

    { _obj: 'offset', horizontal: offset, vertical: offset, fill: { _enum: 'fillMode', _value: 'repeat' } } // moveOffset
  ], {})

  await applyChannel(channel)
  if (offset < 0) {
    offset = offset * -1
  }
  await zoomBlur(zoom)
}
async function applyChannel (channel: ChannelType) {
  const channelName = 'chroma' + channel.toUpperCase()
  await selectChannel(channel)
  await batchPlay([
    { _obj: 'applyImageEvent', with: { to: { _ref: [{ _ref: 'channel', _name: channelName }, { _ref: 'layer', _enum: 'ordinal', _value: 'merged' }] }, preserveTransparency: true, _obj: 'calculation' } },
    { _obj: 'delete', _target: [{ _ref: 'channel', _name: channelName }] }
  ], {})
}
async function selectChannel (channel: ChannelType) {
  await batchPlay([{ _obj: 'select', _target: [{ _ref: 'channel', _enum: 'channel', _value: channel }] }], {})
}
async function zoomBlur (amount: number) {
  await batchPlay([{ _obj: 'radialBlur', amount, blurMethod: { _enum: 'blurMethod', _value: 'zoom' }, blurQuality: { _enum: 'blurQuality', _value: '$Good' }, center: { horizontal: 0.5, vertical: 0.5, _obj: 'paint' } }], {})
}
async function createSkinSelection () {
  await batchPlay([
    { UseFacesKey: true, _obj: 'colorRange', colorModel: 1, colors: { _enum: 'colors', _value: 'skinTone' }, dimension: 5, fuzziness: 20, negGaussClusters: 0, negGaussParams: [], negGaussTolerance: 0.0, negSpaGaussTolerance: 0.2800000011920929, posGaussClusters: 1, posGaussParams: [0.744720458984375, 0.744720458984375, 0.07843017578125, 0.523193359375, 0.523193359375, 0.02588195912539959, 0.679046630859375, 0.679046630859375, 0.02588195912539959, 0.4613037109375, 0.4613037109375, 0.2800000011920929, 0.803314208984375, 0.803314208984375, 0.2800000011920929], posGaussTolerance: 0.07843017578125, posSpaGaussTolerance: 0.2800000011920929 },
    { _obj: 'duplicate', _target: [{ _property: 'selection', _ref: 'channel' }], name: 'Skin' }
  ], {})
}
async function selectSkin () {
  await batchPlay([{ _obj: 'set', _target: [{ _property: 'selection', _ref: 'channel' }], to: { _name: 'Skin', _ref: 'channel' } }], { })
}
async function fillWithBlack () {
  await batchPlay([{ _obj: 'fill', mode: { _enum: 'blendMode', _value: 'normal' }, opacity: { _unit: 'percentUnit', _value: 100.0 }, using: { _enum: 'fillContents', _value: 'black' } }], {})
}
async function clearSelection () {
  await batchPlay([{ _obj: 'set', _target: [{ _property: 'selection', _ref: 'channel' }], to: { _enum: 'ordinal', _value: 'none' } }], {})
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
  glowType: 'bloom-soft' | 'bloom' | 'glare'
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
  linearBlur: boolean
  skipSkin: boolean
  isEdit: boolean
}
const optionsMap: Record<keyof GlowOptions, string> = {
  intensity: 'i',
  size: 's',
  threshold: 't',
  angle: 'a',
  glowType: 'g',
  colorize: 'c',
  hue: 'h',
  saturation: 's',
  lightness: 'l',
  brightness: 'b',
  times: 'T',
  detail: 'd',
  chromaticAberration: 'C',
  layerName: 'L',
  sameBlur: 'B',
  linearBlur: 'u',
  skipSkin: 'k',
  isEdit: 'e'
}
const reverseMap: Record<string, string> = { }
for (const key in optionsMap) reverseMap[(optionsMap as any)[key]] = key

const toShortOptions = (o: GlowOptions) => {
  const obj: Record<string, string> = { }
  for (const key in optionsMap) obj[(optionsMap as any)[key]] = (o as any)[key]
  return obj
}
export const toFullOptions = (o: Record<string, string>) => {
  const obj: GlowOptions = { } as any
  for (const key in reverseMap) (obj as any)[reverseMap[key]] = o[key]
  return obj
}

export async function generateGlow (options?: Partial<GlowOptions>, appliedGlow = false) {
  let { intensity, size, threshold, angle, glowType, colorize, hue, saturation, lightness, brightness, times, detail, chromaticAberration, layerName, sameBlur, linearBlur, skipSkin, isEdit } = Object.assign({
    angle: 0,
    brightness: 0,
    chromaticAberration: 0,
    colorize: false,
    detail: 0,
    glowType: 'bloom-soft',
    hue: 0,
    intensity: 100,
    lightness: 0,
    times: 4,
    saturation: 80,
    size: 20,
    threshold: 0.25,
    layerName: '',
    sameBlur: false,
    linearBlur: true,
    skipSkin: false,
    isEdit: false
  }, options || {})
  async function blurGlare (layer: Layer) {
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
      scale = docSize / 400
      scale2 = docSize / 12000
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
  }

  if (appliedGlow) isEdit = true

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

  const params: GlowOptions = {
    angle: angle | 0,
    brightness: brightness | 0,
    chromaticAberration: chromaticAberration | 0,
    colorize,
    detail: detail | 0,
    glowType,
    hue: hue | 0,
    intensity,
    lightness: lightness | 0,
    times: times | 0,
    saturation: saturation | 0,
    size,
    threshold,
    layerName,
    sameBlur,
    linearBlur,
    skipSkin,
    isEdit
  }
  const glowParametersName = JSON.stringify(toShortOptions(params))
  delete (params as any).layerName
  delete (params as any).isEdit
  localStorage.setItem('options', JSON.stringify(toShortOptions(params)))
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

  if (doc.historyStates[2]?.name !== 'BloomsPro_Init') {
    if (doc.layers[0].name === 'MaskLayer') deleteLayer(doc.layers[0])
    if (doc.layers[0].name === 'BloomsPro_Grp') deleteLayer(doc.layers[0])
    setActiveLayer(tmpLayer)
    await createSkinSelection()
    await clearSelection()

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
    if (skipSkin) await createSkinSelection()

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

  if (glowType === 'bloom-soft') {
    setActiveLayer(luminosityMask)
    luminosityMask.delete()
    setActiveLayer(outherGlow)

    if (skipSkin) {
      await selectSkin()
      await batchPlay([{ _obj: 'delete' }], {})
      await clearSelection()
    }

    await batchPlay([
      { _obj: 'colorRange', colorModel: 0, colors: { _enum: 'colors', _value: 'highlights' }, highlightsFuzziness: 30, highlightsLowerLimit: 255 * (1 - threshold) | 0 },
      { _obj: 'inverse' },
      { _obj: 'delete' }
    ], {})
    await clearSelection()
  } else {
    if (skipSkin) {
      outherGlow.parent!.visible = false
      await selectSkin()
      outherGlow.parent!.visible = true
      setActiveLayer(outherGlow)
      await fillWithBlack()
      setActiveLayer(luminosityMask)
      await fillWithBlack()
      await clearSelection()
    }
    await levelsB(outherGlow, threshold)
    await levelsB(luminosityMask, threshold)
    luminosityMask.blendMode = constants.BlendMode.MULTIPLY

    await batchPlay([
      { _obj: 'mergeLayersNew' },
      { _obj: 'levels', presetKind: { _enum: 'presetKindType', _value: 'presetKindCustom' }, adjustment: [{ channel: { _ref: 'channel', _enum: 'channel', _value: 'composite' }, input: [10, 255], _obj: 'levelsAdjustment' }] }
    ], {})
  }

  const rangeLayer = (await outherGlow.duplicate(bloomsProGlow, constants.ElementPlacement.PLACEBEFORE))!
  outherGlow.blendMode = glowType === 'bloom-soft' ? constants.BlendMode.SOFTLIGHT : constants.BlendMode.SCREEN
  let coreGlow: Layer | null = null
  if (glowType !== 'bloom-soft') {
    coreGlow = await outherGlow.duplicate()
    await exposure(coreGlow!!, brightness)
    coreGlow!!.blendMode = constants.BlendMode.COLORDODGE
    await blackAndWhite(coreGlow!!)
  }
  if (brightness > 0) await exposure(outherGlow, brightness)
  rangeLayer.blendMode = constants.BlendMode.NORMAL
  rangeLayer.name = 'BloomsPro_Range'
  rangeLayer.fillOpacity = 100
  setActiveLayer(rangeLayer)
  await createRedAlert()

  outherGlow.fillOpacity = intensity
  setActiveLayer(outherGlow)
  if (glowType === 'glare') await blurGlare(outherGlow)
  else if (glowType === 'bloom') await gaussianBlur(outherGlow, size * scale)

  if (sameBlur) {
    await gaussianBlur(outherGlow, size * scale2 * 4)
    await batchPlay(new Array(times).fill({ _obj: 'copyToLayer' }), {})
    if (glowType === 'bloom') coreGlow!!.fillOpacity = intensity
  } else {
    await batchPlay(new Array(times).fill({ _obj: 'copyToLayer' }), {})
    if (glowType === 'bloom') coreGlow!!.fillOpacity = intensity
    for (let i = 1, start = +(glowType !== 'bloom-soft'); i <= times; i++) await gaussianBlur(doc.layers[2]!.layers![start + i], size * scale2 * (linearBlur ? 2 * i : 2 ** i))
  }
  if (glowType === 'glare') await motionBlur(coreGlow!!, -angle, size * scale, 2)

  if (brightness > 0 && glowType !== 'bloom-soft') await exposure(coreGlow!!, brightness)
  if (colorize) await updateHue(hue, saturation, lightness - 100, glowParametersName, glowType)
  setActiveLayer(bloomsProGlow)
  await batchPlay([{ _obj: 'mergeLayersNew' }], {})
  bloomsProGlow.blendMode = glowType === 'bloom-soft' ? constants.BlendMode.SOFTLIGHT : constants.BlendMode.SCREEN
  doc.layers.getByName(glowParametersName).move(bloomsProGrp, constants.ElementPlacement.PLACEINSIDE)
  rangeLayer.move(bloomsProGlow, constants.ElementPlacement.PLACEBEFORE)
  rangeLayer.visible = false
  if ((intensity > 0) && (brightness > 0)) {
    await exposure(app.activeDocument.activeLayers[0], brightness)
    await batchPlay([{ _obj: 'brightnessEvent', brightness: (brightness / 1.7) / 2, center: 0, useLegacy: false }], {})
  }
  setActiveLayer(bloomsProGlow)

  if (chromaticAberration > 0) {
    const chromaLayer = (await bloomsProGlow.duplicate())!
    chromaLayer.blendMode = constants.BlendMode.LIGHTEN
    bloomsProGlow.visible = false
    bloomsProSourceLayer.visible = false
    await addChromaticAberration(chromaLayer, chromaticAberration, scale3)
    bloomsProGlow.visible = true
    await batchPlay([{ _obj: 'mergeLayersNew' }], {})
  }

  setActiveLayer(tmpLayer)
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
async function updateBloomsProSourceLayer () {
  const bloomsProDoc = app.activeDocument
  hideElements()
  app.activeDocument = bloomsProDoc
  await batchPlay([{
    _obj: 'applyImageEvent',
    with: { to: [{ _ref: 'channel', _enum: 'channel', _value: 'RGB' }, { _ref: 'layer', _enum: 'ordinal', _value: 'merged' }, { _ref: 'document', _name: '' }], preserveTransparency: true, _obj: 'calculation' }
  }], {})
}
async function changeDocumentSize (isEditMode = false, is16Bits = false) {
  if (isEditMode) await updateBloomsProSourceLayer()
  if (is16Bits) app.activeDocument.bitsPerChannel = constants.BitsPerChannelType.EIGHT
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
  const layer = app.activeDocument.layers.getByName('BloomsPro_SourceLayer')
  if (layer) layer.visible = true
  setActiveLayer(app.activeDocument.layers[app.activeDocument.layers.length - 1])
}
export async function openElement (bloomsProElementLayer: string, isEdit = false) {
  await openSmartObj(bloomsProElementLayer)
  const layer = app.activeDocument.layers[0]
  if (isEdit) {
    if (!app.activeDocument.layers.getByName('BloomsPro_SourceLayer')) throw new Error('No BloomsPro_SourceLayer!')
  } else if (layer.name === bloomsProElementLayer) layer.name = 'BloomsPro_SourceLayer'

  showBloomsProSourceLayer()
  await changeDocumentSize(true, true)
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
  await openElement(name)
  if (app.activeDocument.mode !== constants.DocumentMode.RGB) {
    await app.activeDocument.changeMode(constants.ChangeMode.RGB)
  }
  // await app.activeDocument.suspendHistory(() => changeDocumentSize(), 'BloomsPro - Initialize')
  convertBits()
  return name
}

export const getGroup = () => app.activeDocument.layers.find(it => it.name === 'BloomsPro_Grp')
export const getRangeLayer = () => getGroup()?.layers?.find(it => it.name === 'BloomsPro_Range')

export async function apply (enableMask = false, isCancel = false) {
  let error: Error | undefined
  const options = getCurrentOptions()
  if (!options) return
  await app.activeDocument.suspendHistory(async () => {
    try {
      if (isCancel) {
        await app.activeDocument.close(constants.SaveOptions.DONOTSAVECHANGES)
        if (!options.isEdit) app.activeDocument.layers.forEach(it => it.name === options.layerName && it.kind === constants.LayerKind.SMARTOBJECT && it.delete())
      } else {
        await batchPlay([{ _obj: 'select', _target: [{ _ref: 'snapshotClass', _name: 'BloomsPro_HQ' }] }], {})
        await generateGlow(options, true)
        app.activeDocument.bitsPerChannel = constants.BitsPerChannelType.EIGHT
        app.activeDocument.layers.getByName('BloomsPro_SourceLayer').visible = false
        app.activeDocument.layers[0]!.layers![0].visible = false
        await app.activeDocument.close(constants.SaveOptions.SAVECHANGES)
        for (const it of app.activeDocument.layers) {
          if (it.name !== options.layerName || it.kind !== constants.LayerKind.SMARTOBJECT) return
          it.blendMode = options.glowType === 'bloom-soft' ? constants.BlendMode.SOFTLIGHT : constants.BlendMode.SCREEN
          if (!enableMask) continue
          setActiveLayer(it)
          await batchPlay([{ _obj: 'make', at: { _enum: 'channel', _ref: 'channel', _value: 'mask' }, new: { _class: 'channel' }, using: { _enum: 'userMaskEnabled', _value: 'hideAll' } }], {})
        }
        if (enableMask) {
          await batchPlay([
            { _obj: 'select', _target: [{ _ref: 'paintbrushTool' }] },
            { _obj: 'reset', _target: [{ _property: 'colors', _ref: 'color' }] }
          ])
        }
      }
      // if (!isDarwin) await togglePalettes()
    } catch (e) {
      error = e as any
    }
  }, 'BloomsPro - ' + lang.apply)
  // if (!isDarwin) setTimeout(setFullScreenMode, 50, false)
  if (error) throw error
}

export async function generate (options?: GlowOptions) {
  let error: Error | null = null
  // if (!isDarwin) {
  //   await core.executeAsModal(togglePalettes, { commandName: 'Toggle Palettes' })
  //   await setFullScreenMode(true)
  // }
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
  }, 'BloomsPro - ' + lang.histories.init)
  if (error) return error
  await app.activeDocument.suspendHistory(async () => {
    try {
      await generateGlow({ ...(options || {}), layerName })
      await focusPluginPanel()
    } catch (e: any) {
      error = e
    }
  }, 'BloomsPro - ' + lang.histories.generate)
  return error
}

export async function editElement (layerName: string) {
  let error: Error | null = null
  // if (!isDarwin) {
  //   await core.executeAsModal(togglePalettes, { commandName: 'Toggle Palettes' })
  //   await setFullScreenMode(true)
  // }

  await app.activeDocument.suspendHistory(async () => {
    try {
      await setPerformanceMode()
      await openElement(layerName)
      await fitToScreen()
    } catch (e: any) {
      console.error(e)
      error = e
    }
  }, 'BloomsPro - ' + lang.edit)

  await core.executeAsModal(async () => {
    try {
      await focusPluginPanel()
    } catch (e: any) {
      error = e
    }
  }, { commandName: 'BloomsPro - ' + lang.histories.generate })
  return error
}

export const getCurrentOptions = () => {
  try {
    const str = app.activeDocument.layers.getByName('BloomsPro_Grp')?.layers?.[1]?.name
    if (!str?.startsWith('{')) return null
    return toFullOptions(JSON.parse(str)) as GlowOptions
  } catch { }
  return null
}

export const regenerate = async (options?: GlowOptions) => {
  let error: Error | undefined
  // await core.executeAsModal(async () => {
  await app.activeDocument.suspendHistory(async () => {
    try {
      await generateGlow(options)
    } catch (e: any) {
      error = e
    }
  // }, { commandName: 'BloomsPro - Regenerate' })
  }, 'BloomsPro - ' + lang.histories.generate)
  if (error) throw error
}
