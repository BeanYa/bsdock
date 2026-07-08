import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Save, ShieldCheck } from 'lucide-react'
import { GlassCard } from '@/components/glass-card'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api, type PanelSettings } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/settings/')({
  component: SettingsRoute,
})

const emptySettings: PanelSettings = {
  address: '',
  port: '8080',
  base_uri: '/',
  domain: '',
  panel_uri: '',
  tls_cert_path: '',
  tls_key_path: '',
  timezone: 'Asia/Shanghai',
}

function SettingsRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />
  }
  return <SettingsPage />
}

function SettingsPage() {
  const [settings, setSettings] = useState<PanelSettings>(emptySettings)
  const [saved, setSaved] = useState<PanelSettings>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [acmeOpen, setAcmeOpen] = useState(false)
  const [acmeDomain, setAcmeDomain] = useState('')
  const [acmeEmail, setAcmeEmail] = useState('')
  const [acmeLoading, setAcmeLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await api.getSettings()
        if (!cancelled) {
          setSettings({ ...emptySettings, ...data })
          setSaved({ ...emptySettings, ...data })
          setAcmeDomain(data.domain)
        }
      } catch (err) {
        if (!cancelled) {
          toast({
            title: 'Failed to load settings',
            description: err instanceof Error ? err.message : 'Could not load panel settings',
            variant: 'destructive',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [toast])

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(saved),
    [settings, saved]
  )

  const update = (key: keyof PanelSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const data = await api.saveSettings(settings)
      setSettings({ ...emptySettings, ...data })
      setSaved({ ...emptySettings, ...data })
      toast({ title: 'Settings saved', description: 'Restart the panel to apply listener changes.' })
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const requestAcme = async () => {
    setAcmeLoading(true)
    try {
      const result = await api.requestAcmeCertificate({
        domain: acmeDomain,
        email: acmeEmail || undefined,
      })
      setSettings((current) => ({
        ...current,
        domain: result.domain,
        tls_cert_path: result.tls_cert_path,
        tls_key_path: result.tls_key_path,
      }))
      setSaved((current) => ({
        ...current,
        domain: result.domain,
        tls_cert_path: result.tls_cert_path,
        tls_key_path: result.tls_key_path,
      }))
      toast({ title: 'Certificate issued', description: 'TLS paths were applied to panel settings.' })
      setAcmeOpen(false)
    } catch (err) {
      toast({
        title: 'ACME request failed',
        description: err instanceof Error ? err.message : 'Certificate request did not complete',
        variant: 'destructive',
      })
    } finally {
      setAcmeLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8892A0]">Interface</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#E8EBF0]">Panel Settings</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-white/10 bg-white/[0.03]"
            onClick={() => {
              setAcmeDomain(settings.domain)
              setAcmeOpen(true)
            }}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            ACME
          </Button>
          <Button type="button" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </section>

      <GlassCard hover={false} className="command-surface">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#E8EBF0]">Interface binding</p>
              <p className="mt-1 text-xs text-[#8B95A8]">Address, public path, and TLS assets for the web console.</p>
            </div>
            <span
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs',
                dirty
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              )}
            >
              {dirty ? 'Unsaved' : 'Synced'}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SettingsField label="Address" value={settings.address} onChange={(value) => update('address', value)} placeholder="0.0.0.0" />
            <SettingsField label="Port" value={settings.port} onChange={(value) => update('port', value)} inputMode="numeric" />
            <SettingsField label="Base URI" value={settings.base_uri} onChange={(value) => update('base_uri', value)} />
            <SettingsField label="Domain" value={settings.domain} onChange={(value) => update('domain', value)} placeholder="panel.example.com" />
            <SettingsField label="SSL Key Path" value={settings.tls_key_path} onChange={(value) => update('tls_key_path', value)} />
            <SettingsField label="SSL Certificate Path" value={settings.tls_cert_path} onChange={(value) => update('tls_cert_path', value)} />
            <SettingsField label="Panel URI" value={settings.panel_uri} onChange={(value) => update('panel_uri', value)} />
            <SettingsField label="Timezone Location" value={settings.timezone} onChange={(value) => update('timezone', value)} />
          </div>
        </CardContent>
      </GlassCard>

      <Dialog open={acmeOpen} onOpenChange={setAcmeOpen}>
        <DialogContent className="glass text-[#E8EBF0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#E8EBF0]">ACME Certificate</DialogTitle>
            <DialogDescription className="text-[#8B95A8]">
              Request a certificate with HTTP-01. The domain must resolve to this server and public port 80 must be reachable.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <SettingsField label="Domain" value={acmeDomain} onChange={setAcmeDomain} placeholder="panel.example.com" />
            <SettingsField label="Email" value={acmeEmail} onChange={setAcmeEmail} placeholder="admin@example.com" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAcmeOpen(false)} disabled={acmeLoading}>
                Cancel
              </Button>
              <Button type="button" onClick={requestAcme} disabled={acmeLoading || !acmeDomain.trim()}>
                {acmeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface SettingsFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}

function SettingsField({ label, value, onChange, placeholder, inputMode }: SettingsFieldProps) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8892A0]">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-12 rounded-lg border-white/10 bg-white/[0.04] font-mono text-[#E8EBF0] placeholder:text-[#667085]"
      />
    </div>
  )
}
