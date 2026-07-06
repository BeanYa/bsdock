import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Activity, Server, Terminal } from 'lucide-react'
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
    <div className="relative grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      <div className="ambient-light" aria-hidden="true" />

      {/* Left status panel */}
      <div className="relative hidden flex-col justify-between border-r border-white/[0.08] bg-[rgba(20,28,45,0.45)] p-12 backdrop-blur-xl lg:flex lg:p-16 xl:p-20">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold text-[#E8EBF0]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00F0FF] text-[#080A0F]">
              B
            </div>
            BSDock
          </div>
        </div>

        <div className="w-full max-w-xl space-y-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-[#E8EBF0]">轻量 Panel-Node 管理平台</h2>
            <p className="mt-2 text-[#8B95A8]">
              简单、快速地监控和管理分布在各处的服务器节点。
            </p>
          </div>

          <div className="space-y-3">
            {features.map((f) => (
              <div
                key={f.label}
                className="flex items-start gap-4 rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.45)] p-4 backdrop-blur-md"
              >
                <div className="rounded-md border border-white/[0.08] bg-[rgba(0,240,255,0.12)] p-2 text-[#00F0FF]">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-[#E8EBF0]">{f.label}</h3>
                  <p className="text-sm text-[#8B95A8]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-[#8B95A8]">BSDock v0.0.1</div>
      </div>

      {/* Right login form */}
      <div className="relative flex flex-col justify-center p-6 lg:p-10">
        <div className="mb-8 lg:hidden">
          <div className="flex items-center gap-2 text-2xl font-bold text-[#E8EBF0]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00F0FF] text-[#080A0F]">
              B
            </div>
            BSDock
          </div>
          <p className="mt-2 text-sm text-[#8B95A8]">轻量 Panel-Node 管理平台</p>
        </div>

        <Card className="mx-auto w-full max-w-sm border-white/[0.08] bg-[rgba(20,28,45,0.65)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-[#E8EBF0]">登录到 BSDock</CardTitle>
            <p className="text-sm text-[#8B95A8]">输入你的管理员账号继续</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#8B95A8]">用户名</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="border-white/[0.08] bg-[rgba(8,10,15,0.6)] text-[#E8EBF0] placeholder:text-[#8B95A8]/50 focus-visible:ring-[#00F0FF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#8B95A8]">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-white/[0.08] bg-[rgba(8,10,15,0.6)] text-[#E8EBF0] placeholder:text-[#8B95A8]/50 focus-visible:ring-[#00F0FF]"
                />
              </div>
              <Button type="submit" className="w-full bg-[#00F0FF] text-[#080A0F] hover:bg-[#00F0FF]/90" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
