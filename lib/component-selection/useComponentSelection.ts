import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { ComponentGroup } from './types'

type UseComponentSelectionOptions = {
  componentHierarchy: ComponentGroup[]
}

const componentNameToSlot = (name: string) => {
  const generatedMatch = name.match(/^Div(\d{3})$/)
  if (generatedMatch) {
    return `div-${generatedMatch[1]}`
  }

  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

const slotToComponentName = (slot: string) =>
  slot
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

function selectFromEventTarget(
  target: EventTarget | null,
  setSelectedComponent: (component: string | null) => void
) {
  if (!(target instanceof Element)) return
  const element = target.closest('[data-slot]')
  if (!element) return
  const slot = element.getAttribute('data-slot')
  if (!slot) return
  setSelectedComponent(slotToComponentName(slot))
}

function findGroupForComponent(componentHierarchy: ComponentGroup[], componentName: string) {
  return componentHierarchy.find(
    (group) => group.name === componentName || group.children.includes(componentName)
  )
}

export function useComponentSelection({ componentHierarchy }: UseComponentSelectionOptions) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedComponent(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navigateDown = (currentComponent: string) => {
    for (const group of componentHierarchy) {
      if (group.name === currentComponent) {
        setSelectedComponent(group.children[0] ?? null)
        return
      }

      const childIndex = group.children.indexOf(currentComponent)
      if (childIndex !== -1) {
        const nextIndex = (childIndex + 1) % group.children.length
        setSelectedComponent(group.children[nextIndex] ?? null)
        return
      }
    }
  }

  const handleCanvasClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (!(e.target instanceof Element)) return
    const element = e.target.closest('[data-slot]')
    if (!element) return

    const slot = element.getAttribute('data-slot')
    if (!slot) return

    const clickedComponent = slotToComponentName(slot)
    const group = findGroupForComponent(componentHierarchy, clickedComponent)

    if (!group) {
      setSelectedComponent(clickedComponent)
      return
    }

    const isInSameGroup =
      selectedComponent === group.name ||
      group.children.includes(selectedComponent ?? '')

    if (!isInSameGroup) {
      setSelectedComponent(group.name)
      return
    }

    if (selectedComponent === group.name) {
      if (clickedComponent === group.name) {
        setSelectedComponent(group.children[0] ?? group.name)
      } else {
        setSelectedComponent(clickedComponent)
      }
      return
    }

    setSelectedComponent(clickedComponent)
  }

  const handleCanvasDoubleClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    selectFromEventTarget(e.target, setSelectedComponent)
  }

  useEffect(() => {
    const root = canvasRef.current
    if (!root) return

    root.querySelectorAll('[data-codex-selected="true"]').forEach((el) => {
      el.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50')
      el.removeAttribute('data-codex-selected')
    })

    if (!selectedComponent) return

    const slot = componentNameToSlot(selectedComponent)
    root.querySelectorAll(`[data-slot="${slot}"]`).forEach((el) => {
      el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50')
      el.setAttribute('data-codex-selected', 'true')
    })
  }, [selectedComponent])

  return {
    selectedComponent,
    setSelectedComponent,
    canvasRef,
    navigateDown,
    handleCanvasClickCapture,
    handleCanvasDoubleClickCapture,
  }
}
