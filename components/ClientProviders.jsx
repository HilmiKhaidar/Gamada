'use client'

import React from 'react'
import { UiProvider } from './UiProvider'

export default function ClientProviders({ children }) {
  return <UiProvider>{children}</UiProvider>
}
