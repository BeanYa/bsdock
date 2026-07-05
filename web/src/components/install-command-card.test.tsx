import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallCommandCard, InstallCommandDisplay } from './install-command-card'

describe('InstallCommandDisplay', () => {
  it('shows generate prompt when command is empty', async () => {
    const onGenerate = vi.fn()
    render(<InstallCommandDisplay installCommand="" onGenerate={onGenerate} />)
    await userEvent.click(screen.getByRole('button', { name: /generate install command/i }))
    expect(onGenerate).toHaveBeenCalled()
  })

  it('renders command with terminal prompt and copy/regenerate buttons', async () => {
    const onGenerate = vi.fn()
    render(<InstallCommandDisplay installCommand="curl test" onGenerate={onGenerate} />)
    expect(screen.getByText(/curl test/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /regenerate/i }))
    expect(onGenerate).toHaveBeenCalled()
  })
})

describe('InstallCommandCard', () => {
  it('renders header title', () => {
    render(<InstallCommandCard installCommand="curl test" onGenerate={() => {}} />)
    expect(screen.getByText('Install Command')).toBeInTheDocument()
  })
})
