import React, { useEffect, useLayoutEffect } from 'react'

// eslint-disable-next-line no-undef
const Picker: React.FC<{
  label?: string, onChange?: (id: number) => void, value?: number, children: React.ReactNode, placeholder?: string, size?: string, class?: string
}> = ({ label, onChange, value, children, ...props }) => {
  const ref = React.useRef<any>(null)
  useLayoutEffect(() => {
    ref.current.selectedIndex = value
    ref.current.oldValue = value
  }, [value])
  useEffect(() => {
    if (!ref.current) return
    const current = ref.current
    const fn = () => {
      const newValue = ref.current.selectedIndex
      if (newValue === ref.current.oldValue) return
      ref.current.selectedIndex = ref.current.oldValue
      if (onChange) onChange(newValue)
    }
    current.addEventListener('change', fn)
    return () => { current.removeEventListener('change', fn) }
  }, [onChange])
  return (
    <sp-picker {...props} ref={ref}>
      {label && <sp-label slot='label'>{label}</sp-label>}
      <sp-menu slot='options'>
        {children}
      </sp-menu>
    </sp-picker>
  )
}

export default Picker
