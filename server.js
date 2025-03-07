const express = require('express');
const http = require('node:http');
const socketIo = require('socket.io');
const cluster = require('node:cluster');
const os = require('node:os');
const sticky = require('sticky-session');
const path = require('node:path');
// Node.js v18以降ではfetchがネイティブサポートされていますが、古いバージョンでは必要
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// 共有状態を保持するオブジェクト（マスタープロセスのみで使用）
const sharedState = {
  connectedUsers: [],
  humanChatUsers: []
};

// Expressアプリケーションの初期化
const app = express();
const server = http.createServer(app);

// Socket.IOの設定
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3002"], // Nuxtのポート
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    transports: ['websocket', 'polling']
  }
});

// ローカルの状態（各ワーカープロセスで保持）
const localState = {
  connectedUsers: [],
  humanChatUsers: []
};

// sticky-sessionを使用してクラスタリングを設定
const cpuCount = os.cpus().length;
console.log(`CPUコア数: ${cpuCount}`);

// サーバーのポート設定
const port = process.env.PORT || 3001;

// sticky-sessionを使用してHTTPサーバーをクラスタリング
sticky.listen(server, port, {
  workers: cpuCount
});

if (cluster.isMaster) {
  // マスタープロセスの場合
  console.log(`マスタープロセスが起動しました。PID: ${process.pid}`);
  
  // ワーカープロセスからのメッセージを処理
  cluster.on('message', (worker, message) => {
    if (message.type === 'UPDATE_USERS') {
      // ユーザーリストを更新
      sharedState.connectedUsers = message.data.connectedUsers;
      
      // 更新された状態を全ワーカーに送信
      for (const id in cluster.workers) {
        cluster.workers[id].send({
          type: 'SYNC_STATE',
          data: {
            connectedUsers: sharedState.connectedUsers,
            humanChatUsers: sharedState.humanChatUsers
          }
        });
      }
    } else if (message.type === 'UPDATE_HUMAN_CHAT_USERS') {
      // 有人チャットユーザーリストを更新
      sharedState.humanChatUsers = message.data.humanChatUsers;
      
      // 更新された状態を全ワーカーに送信
      for (const id in cluster.workers) {
        cluster.workers[id].send({
          type: 'SYNC_STATE',
          data: {
            connectedUsers: sharedState.connectedUsers,
            humanChatUsers: sharedState.humanChatUsers
          }
        });
      }
    } else if (message.type === 'BROADCAST') {
      // 全ワーカーにブロードキャスト
      for (const id in cluster.workers) {
        cluster.workers[id].send({
          type: 'EMIT',
          data: message.data
        });
      }
    }
  });
  
  // ワーカープロセスが終了した場合に新しいワーカーを起動
  cluster.on('exit', (worker, code, signal) => {
    console.log(`ワーカー ${worker.process.pid} が終了しました。コード: ${code}, シグナル: ${signal}`);
    console.log('新しいワーカーを起動します...');
    cluster.fork();
  });
} else {
  // ワーカープロセスの場合
  console.log(`ワーカープロセスが起動しました。PID: ${process.pid}`);
  
  // マスタープロセスからのメッセージを処理
  process.on('message', (message) => {
    if (message.type === 'SYNC_STATE') {
      // 状態を同期
      localState.connectedUsers = message.data.connectedUsers;
      localState.humanChatUsers = message.data.humanChatUsers;
    } else if (message.type === 'EMIT') {
      // Socket.IOイベントを発行
      if (io) {
        const { event, data, room } = message.data;
        if (room) {
          io.to(room).emit(event, data);
        } else {
          io.emit(event, data);
        }
      }
    }
  });

  // 静的ファイルの提供
  app.use(express.static(path.join(__dirname, 'public')));

  // CORSミドルウェアの設定
  app.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3002'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // プリフライトリクエストの処理
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });

  // APIエンドポイント
  app.get('/api/status', (req, res) => {
    res.json({ status: 'online', users: localState.connectedUsers.length });
  });

  // Pythonサーバーのエンドポイント
  const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';

  // マスタープロセスに状態更新を通知する関数
  const updateConnectedUsers = () => {
    if (process.send) {
      process.send({
        type: 'UPDATE_USERS',
        data: {
          connectedUsers: localState.connectedUsers
        }
      });
    }
  };

  // マスタープロセスに有人チャットユーザー更新を通知する関数
  const updateHumanChatUsers = () => {
    if (process.send) {
      process.send({
        type: 'UPDATE_HUMAN_CHAT_USERS',
        data: {
          humanChatUsers: localState.humanChatUsers
        }
      });
    }
  };

  // 全ワーカーにイベントをブロードキャストする関数
  const broadcastToAllWorkers = (event, data, room = null) => {
    if (process.send) {
      process.send({
        type: 'BROADCAST',
        data: {
          event,
          data,
          room
        }
      });
    }
  };

  // Socket.io接続イベント
  io.on('connection', (socket) => {
    console.log(`新しいユーザーが接続しました。ID: ${socket.id}, ワーカーPID: ${process.pid}`);
    
    // AIチャットイベント
    socket.on('aiChatMessage', async (data) => {
      console.log(`AIチャットメッセージを受信しました: ${JSON.stringify(data)}, ワーカーPID: ${process.pid}`);
      
      try {
        // メッセージを分析して有人チャットへの切り替えが必要か判断
        const shouldSwitchToHuman = await analyzeMessageForHumanSwitch(data.messages);
        
        if (shouldSwitchToHuman) {
          // 有人チャットへの切り替えが必要な場合
          localState.humanChatUsers.push(socket.id);
          updateHumanChatUsers(); // マスタープロセスに通知
          
          socket.emit('switchToHumanChat');
          
          // オペレーターに通知（実際の実装ではオペレーター用のUIが必要）
          broadcastToAllWorkers('operatorNotification', {
            userId: socket.id,
            messages: data.messages
          });
        } else {
          // Node.jsのAPIを使用してAIレスポンスを取得
          try {
            const response = await getAIResponse(data.messages);
            
      // AIからのレスポンスをクライアントに送信
      console.log('AIレスポンスを送信します:', response);
      socket.emit('aiChatResponse', response);
          } catch (error) {
            console.error(`AIレスポンスの取得中にエラーが発生しました: ${error}, ワーカーPID: ${process.pid}`);
            
            // エラーメッセージをクライアントに送信
            socket.emit('aiChatResponse', {
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: 'すみません、応答の生成中にエラーが発生しました。しばらくしてからもう一度お試しください。'
                  }
                }
              ]
            });
          }
        }
      } catch (error) {
        console.error(`メッセージ分析中にエラーが発生しました: ${error}, ワーカーPID: ${process.pid}`);
      }
    });
    
    // 有人チャットメッセージイベント
    socket.on('humanChatMessage', (data) => {
      console.log(`有人チャットメッセージを受信しました: ${JSON.stringify(data)}, ワーカーPID: ${process.pid}`);
      
      // ユーザーが有人チャット対応中かチェック
      if (localState.humanChatUsers.includes(socket.id)) {
        // オペレーターにメッセージを転送（実際の実装ではオペレーター用のUIが必要）
        broadcastToAllWorkers('operatorMessage', {
          userId: socket.id,
          message: data.message
        });
      }
    });
    
    // オペレーターからのメッセージイベント（実際の実装では認証が必要）
    socket.on('operatorMessage', (data) => {
      console.log(`オペレーターメッセージを受信しました: ${JSON.stringify(data)}, ワーカーPID: ${process.pid}`);
      
      // 特定のユーザーにメッセージを送信
      if (data.userId && io.sockets.sockets.get(data.userId)) {
        io.to(data.userId).emit('humanChatMessage', {
          message: data.message
        });
      }
    });
    
    // ユーザー参加イベント
    socket.on('join', (username) => {
      console.log(`ユーザーが参加しました: ${username}, ID: ${socket.id}, ワーカーPID: ${process.pid}`);
      
      // ユーザー情報を保存
      const user = {
        id: socket.id,
        username: username
      };
      localState.connectedUsers.push(user);
      updateConnectedUsers(); // マスタープロセスに通知
      
      // 参加メッセージをブロードキャスト
      broadcastToAllWorkers('userJoined', {
        user: user,
        users: localState.connectedUsers,
        message: `${username}さんがチャットに参加しました。`
      });
      
      // 現在のユーザーリストを送信
      socket.emit('userList', localState.connectedUsers);
    });
    
    // メッセージ受信イベント
    socket.on('sendMessage', (data) => {
      const user = localState.connectedUsers.find(user => user.id === socket.id);
      if (user) {
        console.log(`メッセージを受信しました: ${JSON.stringify(data)}, ユーザー: ${user.username}, ワーカーPID: ${process.pid}`);
        
        // メッセージを全員に送信
        broadcastToAllWorkers('newMessage', {
          user: user,
          message: data.message,
          timestamp: new Date()
        });
      }
    });
    
    // 切断イベント
    socket.on('disconnect', () => {
      const index = localState.connectedUsers.findIndex(user => user.id === socket.id);
      if (index !== -1) {
        const user = localState.connectedUsers[index];
        // ユーザーリストから削除
        localState.connectedUsers.splice(index, 1);
        updateConnectedUsers(); // マスタープロセスに通知
        
        // 有人チャットユーザーリストからも削除
        const humanChatIndex = localState.humanChatUsers.indexOf(socket.id);
        if (humanChatIndex !== -1) {
          localState.humanChatUsers.splice(humanChatIndex, 1);
          updateHumanChatUsers(); // マスタープロセスに通知
        }
        
        // 切断メッセージをブロードキャスト
        broadcastToAllWorkers('userLeft', {
          user: user,
          users: localState.connectedUsers,
          message: `${user.username}さんがチャットから退出しました。`
        });
        
        console.log(`ユーザーが切断しました。ID: ${socket.id}, ユーザー名: ${user.username}, ワーカーPID: ${process.pid}`);
      } else {
        console.log(`未登録ユーザーが切断しました。ID: ${socket.id}, ワーカーPID: ${process.pid}`);
      }
    });
    
    // タイピング中イベント
    socket.on('typing', () => {
      const user = localState.connectedUsers.find(user => user.id === socket.id);
      if (user) {
        // タイピング中のユーザー情報を他のユーザーに送信
        socket.broadcast.emit('userTyping', {
          user: user
        });
      }
    });
    
    // タイピング終了イベント
    socket.on('stopTyping', () => {
      const user = localState.connectedUsers.find(user => user.id === socket.id);
      if (user) {
        // タイピング終了を他のユーザーに送信
        socket.broadcast.emit('userStoppedTyping', {
          user: user
        });
      }
    });
  });

  // サーバーはsticky-sessionによって起動されるため、ここでは何もしない
  console.log(`ワーカー ${process.pid} がリクエストを処理する準備ができました`);

  // AIレスポンスを生成する関数
  async function getAIResponse(messages) {
    try {
      // 最後のユーザーメッセージを取得
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      
      if (!lastUserMessage) {
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'こんにちは！何かお手伝いできることはありますか？'
              }
            }
          ]
        };
      }
      
      // 最後のメッセージが既にAIからの応答の場合は、重複レスポンスを防ぐ
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        console.log('最後のメッセージがAIからの応答のため、レスポンスをスキップします');
        return null;
      }
      
      // Node.jsのAPIを使用してレスポンスを生成
      // 実際のプロジェクトでは、ここで外部AIサービスのAPIを呼び出す
      
      // 簡易的なレスポンス生成ロジック
      const userContent = lastUserMessage.content.toLowerCase();
      let response = '';
      
      if (userContent.includes('こんにちは') || userContent.includes('hello')) {
        response = 'こんにちは！お元気ですか？';
      } else if (userContent.includes('天気')) {
        response = '今日の天気は晴れです。気温は20度の予想です。';
      } else if (userContent.includes('名前')) {
        response = '私はAIアシスタントです。お手伝いできることがあれば何でもお聞きください。';
      } else {
        // より高度なレスポンス生成（実際のプロジェクトではAI APIを使用）
        response = await generateAdvancedResponse(lastUserMessage.content);
      }
      
      return {
        id: `response-${Date.now()}`,
        model: 'node-api-model',
        object: 'chat.completion',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: response
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
    } catch (error) {
      console.error('AIレスポンスの生成中にエラーが発生しました:', error);
      throw error;
    }
  }
  
  // 高度なレスポンスを生成する関数
  async function generateAdvancedResponse(userMessage) {
    // 実際のプロジェクトでは、ここで外部AIサービスのAPIを呼び出す
    // 今回はNode.jsの組み込み機能を使用して簡易的なレスポンスを生成
    
    // 文字列の類似性を計算する簡易関数
    const calculateSimilarity = (str1, str2) => {
      const set1 = new Set(str1.toLowerCase().split(' '));
      const set2 = new Set(str2.toLowerCase().split(' '));
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      return intersection.size / Math.sqrt(set1.size * set2.size);
    };
    
    // 簡易的な質問応答データベース
    const qaPairs = [
      {
        q: '料金プランについて教えてください',
        a: '当社の料金プランは、ベーシック（月額1,000円）、スタンダード（月額2,000円）、プレミアム（月額3,000円）の3種類をご用意しています。詳細については、料金ページをご覧ください。'
      },
      {
        q: 'サービスの特徴は何ですか',
        a: '当社のサービスは、高速通信、広いカバレッジ、24時間サポートが特徴です。また、独自の技術により、安定した通信環境を提供しています。'
      },
      {
        q: '解約方法を教えてください',
        a: '解約をご希望の場合は、マイページから手続きいただくか、カスタマーサポート（0120-XXX-XXX）までお電話ください。なお、解約には所定の手数料がかかる場合があります。'
      },
      {
        q: 'キャンペーンはありますか',
        a: '現在、新規お申し込みの方を対象に、初月無料キャンペーンを実施しています。また、家族紹介キャンペーンも実施中です。詳細はキャンペーンページをご確認ください。'
      }
    ];
    
    // 最も類似度の高い質問を検索
    let bestMatch = null;
    let highestSimilarity = 0;
    
    for (const pair of qaPairs) {
      const similarity = calculateSimilarity(userMessage, pair.q);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = pair;
      }
    }
    
    // 類似度が一定以上なら回答を返す
    if (bestMatch && highestSimilarity > 0.2) {
      return bestMatch.a;
    }
    
    // 該当する回答がない場合のデフォルトレスポンス
    return `「${userMessage}」についてのご質問ありがとうございます。詳細な情報については、カスタマーサポートにお問い合わせいただくか、FAQページをご確認ください。`;
  }
  
  // メッセージを分析して有人チャットへの切り替えが必要か判断する関数
  async function analyzeMessageForHumanSwitch(messages) {
    try {
      // 最後のユーザーメッセージを取得
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      
      if (!lastUserMessage) {
        return false;
      }
      
      // 簡易的な判断ロジック（実際にはPythonサーバーに分析を依頼）
      const userContent = lastUserMessage.content.toLowerCase();
      
      // キーワードベースの簡易判定（実際の実装ではより高度な分析が必要）
      if (
        userContent.includes('オペレーター') || 
        userContent.includes('人間') || 
        userContent.includes('担当者') ||
        userContent.includes('話したい')
      ) {
        return true;
      }
      
      // Pythonサーバーに分析を依頼（オプション）
      try {
        const response = await fetch(`${PYTHON_API_URL}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: lastUserMessage.content }),
        });
        
        if (response.ok) {
          const result = await response.json();
          return result.needsHuman === true;
        }
      } catch (error) {
        console.error('Python APIへのリクエスト中にエラーが発生しました:', error);
      }
      
      return false;
    } catch (error) {
      console.error('メッセージ分析中にエラーが発生しました:', error);
      return false;
    }
  }
}
