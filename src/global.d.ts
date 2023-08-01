import * as React from 'react'

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace JSX {
    // eslint-disable-next-line no-unused-vars
    interface IntrinsicElements {
      'sp-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & { variant?: string, class?: string }
      'sp-checkbox': React.DetailedHTMLProps<React.HTMLInputAttributes<HTMLInputElement>, HTMLInputElement>
      'sp-body': React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & { size?: string, class?: string }
      'sp-picker': React.DetailedHTMLProps<React.HTMLInputAttributes<HTMLInputElement>, HTMLInputElement>
      'sp-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>
      'sp-menu-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & { disabled?: boolean }
      'sp-menu-divider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>
      'sp-label': React.DetailedHTMLProps<React.HTMLAttributes<HTMLLabelElement>, HTMLLabelElement> & { class?: string }
      'sp-divider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & { size?: string }
      'sp-slider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & { value?: number, min?: number, max?: number, step?: number, size?: string, variant?: string }
      'sp-detail': React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & { size?: string }
    }
  }

  declare interface Window {
    require (module: string): any
  }
}

declare module '@adobe/xd-plugin-toolkit' {
  declare interface dialogs {
    async alert (title: string, ...msgs: string[]): Promise<{which: number}>
  }

  declare export { dialogs }
}
