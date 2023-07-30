import type langType from './enUS'

const lang: typeof langType = {
  thanksForStar: '感谢您的Star!',
  bloom: '绽放!',
  mode: '模式',
  types: {
    bloomSoft: '泛光 (柔光)',
    bloom: '泛光',
    glare: '眩光 (线条光)'
  },
  glare: {
    rotation: '光线角度',
    postBlur: '后期模糊',
    rayCount: '光线数量'
  },
  colorize: '光着色',
  showRange: '显示采样范围',
  sameBlur: '每层模糊都相同',
  skipSkin: '肤色保护',
  linearBlur: '线性模糊',
  blurTimes: '模糊次数',
  intensity: '强度',
  size: '大小',
  threshold: '阈值',
  brightness: '亮度',
  chromaticAberration: '色散',
  cancel: '取消',
  apply: '应用',
  edit: '编辑',
  second: '秒',
  enableMask: '启用蒙版',
  originalImage: '原始图像',
  histories: {
    init: '初始化',
    generate: '生成'
  }
}

export default lang
