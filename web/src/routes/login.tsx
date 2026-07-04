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
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      <div className="relative hidden flex-col justify-between bg-muted/30 p-12 lg:p-16 xl:p-20 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              B
            </div>
            BSDock
          </div>
        </div>
        <div className="relative z-10 w-full max-w-xl space-y-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">轻量 Panel-Node 管理平台</h2>
            <p className="mt-2 text-muted-foreground">
              简单、快速地监控和管理分布在各处的服务器节点。
            </p>
          </div>
          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-start gap-4 rounded-lg border bg-card/50 p-4">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{f.label}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-sm text-muted-foreground">BSDock v0.0.1</div>
      </div>

      <div className="flex flex-col justify-center p-6 lg:p-10">
        <div className="mb-8 lg:hidden">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              B
            </div>
            BSDock
          </div>
          <p className="mt-2 text-sm text-muted-foreground">轻量 Panel-Node 管理平台</p>
        </div>
        <Card className="mx-auto w-full max-w-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">登录到 BSDock</CardTitle>
            <p className="text-sm text-muted-foreground">输入你的管理员账号继续</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
