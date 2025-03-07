// Socket.ioクライアントの初期化
const socket = io();

// DOM要素の取得
const loginContainer = document.getElementById('login-container');
const chatMain = document.getElementById('chat-main');
const messageFormContainer = document.getElementById('message-form-container');
const chatForm = document.getElementById('chat-form');
const chatMessages = document.getElementById('chat-messages');
const userList = document.getElementById('users');
const usernameInput = document.getElementById('username');
const joinBtn = document.getElementById('join-btn');
const msgInput = document.getElementById('msg');
const typingIndicator = document.getElementById('typing-indicator');

// 現在のユーザー情報
let currentUser = null;
let typingTimeout = null;

// ユーザー参加ボタンのイベントリスナー
joinBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (username) {
    // ユーザー名をサーバーに送信
    socket.emit('join', username);
    
    // ログイン画面を非表示にし、チャット画面を表示
    loginContainer.style.display = 'none';
    chatMain.style.display = 'grid';
    messageFormContainer.style.display = 'block';
    
    // 入力フィールドにフォーカス
    msgInput.focus();
  }
});

// ユーザー名入力フィールドでEnterキーを押した時の処理
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinBtn.click();
  }
});

// メッセージ送信フォームのイベントリスナー
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const msg = msgInput.value.trim();
  
  if (msg) {
    // メッセージをサーバーに送信
    socket.emit('sendMessage', { message: msg });
    
    // 入力フィールドをクリアしてフォーカス
    msgInput.value = '';
    msgInput.focus();
    
    // タイピング終了イベントを送信
    socket.emit('stopTyping');
  }
});

// メッセージ入力中の処理
msgInput.addEventListener('input', () => {
  // タイピング中イベントを送信
  socket.emit('typing');
  
  // タイピングタイムアウトをクリア
  clearTimeout(typingTimeout);
  
  // 一定時間入力がなければタイピング終了イベントを送信
  typingTimeout = setTimeout(() => {
    socket.emit('stopTyping');
  }, 1000);
});

// ユーザーリストの更新
function updateUserList(users) {
  userList.innerHTML = '';
  for (const user of users) {
    const li = document.createElement('li');
    li.textContent = user.username;
    if (currentUser && user.id === currentUser.id) {
      li.textContent += ' (あなた)';
    }
    userList.appendChild(li);
  }
}

// メッセージの表示
function outputMessage(messageData) {
  const div = document.createElement('div');
  div.classList.add('message');
  
  // 自分のメッセージかどうかを判定
  if (currentUser && messageData.user.id === currentUser.id) {
    div.classList.add('self');
  }
  
  // メッセージのメタ情報（ユーザー名と時間）
  const metaDiv = document.createElement('div');
  metaDiv.classList.add('meta');
  metaDiv.innerHTML = `${messageData.user.username} <span>${formatTime(messageData.timestamp)}</span>`;
  
  // メッセージの本文
  const textDiv = document.createElement('div');
  textDiv.classList.add('text');
  textDiv.textContent = messageData.message;
  
  // メッセージ要素に追加
  div.appendChild(metaDiv);
  div.appendChild(textDiv);
  
  // チャットメッセージエリアに追加
  chatMessages.appendChild(div);
  
  // 最新のメッセージが見えるようにスクロール
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// システムメッセージの表示
function outputSystemMessage(message) {
  const div = document.createElement('div');
  div.classList.add('system-message');
  div.textContent = message;
  
  // チャットメッセージエリアに追加
  chatMessages.appendChild(div);
  
  // 最新のメッセージが見えるようにスクロール
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 時間のフォーマット
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

// Socket.ioイベントハンドラ

// ユーザーリスト受信イベント
socket.on('userList', (users) => {
  updateUserList(users);
});

// ユーザー参加イベント
socket.on('userJoined', (data) => {
  // 自分自身の場合は現在のユーザー情報を保存
  if (data.user.id === socket.id) {
    currentUser = data.user;
  }
  
  // ユーザーリストを更新
  updateUserList(data.users);
  
  // システムメッセージを表示
  outputSystemMessage(data.message);
});

// ユーザー退出イベント
socket.on('userLeft', (data) => {
  // ユーザーリストを更新
  updateUserList(data.users);
  
  // システムメッセージを表示
  outputSystemMessage(data.message);
});

// 新しいメッセージ受信イベント
socket.on('newMessage', (data) => {
  outputMessage(data);
});

// ユーザータイピング中イベント
socket.on('userTyping', (data) => {
  typingIndicator.textContent = `${data.user.username}さんが入力中...`;
});

// ユーザータイピング終了イベント
socket.on('userStoppedTyping', () => {
  typingIndicator.textContent = '';
});
