/** @type {import('tailwindcss').Config} */
// Semantic tokens: mọi màu thương hiệu đi qua CSS variables (white-label theo tenant).
// KHÔNG hardcode hex xanh/teal trong markup — dùng bg-brand / text-accent / var(--color-*).
module.exports = {
  content: ['./public/**/*.html', './public/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        surface: 'var(--color-surface)',
        card: 'var(--color-card)',
        ink: 'var(--color-text)',
        muted: 'var(--color-muted)',
        line: 'var(--color-border)',
        danger: 'var(--color-danger)',
        okay: 'var(--color-success)',
        // Vàng #FFC94D: CHỈ dùng cho highlight chức năng (badge "Sắp có", đếm ngược…)
        hl: 'var(--color-hl)'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        // Bóng mềm nhuốm màu mực xanh của nền — không đổ bóng đen đậm
        soft: '0 1px 2px rgb(16 26 51 / 0.04), 0 8px 24px -12px rgb(16 26 51 / 0.12)',
        'soft-lg': '0 2px 6px rgb(16 26 51 / 0.05), 0 20px 48px -20px rgb(16 26 51 / 0.22)'
      },
      maxWidth: { shell: '1200px' }
    }
  },
  plugins: []
};
