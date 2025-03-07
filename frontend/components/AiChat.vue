<template>
  <div class="ai-chat-container">
    <h2>AIアシスタント</h2>
    <div v-if="isHumanChat" class="human-chat-indicator">
      <span>オペレーターが対応中...</span>
    </div>
    <div class="ai-chat-messages" ref="aiMessagesContainer">
      <div v-for="(message, index) in allMessages" :key="index" :class="['ai-message', message.role]">
        <div class="ai-message-content">
          {{ message.content }}
        </div>
      </div>
    </div>
    <form @submit.prevent="sendMessage" class="ai-chat-form">
      <input
        type="text"
        v-model="inputValue"
        placeholder="メッセージを入力..."
        :disabled="isLoading"
      />
      <button type="submit" class="btn" :disabled="isLoading || !inputValue.trim()">送信</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useNuxtApp } from '#app';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'human';
  content: string;
}

const { $socket } = useNuxtApp();
const aiMessagesContainer = ref<HTMLElement | null>(null);
const inputValue = ref('');
const isHumanChat = ref(false);
const isLoading = ref(false);
const humanMessages = ref<Message[]>([]);
const messages = ref<Message[]>([
  {
    role: 'assistant',
    content: 'こんにちは！何かお手伝いできることはありますか？'
  }
]);

// AIメッセージと有人チャットメッセージを結合
const allMessages = computed(() => {
  if (isHumanChat.value) {
    return [...messages.value, ...humanMessages.value];
  }
  return messages.value;
});

// メッセージ表示エリアを最下部にスクロール
const scrollToBottom = () => {
  if (aiMessagesContainer.value) {
    aiMessagesContainer.value.scrollTop = aiMessagesContainer.value.scrollHeight;
  }
};

// メッセージが更新されたらスクロール
watch(allMessages, () => {
  nextTick(scrollToBottom);
}, { deep: true });

// WebSocketイベントハンドラの設定
onMounted(() => {
  // クライアントサイドでのみ実行
  if (process.client) {
    // 自動接続
    if (!$socket.connected) {
      console.log('Socket.IOに接続します...');
      $socket.connect();
    }
    
    // 接続成功イベント
    $socket.on('connect', () => {
      console.log('Socket.IOに接続しました。ID:', $socket.id);
    });
    
    // 接続エラーイベント
    $socket.on('connect_error', (error) => {
      console.error('Socket.IO接続エラー:', error);
      // エラーメッセージを表示
      messages.value.push({
        role: 'system',
        content: 'サーバーへの接続に失敗しました。しばらくしてからもう一度お試しください。'
      });
    });
  }
  
  // クライアントサイドでのみ実行
  if (process.client) {
    // AIチャットレスポンスイベント
    $socket.on('aiChatResponse', (data) => {
      console.log('AIレスポンスを受信:', data);
      // AIの応答を追加
      if (data === null) {
        console.log('レスポンスがnullのため、メッセージを追加しません');
      } else if (data?.choices?.[0]?.message) {
        messages.value.push({
          role: 'assistant',
          content: data.choices[0].message.content
        });
      } else {
        // データ形式が不正な場合
        messages.value.push({
          role: 'assistant',
          content: 'すみません、応答の処理中にエラーが発生しました。'
        });
      }
      
      // ローディング状態を解除
      isLoading.value = false;
      
      // スクロールを最下部に
      nextTick(scrollToBottom);
    });
    
    // 有人チャットへの切り替えイベント
    $socket.on('switchToHumanChat', () => {
      isHumanChat.value = true;
    });
    
    // 有人チャットからのメッセージイベント
    $socket.on('humanChatMessage', (data) => {
      humanMessages.value.push({
        role: 'human',
        content: data.message
      });
      
      // スクロールを最下部に
      nextTick(scrollToBottom);
    });
  }
  
  // 初期表示時にスクロール
  scrollToBottom();
});

// コンポーネント破棄時の処理
onUnmounted(() => {
  // クライアントサイドでのみ実行
  if (process.client) {
    // イベントリスナーを削除
    $socket.off('aiChatResponse');
    $socket.off('switchToHumanChat');
    $socket.off('humanChatMessage');
  }
});

// メッセージ送信処理
const sendMessage = () => {
  if (!inputValue.value.trim() || isLoading.value) return;
  
  const userMessage = inputValue.value;
  inputValue.value = '';
  
  if (isHumanChat.value) {
    // 有人チャットモードの場合はSocket.IOを使用
    humanMessages.value.push({
      role: 'user',
      content: userMessage
    });
    
    // クライアントサイドでのみWebSocketを使用
    if (process.client) {
      // WebSocketでメッセージを送信
      $socket.emit('humanChatMessage', {
        message: userMessage
      });
    }
  } else {
    // ユーザーメッセージを追加
    messages.value.push({
      role: 'user',
      content: userMessage
    });
    
    // ローディング状態を設定
    isLoading.value = true;
    
    // クライアントサイドでのみWebSocketを使用
    if (process.client) {
      console.log('WebSocketを使用してメッセージを送信します', {
        socketConnected: $socket.connected,
        socketId: $socket.id,
        messageCount: messages.value.length
      });
      
      // WebSocketでメッセージを送信
      $socket.emit('aiChatMessage', {
        messages: messages.value
      });
      
      // 接続されていない場合は再接続を試みる
      if (!$socket.connected) {
        console.log('Socket.IOが接続されていません。再接続を試みます...');
        $socket.connect();
        
        // 少し待ってから再送信
        setTimeout(() => {
          if ($socket.connected) {
            console.log('再接続成功。メッセージを再送信します...');
            $socket.emit('aiChatMessage', {
              messages: messages.value
            });
          } else {
            console.error('Socket.IOに再接続できませんでした。');
            // エラーメッセージを表示
            messages.value.push({
              role: 'system',
              content: 'サーバーへの接続に失敗しました。ページを再読み込みしてもう一度お試しください。'
            });
            isLoading.value = false;
          }
        }, 1000);
      }
    }
    
    // 応答はWebSocketイベントハンドラで処理されます
  }
  
  // スクロールを最下部に
  nextTick(scrollToBottom);
};
</script>

<style scoped>
.ai-chat-container {
  background: white;
  border-radius: 10px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  margin: 30px auto;
  max-width: 600px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.human-chat-indicator {
  background-color: #4caf50;
  color: white;
  text-align: center;
  padding: 5px;
  font-size: 14px;
}

.ai-chat-container h2 {
  background: var(--dark-color);
  color: white;
  margin: 0;
  padding: 15px;
  text-align: center;
}

.ai-chat-messages {
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-message {
  padding: 10px 15px;
  border-radius: 10px;
  max-width: 80%;
}

.ai-message.user {
  background-color: var(--primary-color);
  color: white;
  align-self: flex-end;
}

.ai-message.assistant {
  background-color: var(--light-color);
  color: var(--dark-color);
  align-self: flex-start;
}

.ai-message.human {
  background-color: #4caf50;
  color: white;
  align-self: flex-start;
}

.ai-chat-form {
  display: flex;
  padding: 10px;
  background-color: var(--dark-color);
}

.ai-chat-form input {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 5px 0 0 5px;
  font-size: 16px;
}

.ai-chat-form button {
  border-radius: 0 5px 5px 0;
}

.loading-dots {
  display: inline-block;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}
</style>
