/**
 * HachiosSettingsPage
 *
 * Account and API key for Hachios service.
 * Persisted to ~/.craft-agent/config.json via storage.ts.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { routes } from '@/lib/navigate'
import { Spinner } from '@craft-agent/ui'
import {
  SettingsSection,
  SettingsCard,
  SettingsInput,
} from '@/components/settings'
import type { DetailsPageMeta } from '@/lib/navigation-registry'

export const meta: DetailsPageMeta = {
  navigator: 'settings',
  slug: 'hachios',
}

interface HachiosFormState {
  account: string
  apiKey: string
}

const EMPTY_FORM: HachiosFormState = {
  account: '',
  apiKey: '',
}

export default function HachiosSettingsPage() {
  const { t } = useTranslation()
  const [formState, setFormState] = useState<HachiosFormState>(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialLoadRef = useRef(true)
  const formStateRef = useRef(formState)
  const lastSavedRef = useRef<string | null>(null)

  useEffect(() => {
    formStateRef.current = formState
  }, [formState])

  // Load settings on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [account, apiKey] = await Promise.all([
          window.electronAPI.getHachiosAccount(),
          window.electronAPI.getHachiosApiKey(),
        ])
        const loaded = { account, apiKey }
        setFormState(loaded)
        lastSavedRef.current = JSON.stringify(loaded)
      } catch (err) {
        console.error('Failed to load hachios settings:', err)
      } finally {
        setIsLoading(false)
        setTimeout(() => { isInitialLoadRef.current = false }, 100)
      }
    }
    load()
  }, [])

  // Auto-save with debouncing
  useEffect(() => {
    if (isInitialLoadRef.current || isLoading) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await Promise.all([
          window.electronAPI.setHachiosAccount(formState.account),
          window.electronAPI.setHachiosApiKey(formState.apiKey),
        ])
        lastSavedRef.current = JSON.stringify(formState)
      } catch (err) {
        console.error('Failed to save hachios settings:', err)
      }
    }, 500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [formState, isLoading])

  // Force save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      const currentJson = JSON.stringify(formStateRef.current)
      if (lastSavedRef.current !== currentJson && !isInitialLoadRef.current) {
        const s = formStateRef.current
        Promise.all([
          window.electronAPI.setHachiosAccount(s.account),
          window.electronAPI.setHachiosApiKey(s.apiKey),
        ]).catch((err) => {
          console.error('Failed to save hachios settings on unmount:', err)
        })
      }
    }
  }, [])

  const updateField = useCallback(<K extends keyof HachiosFormState>(
    field: K,
    value: HachiosFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }))
  }, [])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner className="text-lg text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <PanelHeader title={t('settings.hachios.title')} actions={<HeaderMenu route={routes.view.settings('hachios')} />} />
      <div className="flex-1 min-h-0 mask-fade-y">
        <ScrollArea className="h-full">
          <div className="px-5 py-7 max-w-3xl mx-auto space-y-8">
            {/* Account */}
            <SettingsSection title={t('settings.hachios.account')} description={t('settings.hachios.accountDesc')}>
              <SettingsCard>
                <SettingsInput
                  label={t('settings.hachios.accountLabel')}
                  value={formState.account}
                  onChange={(v) => updateField('account', v)}
                  placeholder={t('settings.hachios.accountPlaceholder')}
                  inCard
                />
              </SettingsCard>
            </SettingsSection>

            {/* API Key */}
            <SettingsSection title={t('settings.hachios.apiKey')} description={t('settings.hachios.apiKeyDesc')}>
              <SettingsCard>
                <SettingsInput
                  label={t('settings.hachios.apiKeyLabel')}
                  value={formState.apiKey}
                  onChange={(v) => updateField('apiKey', v)}
                  placeholder={t('settings.hachios.apiKeyPlaceholder')}
                  type="password"
                  inCard
                />
              </SettingsCard>
            </SettingsSection>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
