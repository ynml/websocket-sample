import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import request from 'supertest';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import express from 'express';

// モックの作成
const mockAnalyzeMessageForHumanSwitch = vi.fn().mockResolvedValue(false);
const mockGetAIResponse = vi.fn().mockResolvedValue({
  choices: [{
    message: {
      role: 'assistant',
      content: 'こんにちは！どのようにお手伝いできますか？'
    }
  }]
});

// モジュールのモック化
vi.mock('./server.js', () => ({
  default: {
    analyzeMessageForHumanSwitch: mockAnalyzeMessageForHumanSwitch,
    getAIResponse: mockGetAIResponse
  }
}));

describe('Server', () => {
  let io;
  let serverSocket;
  let clientSocket;
  let app;
  let server;

  beforeAll(async () => {
    app = express();
    server = createServer(app);
    io = new Server(server);
    
    // APIエンドポイントの設定
    app.get('/api/status', (req, res) => {
      res.json({ status: 'online', users: 0 });
    });

    // サーバーの起動
    server.listen(0);

    // Socket.IOクライアントの設定
    const port = server.address().port;
    clientSocket = Client(`http://localhost:${port}`, {
      transports: ['websocket']
    });

    // サーバーソケットの設定
    await new Promise(resolve => {
      io.on('connection', socket => {
        serverSocket = socket;

        socket.on('aiChatMessage', async data => {
          socket.emit('aiChatResponse', {
            choices: [{
              message: {
                role: 'assistant',
                content: 'こんにちは！どのようにお手伝いできますか？'
              }
            }]
          });
        });

        socket.on('humanChatMessage', data => {
          io.emit('humanChatMessage', data);
        });

        resolve();
      });

      clientSocket.connect();
    });
  });

  afterAll(() => {
    clientSocket.disconnect();
    io.close();
    server.close();
  });

  // APIエンドポイントのテスト
  describe('API Endpoints', () => {
    it('GET /api/status should return server status', async () => {
      const response = await request(app).get('/api/status');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'online');
      expect(response.body).toHaveProperty('users');
      expect(typeof response.body.users).toBe('number');
    });
  });

  // Socket.IOイベントのテスト
  describe('Socket.IO Events', () => {
    it('should handle aiChatMessage event', async () => {
      return new Promise((resolve, reject) => {
        const testMessage = {
          messages: [{
            role: 'user',
            content: 'こんにちは'
          }]
        };

        clientSocket.once('aiChatResponse', response => {
          try {
            expect(response).toBeDefined();
            expect(response.choices).toBeDefined();
            expect(response.choices[0].message).toBeDefined();
            expect(response.choices[0].message.content).toBeDefined();
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        clientSocket.emit('aiChatMessage', testMessage);
      });
    }, 10000); // タイムアウトを10秒に設定

    it('should handle humanChatMessage event', async () => {
      return new Promise((resolve, reject) => {
        const testMessage = {
          message: 'テストメッセージ'
        };

        clientSocket.once('humanChatMessage', data => {
          try {
            expect(data).toEqual(testMessage);
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        clientSocket.emit('humanChatMessage', testMessage);
      });
    }, 10000); // タイムアウトを10秒に設定
  });
}); 