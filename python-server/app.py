from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import os
import json
import time
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()

# Azure OpenAI設定（実際の実装では必要）
# import openai
# openai.api_type = "azure"
# openai.api_base = os.getenv("AZURE_OPENAI_ENDPOINT")
# openai.api_version = os.getenv("AZURE_OPENAI_API_VERSION")
# openai.api_key = os.getenv("AZURE_OPENAI_API_KEY")

app = Flask(__name__)
CORS(app)  # CORSを有効化


@app.route("/chat", methods=["POST"])
def chat():
    try:
        # リクエストデータを取得
        data = request.json
        messages = data.get("messages", [])
        model = data.get(
            "model", os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-3.5-turbo")
        )
        temperature = data.get("temperature", 0.7)
        max_tokens = data.get("max_tokens", 800)

        # ストリーミングレスポンスを生成する関数
        def generate():
            try:
                # メッセージの形式を整える
                formatted_messages = [
                    {"role": msg["role"], "content": msg["content"]} for msg in messages
                ]

                # 最後のユーザーメッセージを取得
                last_user_message = None
                for msg in reversed(formatted_messages):
                    if msg["role"] == "user":
                        last_user_message = msg
                        break

                if not last_user_message:
                    response_text = "こんにちは！何かお手伝いできることはありますか？"
                else:
                    # 簡単なモックレスポンスを生成（実際の実装ではAzure OpenAIを使用）
                    user_content = last_user_message["content"].lower()

                    if "こんにちは" in user_content or "hello" in user_content:
                        response_text = "こんにちは！お元気ですか？"
                    elif "天気" in user_content:
                        response_text = "今日の天気は晴れです。気温は20度の予想です。"
                    elif "名前" in user_content:
                        response_text = "私はAIアシスタントです。お手伝いできることがあれば何でもお聞きください。"
                    else:
                        response_text = f"「{last_user_message['content']}」についてのご質問ありがとうございます。実際のAPIと連携すると、ここに適切な回答が表示されます。"

                # 文字ごとにストリーミング
                for char in response_text:
                    # SSE形式でデータを送信
                    yield f"data: {json.dumps({'content': char})}\n\n"
                    time.sleep(0.02)  # 20ms遅延

                # ストリーミング終了を示す
                yield "data: [DONE]\n\n"

                # 実際のAzure OpenAI実装の例（コメントアウト）
                """
                # Azure OpenAIのストリーミングレスポンス
                response = openai.ChatCompletion.create(
                    engine=model,
                    messages=formatted_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True
                )
                
                # ストリーミングレスポンスを処理
                for chunk in response:
                    if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                        content = chunk.choices[0].delta.get("content", "")
                        if content:
                            # SSE形式でデータを送信
                            yield f"data: {json.dumps({'content': content})}\n\n"
                
                # ストリーミング終了を示す
                yield "data: [DONE]\n\n"
                """

            except Exception as e:
                # エラーが発生した場合
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        # ストリーミングレスポンスを返す
        return Response(generate(), content_type="text/event-stream")

    except Exception as e:
        # エラーハンドリング
        return jsonify({"error": str(e)}), 500


@app.route("/analyze", methods=["POST"])
def analyze_message():
    try:
        # リクエストデータを取得
        data = request.json
        message = data.get("message", "")

        # メッセージを分析（実際の実装ではAzure OpenAIなどを使用）
        # ここでは簡易的な実装
        keywords = ["オペレーター", "人間", "担当者", "話したい", "オペレータ", "有人"]
        needs_human = any(keyword in message.lower() for keyword in keywords)

        # 分析結果を返す
        return jsonify(
            {
                "needsHuman": needs_human,
                "confidence": 0.9 if needs_human else 0.1,
                "reason": "キーワード検出" if needs_human else "特に問題なし",
            }
        )

    except Exception as e:
        # エラーハンドリング
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
