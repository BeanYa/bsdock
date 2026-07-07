import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallCommandCard, InstallCommandDisplay } from './install-command-card'

describe('InstallCommandDisplay', () => {
  beforeEach(() => {
    cleanup()
  })

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

  it('renders command text in a high-contrast terminal surface', () => {
    render(<InstallCommandDisplay installCommand="curl test" onGenerate={() => {}} />)
    expect(screen.getAllByText(/curl test/)[0].closest('pre')).toHaveClass(
      'font-mono',
      'text-sm',
      'text-[#E8EBF0]'
    )
  })
})

describe('InstallCommandCard', () => {
  beforeEach(() => {
    cleanup()
  })

  it('renders header title', () => {
    render(<InstallCommandCard installCommand="curl test" onGenerate={() => {}} />)
    expect(screen.getByText('Install Command')).toBeInTheDocument()
  })

  it('uses command surface styling for the card shell', () => {
    render(<InstallCommandCard installCommand="curl test" onGenerate={() => {}} />)
    expect(screen.getAllByText('Install Command')[0].closest('[class*="command-surface"]')).toBeTruthy()
  })
})
