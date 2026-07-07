import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  Fingerprint,
  LockKeyhole,
  Server,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import { api } from '@/lib/api'
import { setToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

const features = [
  { icon: Activity, label: '实时监控', desc: '节点状态通过 WebSocket 实时同步' },
  { icon: Terminal, label: '一键安装', desc: '生成各平台 Agent 安装命令' },
  { icon: Server, label: '集中管理', desc: 'Panel 集中管理所有 Node 节点' },
]

const accessSignals = [
  { label: 'Control plane', value: 'Panel / Agent mesh' },
  { label: 'Session scope', value: 'Administrator access' },
  { label: 'Transport', value: 'TLS + token validation' },
]

function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await api.login(username, password)
      setToken(data.token)
      toast({ title: '登录成功' })
      navigate({ to: '/nodes' })
    } catch (err) {
      toast({
        title: '登录失败',
        description: err instanceof Error ? err.message : '请检查用户名和密码',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06080D]">
      <div className="ambient-light" aria-hidden="true" />
      <div className="command-grid absolute inset-0 opacity-50" aria-hidden="true" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative hidden border-r border-white/[0.08] lg:flex">
          <div className="flex w-full flex-col justify-between px-12 py-14 xl:px-16 xl:py-16">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#8B95A8]">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Command Center Access
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 text-2xl font-bold text-[#E8EBF0]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#00F0FF] text-[#080A0F]">
                    B
                  </div>
                  BSDock
                </div>
                <div className="max-w-xl space-y-4">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#00F0FF]/80">
                    Secure operator gateway
                  </p>
                  <h1 className="text-4xl font-semibold tracking-tight text-[#E8EBF0]">
                    进入你的 Panel 指挥台，继续管理整套节点网络。
                  </h1>
                  <p className="max-w-lg text-base leading-7 text-[#8B95A8]">
                    登录后继续处理节点接入、运行遥测、安装命令和全局运行日志，保持运维视角始终在同一条控制链路里。
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-3">
                {features.map((feature) => (
                  <div
                    key={feature.label}
                    className="command-surface flex items-start gap-4 rounded-xl border border-white/[0.08] px-4 py-4"
                  >
                    <div className="mt-0.5 rounded-md border border-white/[0.08] bg-[#00F0FF]/10 p-2 text-[#00F0FF]">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-[#E8EBF0]">{feature.label}</h2>
                      <p className="mt-1 text-sm leading-6 text-[#8B95A8]">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="command-surface rounded-xl border border-white/[0.08] px-5 py-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#E8EBF0]">
                  <ShieldCheck className="h-4 w-4 text-[#00F0FF]" />
                  Access posture
                </div>
                <div className="grid gap-3">
                  {accessSignals.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3 last:border-b-0 last:pb-0"
                    >
                      <span className="text-xs uppercase tracking-[0.16em] text-[#8B95A8]">{item.label}</span>
                      <span className="text-sm font-medium text-[#E8EBF0]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-[#8B95A8]">
              <span>BSDock v0.0.1</span>
              <span>Control plane ready</span>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col justify-center px-6 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 space-y-4 lg:hidden">
              <div className="flex items-center gap-3 text-2xl font-bold text-[#E8EBF0]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00F0FF] text-[#080A0F]">
                  B
                </div>
                BSDock
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#00F0FF]/80">
                  Secure operator gateway
                </p>
                <p className="text-sm leading-6 text-[#8B95A8]">
                  登录后继续处理节点接入、遥测和运行日志。
                </p>
              </div>
            </div>

            <Card className="command-surface border-white/[0.08] bg-[rgba(10,14,22,0.8)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_80px_rgba(0,0,0,0.45)]">
              <CardHeader className="space-y-4 border-b border-white/[0.08] pb-5">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[#8B95A8]">
                  <LockKeyhole className="h-3.5 w-3.5 text-[#00F0FF]" />
                  Login required
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl text-[#E8EBF0]">登录到 BSDock</CardTitle>
                  <p className="text-sm leading-6 text-[#8B95A8]">
                    使用管理员账号解锁 command center 并恢复控制面访问。
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.02)] px-3 py-3">
                    <Fingerprint className="h-4 w-4 text-[#00F0FF]" />
                    <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#8B95A8]">Identity</p>
                    <p className="mt-1 text-sm font-medium text-[#E8EBF0]">Admin</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.02)] px-3 py-3">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#8B95A8]">Scope</p>
                    <p className="mt-1 text-sm font-medium text-[#E8EBF0]">Control plane</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.02)] px-3 py-3">
                    <Terminal className="h-4 w-4 text-[#8B95A8]" />
                    <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#8B95A8]">Session</p>
                    <p className="mt-1 text-sm font-medium text-[#E8EBF0]">Realtime</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-[#8B95A8]">
                      用户名
                    </Label>
                    <Input
                      id="username"
                      placeholder="admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-11 border-white/[0.08] bg-[rgba(8,10,15,0.72)] text-[#E8EBF0] placeholder:text-[#8B95A8]/50 focus-visible:ring-[#00F0FF]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[#8B95A8]">
                      密码
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 border-white/[0.08] bg-[rgba(8,10,15,0.72)] text-[#E8EBF0] placeholder:text-[#8B95A8]/50 focus-visible:ring-[#00F0FF]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="h-11 w-full gap-2 bg-[#00F0FF] text-[#080A0F] hover:bg-[#00F0FF]/90"
                    disabled={loading}
                  >
                    {loading ? '登录中...' : '进入 Command Center'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
