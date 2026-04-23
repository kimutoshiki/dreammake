import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Hiragino Kaku Gothic ProN',
          'Hiragino Sans',
          'Noto Sans JP',
          'system-ui',
          'sans-serif',
        ],
        rounded: [
          'UD デジタル 教科書体 NK-R',
          'UD Digi Kyokasho NK-R',
          'Hiragino Maru Gothic ProN',
          'Noto Sans JP',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        // 学年プロファイル別カラーの土台(あたたかく手作り感のある色)
        kid: {
          bg: '#FFF9F2',
          ink: '#2E2A27',
          primary: '#FF8C42',
          accent: '#3D405B',
          soft: '#F8EDD3',
          leaf: '#7BAE68',
          sky: '#8FB9E3',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      spacing: {
        // 学童タッチ領域の目安(lower=56, middle=48, upper=44)
        'tap-lower': '56px',
        'tap-middle': '48px',
        'tap-upper': '44px',
      },
    },
  },
  plugins: [],
};

export default config;
