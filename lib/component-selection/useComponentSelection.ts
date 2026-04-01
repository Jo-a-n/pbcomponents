import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { ComponentGroup } from './types'

type UseComponentSelectionOptions = {
  componentHierarchy: ComponentGroup[]
}

const componentNameToSlot = (name: string) => {
  const generatedMatch = name.match(/^Div(\d{3})(.*)$/)
  if (generatedMatch) {
    const index = generatedMatch[1]
    const suffix = generatedMatch[2] ?? ''
    const normalizedSuffix = suffix
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .replace(/^-/, '')
      .toLowerCase()

    return normalizedSuffix ? `div-${index}-${normalizedSuffix}` : `div-${index}`
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

function getSelectedElements(root: HTMLDivElement, selectedComponent: string | null) {
  if (!selectedComponent) return [] as Element[]

  const slot = componentNameToSlot(selectedComponent)
  return Array.from(root.querySelectorAll(`[data-slot="${slot}"]`))
}

function syncSelectionAttributes(
  previousElements: Element[],
  nextElements: Element[]
) {
  previousElements.forEach((element) => {
    if (!nextElements.includes(element)) {
      element.removeAttribute('data-codex-selected')
    }
  })

  nextElements.forEach((element) => {
    if (!previousElements.includes(element)) {
      element.setAttribute('data-codex-selected', 'true')
    }
  })
}

export function useComponentSelection({ componentHierarchy }: UseComponentSelectionOptions) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const selectedComponentRef = useRef<string | null>(null)
  const selectedElementsRef = useRef<Element[]>([])

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
    selectedComponentRef.current = selectedComponent

    const root = canvasRef.current
    if (!root) return

    const nextSelectedElements = getSelectedElements(root, selectedComponent)
    syncSelectionAttributes(selectedElementsRef.current, nextSelectedElements)
    selectedElementsRef.current = nextSelectedElements
  }, [selectedComponent])

  useEffect(() => {
    const root = canvasRef.current
    if (!root) return

    let animationFrameId = 0
    const observer = new MutationObserver(() => {
      if (animationFrameId) return

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = 0
        const nextSelectedElements = getSelectedElements(root, selectedComponentRef.current)
        syncSelectionAttributes(selectedElementsRef.current, nextSelectedElements)
        selectedElementsRef.current = nextSelectedElements
      })
    })

    observer.observe(root, {
      childList: true,
      subtree: true,
    })

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }

      observer.disconnect()
      syncSelectionAttributes(selectedElementsRef.current, [])
      selectedElementsRef.current = []
    }
  }, [])

  return {
    selectedComponent,
    setSelectedComponent,
    canvasRef,
    navigateDown,
    handleCanvasClickCapture,
    handleCanvasDoubleClickCapture,
  }
}
