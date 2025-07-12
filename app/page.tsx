'use client'

export default function HomePage() {
  return (
    <script dangerouslySetInnerHTML={{
      __html: `window.location.href = '/login';`
    }} />
  )
}
