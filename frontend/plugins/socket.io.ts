import { io } from 'socket.io-client';
import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const socketUrl = config.public.socketUrl as string;
  
  console.log('Socket.IO設定:', socketUrl);
  
  // localStorageはクライアントサイドでのみ利用可能
  const getSessionId = () => {
    if (process.client && window.localStorage) {
      return localStorage.getItem('sessionID') || '';
    }
    return '';
  };

  const socket = io(socketUrl, {
    autoConnect: true, // 自動接続を有効に変更
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    // sticky-sessionのための設定
    transports: ['websocket', 'polling'],
    // 同じワーカーに接続するために必要
    forceNew: false,
    // 再接続時に同じセッションIDを使用
    auth: {
      sessionID: getSessionId()
    }
  });

  // 接続イベントのデバッグ
  socket.on('connect', () => {
    console.log('Socket.IO接続成功:', socket.id);
    
    // セッションIDをローカルストレージに保存（クライアントサイドのみ）
    if (socket.id && process.client && window.localStorage) {
      localStorage.setItem('sessionID', socket.id);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO接続エラー:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket.IO切断:', reason);
  });

  return {
    provide: {
      socket
    }
  };
});
