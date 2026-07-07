import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallCommandCard, InstallCommandDisplay } from './install-command-card'

describe('InstallCommandDisplay', () => {
  beforeEach(() => {
    cleanup()
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    })
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

  it('copies command text and shows copied feedback', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<InstallCommandDisplay installCommand="curl test" onGenerate={() => {}} />)

    await user.click(screen.getByRole('button', { name: /^copy$/i }))

    expect(writeText).toHaveBeenCalledWith('curl test')
    await waitFor(() => expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument())
  })
})

describe('InstallCommandCard', () => {
  beforeEach(() => {
    cleanup()
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    })
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
