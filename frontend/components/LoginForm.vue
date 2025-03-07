<template>
  <div class="login-container">
    <div class="login-form">
      <h2>ユーザー名を入力してください</h2>
      <div class="form-control">
        <input
          type="text"
          v-model="username"
          placeholder="ユーザー名"
          required
          @keyup.enter="joinChat"
        />
      </div>
      <button @click="joinChat" class="btn">チャットに参加</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['join']);
const username = ref('');

const joinChat = () => {
  if (username.value.trim()) {
    emit('join', username.value.trim());
  }
};
</script>
