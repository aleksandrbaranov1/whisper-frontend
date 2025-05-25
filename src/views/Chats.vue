<template>
  <div class="chat-page">
    <!-- Боковая панель -->
    <aside class="sidebar">
      <button class="profile-button" @click="$router.push('/me')">👤</button>

      <div class="chat-list">
        <div
          class="chat-item"
          v-for="chat in chats"
          :key="chat.id"
          @click="selectChat(chat)"
          :class="{ selected: selectedChat && selectedChat.id === chat.id }"
        >
          {{ getOtherParticipantName(chat.participants) }}
        </div>
      </div>
    </aside>

    <!-- Зона сообщений -->
    <main class="chat-window">
      <div v-if="selectedChat && messages.length" class="messages">
        <div
          v-for="message in messages"
          :key="message.id"
          :class="['message', { own: message.senderId === currentUserId }]"
        >
          {{ message.content }}
          <div class="timestamp">
            {{ formatTime(message.timestamp) }}
          </div>
        </div>
      </div>
      <div v-else class="placeholder">
        <p>Выберите чат, чтобы просмотреть сообщения</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const chats = ref([]);
const messages = ref([]);
const selectedChat = ref(null);
const currentUserId = ref(null);

const fetchProfile = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("http://localhost:8080/api/profile/me", {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) throw new Error("Ошибка получения профиля");
  const profile = await res.json();
  currentUserId.value = profile.id;
};

const fetchChats = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("http://localhost:8080/api/chats/my", {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) throw new Error("Ошибка загрузки чатов");
  chats.value = await res.json();
};

const selectChat = async (chat) => {
  selectedChat.value = chat;
  await fetchMessages(chat.id);
};

const fetchMessages = async (chatId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`http://localhost:8080/messages/chat/${chatId}`, {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) {
    messages.value = [];
    return;
  }
  messages.value = await res.json();
};

const getOtherParticipantName = (participants) => {
  if (!currentUserId.value) return "";
  const other = participants.find((p) => p.id !== currentUserId.value);
  return other ? other.name : "Неизвестный";
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

onMounted(async () => {
  try {
    await fetchProfile();
    await fetchChats();
  } catch (e) {
    console.error(e);
  }
});
</script>

<style scoped>
.chat-page {
  display: flex;
  height: 100vh;
  background: #1e1e2f;
  color: white;
  font-family: sans-serif;
}

/* Сайдбар */
.sidebar {
  width: 260px;
  background-color: #2d2d3a;
  display: flex;
  flex-direction: column;
  padding-top: 10px;
  border-right: 1px solid #444;
}

/* Кнопка профиля */
.profile-button {
  width: 48px;
  height: 48px;
  margin: 0 auto 20px;
  border-radius: 50%;
  border: none;
  background-color: #444;
  color: white;
  font-size: 22px;
  cursor: pointer;
}

.profile-button:hover {
  background-color: #666;
}

/* Чат-лист */
.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px;
}

.chat-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background-color: #3a3a4a;
  cursor: pointer;
}

.chat-item.selected {
  background-color: #5a5a7a;
}

.chat-item:hover {
  background-color: #505060;
}

/* Основная зона */
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow-y: auto;
}

.placeholder {
  margin: auto;
  text-align: center;
  color: #888;
  font-size: 18px;
}

/* Сообщения */
.messages {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message {
  max-width: 60%;
  padding: 10px 15px;
  border-radius: 16px;
  background-color: #444;
  align-self: flex-start;
  word-break: break-word;
  position: relative;
}

.message.own {
  background-color: #0088cc;
  align-self: flex-end;
}

/* Время сообщения */
.timestamp {
  font-size: 12px;
  color: #bbb;
  margin-top: 4px;
  user-select: none;
}

/* Выровнять по правому краю для своих сообщений */
.message.own .timestamp {
  text-align: right;
}

/* Для чужих сообщений выравнивание по левому краю (по умолчанию) */
.message .timestamp {
  text-align: left;
}
</style>
