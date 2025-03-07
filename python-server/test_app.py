import pytest
from app import app
import json


@pytest.fixture
def client():
    """テスト用のクライアントを作成"""
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_chat_endpoint_basic(client):
    """チャットエンドポイントの基本的なテスト"""
    # テストデータ
    data = {
        "messages": [{"role": "user", "content": "こんにちは"}],
        "model": "gpt-3.5-turbo",
        "temperature": 0.7,
        "max_tokens": 800,
    }

    # POSTリクエストを送信
    response = client.post(
        "/chat", data=json.dumps(data), content_type="application/json"
    )

    # レスポンスの検証
    assert response.status_code == 200
    assert response.content_type == "text/event-stream"

    # ストリーミングレスポンスの内容を検証
    response_data = []
    for line in response.get_data().decode().split("\n"):
        if line.startswith("data: ") and line.strip() != "data: [DONE]":
            content = json.loads(line.replace("data: ", ""))
            response_data.append(content.get("content", ""))

    response_text = "".join(response_data)
    assert "こんにちは" in response_text


def test_chat_endpoint_error(client):
    """チャットエンドポイントのエラーハンドリングテスト"""
    # 不正なデータ
    data = {
        "messages": "invalid"  # messagesは配列であるべき
    }

    # POSTリクエストを送信
    response = client.post(
        "/chat", data=json.dumps(data), content_type="application/json"
    )

    # エラーレスポンスの検証
    assert response.status_code == 500
    response_data = json.loads(response.get_data(as_text=True))
    assert "error" in response_data


def test_analyze_message_needs_human(client):
    """analyze_messageエンドポイントのテスト（人間対応が必要な場合）"""
    # テストデータ
    data = {"message": "オペレーターと話したいです"}

    # POSTリクエストを送信
    response = client.post(
        "/analyze", data=json.dumps(data), content_type="application/json"
    )

    # レスポンスの検証
    assert response.status_code == 200
    response_data = json.loads(response.get_data(as_text=True))
    assert response_data["needsHuman"] is True
    assert response_data["confidence"] > 0.5
    assert "reason" in response_data


def test_analyze_message_no_human_needed(client):
    """analyze_messageエンドポイントのテスト（人間対応が不要な場合）"""
    # テストデータ
    data = {"message": "天気を教えてください"}

    # POSTリクエストを送信
    response = client.post(
        "/analyze", data=json.dumps(data), content_type="application/json"
    )

    # レスポンスの検証
    assert response.status_code == 200
    response_data = json.loads(response.get_data(as_text=True))
    assert response_data["needsHuman"] is False
    assert response_data["confidence"] < 0.5
    assert "reason" in response_data


def test_analyze_message_error(client):
    """analyze_messageエンドポイントのエラーハンドリングテスト"""
    # 不正なデータ
    data = {
        # messageキーが欠落
    }

    # POSTリクエストを送信
    response = client.post(
        "/analyze", data=json.dumps(data), content_type="application/json"
    )

    # エラーレスポンスの検証
    assert response.status_code == 500
    response_data = json.loads(response.get_data(as_text=True))
    assert "error" in response_data
