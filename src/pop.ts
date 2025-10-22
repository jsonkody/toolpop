import {
  computePosition,
  type Placement,
  autoUpdate,
  flip,
  shift,
  offset,
} from '@floating-ui/dom'
import type { DirectiveBinding, ObjectDirective } from 'vue'

export interface PopOptions {
  fontSize: number
  paddingX: number
  paddingY: number
  duration: number
  fontFamily: string
  color: string
  backgroundColor: string
  borderColor: string
  borderRadius: number
  scaleStart: number
  blur: number
  maxWidth: number
  zIndex: number
  hoverDelay: number // delay před zobrazením při hoveru (ms)
  closeDelay: number // delay před zavřením při leave (ms)
}

const defaultOptions: PopOptions = {
  fontSize: 14,
  paddingX: 8,
  paddingY: 0,
  duration: 0.15,
  fontFamily: 'system-ui, sans-serif',
  color: 'white',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderColor: 'rgba(255, 255, 255, 0.28)',
  borderRadius: 6,
  scaleStart: 0.75,
  blur: 14,
  maxWidth: 672, // 42rem = 672px
  zIndex: 9999,
  hoverDelay: 0,
  closeDelay: 0, // Žádný delay - okamžitá reakce
}

export type Origin = 'top' | 'bottom' | 'left' | 'right'

const origins: Record<string, Origin> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
}

function unwrap(val: any): string {
  if (typeof val === 'function') {
    return unwrap(val())
  }
  if (typeof val === 'object' && val !== null && 'value' in val) {
    return unwrap(val.value)
  }
  return String(val ?? '')
}

type ElWithPopover = HTMLElement & {
  _popover?: HTMLDivElement
  _binding?: DirectiveBinding
  _hideTimeout?: number
  _showTimeout?: number
  _autoUpdateCleanup?: () => void
  _removeEventListeners?: () => void
  _clickOutsideHandler?: (e: MouseEvent) => void
  _isLocked?: boolean // Pro .mouseinlock - sleduje jestli je menu "locked"
}

export function createPop(
  globalOptions?: Partial<PopOptions>
): ObjectDirective {
  const finalOptions: PopOptions = {
    ...defaultOptions,
    ...globalOptions,
  }

  return {
    mounted(el: ElWithPopover, binding: DirectiveBinding) {
      const placement = (binding.arg || 'top') as Placement
      const origin: Origin = origins[placement] || 'top'
      
      // Modifiers - KISS principle:
      // .click = trigger na click místo hover
      // .clickout = zavře se jen na click mimo (ne na mouseout)
      // .clickany = zavře se na jakýkoliv click (pro menu)
      // .html = HTML obsah, bez stylů, vždycky interactive
      // .mouseinlock = po kliku do menu přepne z clickany na mouseout mode
      const { html, click, clickout, clickany, mouseinlock } = binding.modifiers
      
      el._binding = binding
      el._isLocked = false // Pro mouseinlock

      // HTML je vždycky interaktivní
      const isInteractive = html

      const createPopover = () => {
        const popover = document.createElement('div')
        const content = unwrap(el._binding?.value)
        if (!content.trim()) return

        // Base styles pro všechny popovers
        popover.style.cssText = `
          transition: opacity ${finalOptions.duration}s, transform ${finalOptions.duration}s;
          opacity: 0;
          transform: scale(${finalOptions.scaleStart});
          transform-origin: ${origin};
          pointer-events: ${isInteractive ? 'auto' : 'none'};
          position: absolute;
          z-index: ${finalOptions.zIndex};
          max-width: ${finalOptions.maxWidth}px;
          display: inline-block;
        `

        if (html) {
          // HTML popover - bez stylingu, jen raw HTML
          popover.innerHTML = content
        } else {
          // Text tooltip - se stylingem
          popover.textContent = content
          popover.style.cssText += `
            font-family: ${finalOptions.fontFamily};
            font-size: ${finalOptions.fontSize}px;
            background-color: ${finalOptions.backgroundColor};
            backdrop-filter: blur(${finalOptions.blur}px);
            color: ${finalOptions.color};
            border-radius: ${finalOptions.borderRadius}px;
            border: 1px solid ${finalOptions.borderColor};
            padding: ${finalOptions.paddingY}px ${finalOptions.paddingX}px;
          `
        }

        document.body.appendChild(popover)
        el._popover = popover
      }

      const updatePosition = () => {
        if (!el._popover) return
        
        computePosition(el, el._popover, {
          placement,
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        }).then(({ x, y, placement }) => {
          if (!el._popover) return
          el._popover.style.top = `${y}px`
          el._popover.style.left = `${x}px`
          el._popover.style.transformOrigin = origins[placement] || 'top'
        })
      }

      const showPopover = () => {
        const content = unwrap(el._binding?.value)
        if (!content.trim()) return
        
        if (el._hideTimeout) clearTimeout(el._hideTimeout)
        if (el._showTimeout) clearTimeout(el._showTimeout)
        
        // Reset lock state
        el._isLocked = false
        
        if (!el._popover) createPopover()
        if (!el._popover) return
        
        const popover = el._popover

        // Update content
        if (html) {
          popover.innerHTML = content
        } else {
          popover.textContent = content
        }

        updatePosition()

        requestAnimationFrame(() => {
          popover.style.opacity = '1'
          popover.style.transform = 'scale(1)'
        })

        // Auto-update position při scrollu/resize
        el._autoUpdateCleanup = autoUpdate(el, popover, updatePosition)

        // Pro interaktivní popovers: nezavírej když myš přejde na popover
        if (isInteractive && !clickout && !clickany) {
          popover.addEventListener('mouseenter', () => {
            if (el._hideTimeout) clearTimeout(el._hideTimeout)
          })
          popover.addEventListener('mouseleave', () => {
            if (!clickout && !clickany) {
              el._hideTimeout = window.setTimeout(hidePopover, finalOptions.closeDelay)
            }
          })
        }

        // .mouseinlock: po kliku do menu aktivuj mouseout mode
        if (mouseinlock && clickany) {
          popover.addEventListener('click', () => {
            if (!el._isLocked) {
              el._isLocked = true
              
              // Odstraň clickany handler
              cleanupClickHandlers()
              
              // Přidej mouseout handler
              popover.addEventListener('mouseleave', hidePopover)
            }
          })
        }

        // .clickout nebo .clickany = zavře se na click
        if (clickout || clickany) {
          setupClickHandlers()
        }
      }

      const hidePopover = () => {
        if (!el._popover) return
        const popover = el._popover
        
        popover.style.opacity = '0'
        popover.style.transform = `scale(${finalOptions.scaleStart})`
        
        if (el._autoUpdateCleanup) {
          el._autoUpdateCleanup()
          el._autoUpdateCleanup = undefined
        }

        cleanupClickHandlers()
        
        el._hideTimeout = window.setTimeout(() => {
          if (el._popover) {
            el._popover.remove()
            el._popover = undefined
          }
        }, finalOptions.duration * 1000)
      }

      const setupClickHandlers = () => {
        if (el._clickOutsideHandler) return
        
        if (clickany) {
          // .clickany = zavře se na jakýkoliv click
          // ALE pokud je .mouseinlock a _isLocked, ignoruj clicks
          el._clickOutsideHandler = (e: MouseEvent) => {
            if (mouseinlock && el._isLocked) return // Locked = ignoruj clicks
            hidePopover()
          }
        } else {
          // .clickout = zavře se jen na click mimo element+popover
          el._clickOutsideHandler = (e: MouseEvent) => {
            const target = e.target as Node
            if (!el.contains(target) && el._popover && !el._popover.contains(target)) {
              hidePopover()
            }
          }
        }
        
        // Malý timeout aby se nezavřel okamžitě po otevření
        setTimeout(() => {
          document.addEventListener('click', el._clickOutsideHandler!)
        }, 10)
      }

      const cleanupClickHandlers = () => {
        if (el._clickOutsideHandler) {
          document.removeEventListener('click', el._clickOutsideHandler)
          el._clickOutsideHandler = undefined
        }
      }

      const clickHandler = () => {
        if (el._popover) {
          hidePopover()
        } else {
          showPopover()
        }
      }

      const hoverShowHandler = () => {
        if (el._showTimeout) clearTimeout(el._showTimeout)
        el._showTimeout = window.setTimeout(showPopover, finalOptions.hoverDelay)
      }

      const hoverHideHandler = () => {
        if (el._showTimeout) clearTimeout(el._showTimeout)
        
        // .clickout nebo .clickany = nezavírej na mouseout
        if (clickout || clickany) return
        
        el._hideTimeout = window.setTimeout(hidePopover, finalOptions.closeDelay)
      }

      // Event listeners setup
      if (click) {
        // Click mode
        el.addEventListener('click', clickHandler)
        
        // Pokud není .clickout ani .clickany, zavře se na mouseout
        if (!clickout && !clickany) {
          el.addEventListener('mouseleave', hoverHideHandler)
        }
      } else {
        // Hover mode (default)
        el.addEventListener('mouseenter', hoverShowHandler)
        
        // Pokud není .clickout ani .clickany, zavře se na mouseout
        if (!clickout && !clickany) {
          el.addEventListener('mouseleave', hoverHideHandler)
        }
      }

      // Cleanup function
      el._removeEventListeners = () => {
        el.removeEventListener('mouseenter', hoverShowHandler)
        el.removeEventListener('mouseleave', hoverHideHandler)
        el.removeEventListener('click', clickHandler)
        cleanupClickHandlers()
      }
    },

    updated(el: ElWithPopover, binding: DirectiveBinding) {
      el._binding = binding
      const content = unwrap(binding.value)
      const isEmpty = !content.trim()

      if (el._popover) {
        if (isEmpty) {
          // Nový obsah je prázdný → schováš tooltip
          el._popover.remove()
          el._popover = undefined
          if (el._autoUpdateCleanup) {
            el._autoUpdateCleanup()
            el._autoUpdateCleanup = undefined
          }
        } else {
          // Aktualizuj obsah
          if (binding.modifiers.html) {
            el._popover.innerHTML = content
          } else {
            el._popover.textContent = content
          }
        }
      } else if (!isEmpty) {
        // Tooltip je skrytý, ale nový obsah není prázdný
        if (!binding.modifiers.click && el.matches(':hover')) {
          const event = new Event('mouseenter')
          el.dispatchEvent(event)
        }
      }
    },

    beforeUnmount(el: ElWithPopover) {
      el._removeEventListeners?.()
      
      if (el._popover) {
        el._popover.remove()
        el._popover = undefined
      }
      
      if (el._hideTimeout) {
        clearTimeout(el._hideTimeout)
      }
      
      if (el._showTimeout) {
        clearTimeout(el._showTimeout)
      }
      
      if (el._autoUpdateCleanup) {
        el._autoUpdateCleanup()
      }
    },
  }
}