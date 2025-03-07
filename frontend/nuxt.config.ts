// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  app: {
    head: {
      title: 'WebSocketチャット',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { hid: 'description', name: 'description', content: 'WebSocketを使用したリアルタイムチャットアプリケーション' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],
  
  modules: [],

  runtimeConfig: {
    public: {
      socketUrl: process.env.SOCKET_URL || 'http://localhost:3001',
    }
  },

  nitro: {
    preset: 'node-server'
  },

  devServer: {
    port: 3002
  },

  compatibilityDate: '2025-03-07'
})
