import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { InstallCommandCard, InstallCommandDisplay } from './install-command-card'

describe('InstallCommandDisplay', () => {
  beforeEach(() => {
    cleanup()
  })

  it('shows placeholder and generate button when no command is set', () => {
    render(<InstallCommandDisplay installCommand="" onGenerate={vi.fn()} />)
    expect(screen.getByText(/not stored for security/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate install command/i })).toBeInTheDocument()
  })

  it('renders command and copy button after generation', () => {
    render(<InstallCommandDisplay installCommand="curl --token abc" onGenerate={vi.fn()} />)
    expect(screen.getByText('curl --token abc')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument()
  })

  it('calls onGenerate when rotate button is clicked', async () => {
    const onGenerate = vi.fn()
    render(<InstallCommandDisplay installCommand="" onGenerate={onGenerate} />)
    fireEvent.click(screen.getByRole('button', { name: /generate install command/i }))
    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1))
  })

  it('disables buttons while loading', () => {
    render(<InstallCommandDisplay installCommand="" loading onGenerate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
  })
})

describe('InstallCommandCard', () => {
  beforeEach(() => {
    cleanup()
  })

  it('wraps display in a card with title', () => {
    render(<InstallCommandCard installCommand="cmd" onGenerate={vi.fn()} />)
    expect(screen.getByText('Install Command')).toBeInTheDocument()
    expect(screen.getByText('cmd')).toBeInTheDocument()
  })
})
