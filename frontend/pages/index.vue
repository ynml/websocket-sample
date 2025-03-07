<template>
  <div>
    <div class="container">
      <h1 class="main-title">WebSocketチャットアプリケーション</h1>
      <div class="nav-links">
        <NuxtLink to="/ai" class="nav-link">AIチャットを試す</NuxtLink>
      </div>
      <ChatInterface />
    </div>
  </div>
</template>

<script setup lang="ts">
// チャットインターフェースをトップページに直接表示
</script>

<style scoped>
.main-title {
  text-align: center;
  margin: 20px 0;
  color: var(--dark-color);
}

.nav-links {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.nav-link {
  padding: 8px 15px;
  background-color: var(--primary-color);
  color: white;
  border-radius: 5px;
  text-decoration: none;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background-color: #2980b9;
}
</style>
