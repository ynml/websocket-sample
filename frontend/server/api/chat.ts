import { defineEventHandler, readBody } from 'h3';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// モックAIレスポンス生成関数
const generateMockResponse = async (messages: ChatMessage[]) => {
  // 最後のユーザーメッセージを取得
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  
  if (!lastUserMessage) {
    return 'こんにちは！何かお手伝いできることはありますか？';
  }
  
  // 簡単なモックレスポンスを生成
  const userContent = lastUserMessage.content.toLowerCase();
  
  if (userContent.includes('こんにちは') || userContent.includes('hello')) {
    return 'こんにちは！お元気ですか？';
  }
  
  if (userContent.includes('天気')) {
    return '今日の天気は晴れです。気温は20度の予想です。';
  }
  
  if (userContent.includes('名前')) {
    return '私はAIアシスタントです。お手伝いできることがあれば何でもお聞きください。';
  }
  
  // デフォルトレスポンス
  return `「${lastUserMessage.content}」についてのご質問ありがとうございます。実際のAPIと連携すると、ここに適切な回答が表示されます。`;
};

export default defineEventHandler(async (event) => {
  // リクエストボディを取得
  const body = await readBody(event);
  const { messages } = body;
  
  try {
    // 実際のAI APIを使用する場合は、ここでAPIリクエストを行う
    // 今回はモックレスポンスを生成
    const response = await generateMockResponse(messages);
    
    // レスポンスを返す
    return {
      id: `mock-${Date.now()}`,
      model: 'mock-model',
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
    console.error('AIレスポンスの生成に失敗しました:', error);
    
    // エラーレスポンスを返す
    event.node.res.statusCode = 500;
    return {
      error: 'AIレスポンスの生成に失敗しました'
    };
  }
});
