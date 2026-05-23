'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Loader2, Eye, EyeOff, CheckCircle2, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [forgotMode, setForgotMode] = useState(false)
  const router = useRouter()

  // Load saved email on mount
  useEffect(() => {
    const saved = localStorage.getItem('gse_remember_email')
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const supabase = createClient()

      if (forgotMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })

        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }

        setSuccess('Password reset link sent! Check your email.')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (rememberMe) {
        localStorage.setItem('gse_remember_email', email)
      } else {
        localStorage.removeItem('gse_remember_email')
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 via-zinc-950 to-zinc-950" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/80 shadow-2xl shadow-black/40 backdrop-blur-sm">
          {/* Branding */}
          <div className="flex flex-col items-center px-8 pt-10 pb-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500 shadow-lg shadow-amber-500/20">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-zinc-100">
              Dealflow CRM
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {forgotMode ? 'Reset your password' : 'Sign in to your account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pt-6 pb-8">
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-400">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Password — hidden in forgot mode */}
            {!forgotMode && (
              <div className="mb-4">
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-400">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me + Forgot Password */}
            {!forgotMode && (
              <div className="mb-6 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-4 w-4 rounded border border-zinc-600 bg-zinc-800 transition-colors peer-checked:border-amber-500 peer-checked:bg-amber-500 group-hover:border-zinc-500" />
                    <svg
                      className="absolute top-0.5 left-0.5 h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors select-none">
                    Remember me
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setError(null); setSuccess(null) }}
                  className="text-sm text-amber-500/80 hover:text-amber-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {forgotMode ? 'Sending…' : 'Signing in…'}
                </>
              ) : forgotMode ? (
                <>
                  <Mail className="h-4 w-4" />
                  Send Reset Link
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Back to sign in */}
            {forgotMode && (
              <button
                type="button"
                onClick={() => { setForgotMode(false); setError(null); setSuccess(null) }}
                className="mt-4 w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ← Back to sign in
              </button>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Golden State Epoxy Flooring
        </p>
      </div>
    </div>
  )
}
