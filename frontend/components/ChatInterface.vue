<template>
  <div class="chat-container">
    <header class="chat-header">
      <h1>WebSocketチャット</h1>
    </header>
    
    <template v-if="!isLoggedIn">
      <LoginForm @join="handleJoin" />
    </template>
    
    <template v-else>
      <main class="chat-main">
        <div class="chat-sidebar">
          <h3>オンラインユーザー ({{ users.length }})</h3>
          <ul>
            <li v-for="user in users" :key="user.id">
              {{ user.username }} {{ user.id === currentUser?.id ? '(あなた)' : '' }}
            </li>
          </ul>
        </div>
        <div class="chat-messages" ref="messagesContainer">
          <SystemMessage v-for="(msg, index) in systemMessages" :key="`sys-${index}`" :message="msg" />
          <MessageItem 
            v-for="(msg, index) in messages" 
            :key="`msg-${index}`" 
            :message="msg" 
            :current-user-id="currentUser?.id"
          />
        </div>
      </main>
      
      <div class="chat-form-container">
        <form @submit.prevent="sendMessage">
          <input
            type="text"
            v-model="newMessage"
            placeholder="メッセージを入力してください"
            required
            autocomplete="off"
            @input="handleTyping"
          />
          <button class="btn" type="submit">送信</button>
        </form>
        <div class="typing-indicator">{{ typingIndicator }}</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useNuxtApp } from '#app';

interface User {
  id: string;
  username: string;
}

interface MessageData {
  user: User;
  message: string;
  timestamp: string | Date;
}

// Socket.ioクライアントの取得
const { $socket } = useNuxtApp();

// 状態管理
const isLoggedIn = ref(false);
const currentUser = ref<User | null>(null);
const users = ref<User[]>([]);
const messages = ref<MessageData[]>([]);
const systemMessages = ref<string[]>([]);
const newMessage = ref('');
const typingIndicator = ref('');
const typingTimeout = ref<NodeJS.Timeout | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);

// ユーザー参加処理
const handleJoin = (username: string) => {
  $socket.connect();
  $socket.emit('join', username);
  isLoggedIn.value = true;
};

// メッセージ送信処理
const sendMessage = () => {
  if (newMessage.value.trim()) {
    $socket.emit('sendMessage', { message: newMessage.value });
    newMessage.value = '';
    
    // タイピング終了イベントを送信
    $socket.emit('stopTyping');
  }
};

// タイピング中の処理
const handleTyping = () => {
  // タイピング中イベントを送信
  $socket.emit('typing');
  
  // タイピングタイムアウトをクリア
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value);
  }
  
  // 一定時間入力がなければタイピング終了イベントを送信
  typingTimeout.value = setTimeout(() => {
    $socket.emit('stopTyping');
  }, 1000);
};

// メッセージ表示エリアを最下部にスクロール
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Socket.ioイベントハンドラの設定
onMounted(() => {
  // ユーザーリスト受信イベント
  $socket.on('userList', (userList: User[]) => {
    users.value = userList;
  });
  
  // ユーザー参加イベント
  $socket.on('userJoined', (data: { user: User; users: User[]; message: string }) => {
    // 自分自身の場合は現在のユーザー情報を保存
    if (data.user.id === $socket.id) {
      currentUser.value = data.user;
    }
    
    // ユーザーリストを更新
    users.value = data.users;
    
    // システムメッセージを表示
    systemMessages.value.push(data.message);
    
    // 最下部にスクロール
    nextTick(scrollToBottom);
  });
  
  // ユーザー退出イベント
  $socket.on('userLeft', (data: { user: User; users: User[]; message: string }) => {
    // ユーザーリストを更新
    users.value = data.users;
    
    // システムメッセージを表示
    systemMessages.value.push(data.message);
    
    // 最下部にスクロール
    nextTick(scrollToBottom);
  });
  
  // 新しいメッセージ受信イベント
  $socket.on('newMessage', (data: MessageData) => {
    messages.value.push(data);
    
    // 最下部にスクロール
    nextTick(scrollToBottom);
  });
  
  // ユーザータイピング中イベント
  $socket.on('userTyping', (data: { user: User }) => {
    typingIndicator.value = `${data.user.username}さんが入力中...`;
  });
  
  // ユーザータイピング終了イベント
  $socket.on('userStoppedTyping', () => {
    typingIndicator.value = '';
  });
});

// コンポーネント破棄時の処理
onUnmounted(() => {
  // Socket.ioの切断
  $socket.disconnect();
  
  // タイピングタイムアウトのクリア
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value);
  }
});
</script>
