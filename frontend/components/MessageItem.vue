<template>
  <div :class="['message', isSelf ? 'self' : '']">
    <div class="meta">
      {{ message.user.username }} <span>{{ formattedTime }}</span>
    </div>
    <div class="text">
      {{ message.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface User {
  id: string;
  username: string;
}

interface MessageData {
  user: User;
  message: string;
  timestamp: string | Date;
}

const props = defineProps<{
  message: MessageData;
  currentUserId?: string;
}>();

const isSelf = computed(() => {
  return props.currentUserId && props.message.user.id === props.currentUserId;
});

const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
});
</script>
