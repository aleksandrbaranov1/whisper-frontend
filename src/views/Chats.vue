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
      <div v-if="selectedChat" class="chat-content">
        <div class="messages" ref="messagesContainer">
          <div
            v-for="message in messages"
            :key="message.id"
            :class="['message', { own: message.senderId === currentUserId }]"
          >
            {{ message.content }}
            <div class="timestamp">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>

        <div class="message-input">
          <input
            type="text"
            v-model="newMessage"
            @keyup.enter="sendMessage"
            placeholder="Введите сообщение..."
          />
          <button @click="sendMessage">-></button>
        </div>
      </div>

      <div v-else class="placeholder">
        <p>Выберите чат, чтобы просмотреть сообщения</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const chats = ref([]);
const messages = ref([]);
const selectedChat = ref(null);
const currentUserId = ref(null);
const newMessage = ref("");
const messagesContainer = ref(null);
const stompClient = ref(null);

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
  await nextTick(() => {
    scrollToBottom();
  });
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
  await nextTick(() => {
    scrollToBottom();
  });
};

const sendMessage = () => {
  if (
    !newMessage.value.trim() ||
    !selectedChat.value ||
    !stompClient.value ||
    !stompClient.value.connected
  )
    return;

  const messagePayload = {
    senderId: currentUserId.value,
    chatId: selectedChat.value.id,
    content: newMessage.value.trim(),
  };

  stompClient.value.publish({
    destination: "/app/chat.send", // совпадает с @MessageMapping на сервере
    body: JSON.stringify(messagePayload),
  });

  newMessage.value = "";
};

const scrollToBottom = () => {
  const container = messagesContainer.value;
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
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

    const token = localStorage.getItem("token");
    const socket = new SockJS("http://localhost:8080/ws");

    stompClient.value = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        console.log("[STOMP]", str);
      },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("STOMP connected");

        stompClient.value.subscribe("/topic/chat", (message) => {
          const body = JSON.parse(message.body);
          console.log("New message", body);

          if (selectedChat.value && body.chatId === selectedChat.value.id) {
            messages.value.push(body);
            nextTick(() => scrollToBottom());
          }
        });
      },
      onStompError: (frame) => {
        console.error("STOMP error", frame.headers.message);
      },
    });

    stompClient.value.activate();
  } catch (e) {
    console.error(e);
  }
});

onBeforeUnmount(() => {
  if (stompClient.value) {
    stompClient.value.deactivate();
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
  padding: 0;
  overflow: hidden;
}
.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 20px;
  padding-bottom: 80px;
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
  text-align: left;
}
.message.own .timestamp {
  text-align: right;
}

/* Поле ввода сообщения */
.message-input {
  display: flex;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background-color: #1e1e2f;
  border-top: 1px solid #333;
  gap: 8px;
  align-items: center;
}

.message-input input {
  flex: 1;
  height: 48px;
  width: 1095;
  padding: 0 14px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  box-sizing: border-box;
}

.message-input button {
  height: 48px;
  width: 48px; /* Сделайте кнопку квадратной для лучшего центрирования */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 8px;
  background-color: #0088cc;
  color: white;
  cursor: pointer;
  font-size: 20px; /* Можно увеличить для лучшей видимости */
  white-space: nowrap;
}

.message-input button:hover {
  background-color: #0077b3;
}

/* Заглушка */
.placeholder {
  margin: auto;
  text-align: center;
  color: #888;
  font-size: 18px;
}
</style>
