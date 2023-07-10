import enUS from './enUS'
import zhCN from './zhCN'

export default window.require('uxp').host.uiLocale === 'zh_CN' ? zhCN : enUS
