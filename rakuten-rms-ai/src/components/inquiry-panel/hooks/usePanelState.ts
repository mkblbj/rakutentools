import { useState, useEffect, useCallback } from "react"

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

const STORAGE_KEY = "inquiry_panel_state"

/**
 * 管理面板位置和大小的持久化
 */
export function usePanelState(defaultPosition: Position, defaultSize: Size) {
  const [position, setPosition] = useState<Position>(defaultPosition)
  const [size, setSize] = useState<Size>(defaultSize)
  const [isLoaded, setIsLoaded] = useState(false)

  // 加载保存的状态
  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (result[STORAGE_KEY]) {
        const saved = result[STORAGE_KEY]
        if (saved.position) {
          // 确保位置在窗口范围内
          setPosition({
            x: Math.min(Math.max(0, saved.position.x), window.innerWidth - 100),
            y: Math.min(Math.max(0, saved.position.y), window.innerHeight - 100),
          })
        }
        if (saved.size) {
          setSize(saved.size)
        }
      }
      setIsLoaded(true)
    })
  }, [])

  // 保存状态到 storage
  const saveState = useCallback((newPosition: Position, newSize: Size) => {
    chrome.storage.local.set({
      [STORAGE_KEY]: {
        position: newPosition,
        size: newSize,
      },
    })
  }, [])

  // 更新位置
  const updatePosition = useCallback((newPosition: Position) => {
    setPosition(newPosition)
    saveState(newPosition, size)
  }, [size, saveState])

  // 更新大小
  const updateSize = useCallback((newSize: Size) => {
    setSize(newSize)
    saveState(position, newSize)
  }, [position, saveState])

  return {
    position,
    size,
    isLoaded,
    updatePosition,
    updateSize,
  }
}
