import React, { useEffect, useLayoutEffect } from 'react'

// eslint-disable-next-line no-undef
const Checkbox: React.FC<{
  label?: string
  onChange?: (val: boolean) => void
  checked?: boolean
  class?: string
  children?: React.ReactNode
}> = ({ label, onChange, checked, ...props }) => {
  const ref = React.useRef<any>(null)
  useLayoutEffect(() => {
    ref.current.checked = checked
    ref.current.oldValue = checked
  }, [checked])
  useEffect(() => {
    if (!ref.current) return
    const current = ref.current
    const fn = () => {
      const newValue = ref.current.checked
      ref.current.checked = ref.current.oldValue
      if (onChange) onChange(newValue)
    }
    current.addEventListener('change', fn)
    return () => { current.removeEventListener('change', fn) }
  }, [onChange])
  return (
    <sp-checkbox {...props} ref={ref} />
  )
}

export default Checkbox
