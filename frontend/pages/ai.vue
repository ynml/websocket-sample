<template>
  <div>
    <div class="container">
      <h1 class="main-title">AIチャットアシスタント</h1>
      <div class="nav-links">
        <NuxtLink to="/" class="nav-link">リアルタイムチャットに戻る</NuxtLink>
      </div>
      <AiChat />
    </div>
  </div>
</template>

<script setup lang="ts">
// AIチャットページ
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
