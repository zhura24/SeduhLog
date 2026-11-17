/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { background: 'var(--background)', surface: 'var(--surface)', 'surface-alt': 'var(--surface-alt)', text: 'var(--text)', muted: 'var(--muted)', primary: 'var(--primary)', accent: 'var(--accent)', border: 'var(--border)' }, fontFamily: { display: ['Fraunces Variable', 'serif'], sans: ['Inter Variable', 'sans-serif'] }, boxShadow: { card: '0 8px 26px rgba(63, 42, 27, .07)' } } },
  plugins: []
};
