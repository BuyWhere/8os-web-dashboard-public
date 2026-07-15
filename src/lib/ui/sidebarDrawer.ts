'use client'

/**
 * Tiny dependency-free store so the mobile hamburger (in Header.tsx) can toggle
 * the sidebar drawer (in Sidebar.tsx) even though they are separate,
 * non-nested components. Uses useSyncExternalStore — no new deps.
 */
import { useSyncExternalStore } from 'react'

let open = false
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function openSidebarDrawer() {
  if (open) return
  open = true
  emit()
}

export function closeSidebarDrawer() {
  if (!open) return
  open = false
  emit()
}

export function toggleSidebarDrawer() {
  open = !open
  emit()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot() {
  return open
}

// Server render: drawer is always closed.
function getServerSnapshot() {
  return false
}

export function useSidebarDrawer() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
