import type langType from './enUS'

const lang: typeof langType = {
  thanksForStar: '感谢您的Star!',
  bloom: '绽放!',
  mode: '模式',
  o: {
    types: {
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
    blurTimes: '模糊次数'
  },
  intensity: '强度',
  size: '大小',
  threshold: '阈值',
  brightness: '亮度',
  chromaticAberration: '色散',
  cancel: '取消',
  apply: '应用',
  second: '秒'
}

export default lang
