import React, { useEffect, useLayoutEffect } from 'react'

// eslint-disable-next-line no-undef
const Slider: React.FC<{
  label?: string
  min?: number
  max?: number
  step?: number
  size?: string
  variant?: string
  onChange?: (id: number) => void
  value?: number
  placeholder?: string
  class?: string
}> = ({ label, onChange, value, ...props }) => {
  const ref = React.useRef<any>(null)
  useLayoutEffect(() => {
    ref.current.value = value
    ref.current.oldValue = value
  }, [value])
  useEffect(() => {
    if (!ref.current) return
    const current = ref.current
    const fn = () => {
      const newValue = +ref.current.value
      ref.current.value = ref.current.oldValue
      if (onChange) onChange(newValue)
    }
    current.addEventListener('change', fn)
    return () => { current.removeEventListener('change', fn) }
  }, [onChange])
  return (
    <sp-slider max={100} size='S' variant='filled' fill-offset='left' {...props} ref={ref}>
      {label && <sp-label slot='label'>{label}</sp-label>}
    </sp-slider>
  )
}

export default Slider
