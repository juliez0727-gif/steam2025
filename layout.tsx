import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SteamInsight 2025: 国产游戏舆情分析',
  description: 'A specialized tool for analyzing Steam reviews of Chinese games released in 2025 and beyond.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-[#0f1216] text-[#c6d4df]`}>{children}</body>
    </html>
  )
}
