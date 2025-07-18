<template>
  <div class="chat-page">
    <!-- Боковая панель -->
    <aside class="sidebar" :style="{ width: sidebarWidth + 'px' }">
      <div class="sidebar-header">
        <button class="profile-button" @click="$router.push('/me')">👤</button>
        <button
          class="new-chat-button"
          @click="toggleSearch"
          :title="'Новый чат'"
        >
          💬
        </button>
      </div>

      <div v-if="showSearch" class="search-block">
        <input
          v-model="searchQuery"
          @input="onSearch"
          class="search-input"
          placeholder="Поиск пользователя..."
          autocomplete="off"
        />
        <div class="search-list">
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            class="search-item"
            @click="startChatWith(user)"
          >
            {{ user.name }}
          </div>
          <div
            v-if="searchQuery && filteredUsers.length === 0"
            class="search-empty"
          >
            Пользователь не найден
          </div>
        </div>
      </div>

      <div class="chat-list" v-if="!showSearch">
        <div
          class="chat-item"
          v-for="chat in sortedChats"
          :key="chat.id"
          @click="selectChat(chat)"
          @contextmenu.prevent="showContextMenu($event, chat)"
          :class="{ selected: selectedChat && selectedChat.id === chat.id }"
        >
          <div class="chat-item-title">
            {{ getOtherParticipantName(chat.participants) }}
          </div>
          <div class="chat-item-last">
            <template v-if="chat.lastMessage">
              <span v-if="chat.lastMessage.senderId === currentUserId"
                >Вы:
              </span>
              {{ chat.lastMessage.content }}
            </template>
            <template v-else> Нет сообщений </template>
          </div>
          <span v-if="chat.unreadCount > 0" class="unread-badge">
            {{ chat.unreadCount }}
          </span>
        </div>
      </div>

      <!-- Контекстное меню -->
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
        @click="contextMenu.visible = false"
      >
        <button class="delete-btn" @click.stop="deleteChat(contextMenu.chat)">
          Удалить чат
        </button>
      </div>

      <!-- Уведомление об удалении -->
      <div v-if="pendingDelete.visible" class="delete-toast">
        Чат будет удалён через {{ pendingDelete.seconds }} сек.
        <button class="undo-btn" @click="undoDelete">Отменить</button>
      </div>

      <div class="sidebar-resizer" @mousedown="startResizing"></div>
    </aside>

    <!-- Зона сообщений -->
    <main class="chat-window">
      <div v-if="selectedChat" class="chat-content">
        <div class="chat-header">
          <span class="chat-title">
            {{ getOtherParticipantName(selectedChat.participants) }}
          </span>
        </div>
        <div class="messages" ref="messagesContainer">
          <template v-for="(message, idx) in messages" :key="message.id">
            <!-- Разделитель дат -->
            <div
              v-if="
                idx === 0 ||
                formatDate(message.timestamp) !==
                  formatDate(messages[idx - 1].timestamp)
              "
              class="date-separator"
            >
              <span>{{ formatDate(message.timestamp) }}</span>
            </div>
            <div
              :class="['message', { own: message.senderId === currentUserId }]"
              @contextmenu="showMessageContextMenu($event, message)"
            >
              {{ message.content }}
              <div class="timestamp">{{ formatTime(message.timestamp) }}</div>
              <div
                v-if="!message.isRead && message.senderId === currentUserId"
                class="unread-label"
              >
                непрочитано
              </div>
            </div>
          </template>
          <!-- Контекстное меню для сообщений -->
          <div
            v-if="messageContextMenu.visible"
            class="context-menu"
            :style="{
              top: messageContextMenu.y + 'px',
              left: messageContextMenu.x + 'px',
            }"
          >
            <button class="delete-btn" @click="deleteMessage">
              Удалить сообщение
            </button>
            <button
              class="edit-btn"
              v-if="
                messageContextMenu.message &&
                messageContextMenu.message.senderId === currentUserId
              "
              @click="startEditMessage"
            >
              Редактировать
            </button>
          </div>
        </div>

        <div class="message-input">
          <input
            id="message-input"
            :value="editingMessage ? editingContent : newMessage"
            @input="
              editingMessage
                ? (editingContent = $event.target.value)
                : (newMessage = $event.target.value)
            "
            @keyup.enter="editingMessage ? editMessage() : sendMessage()"
            :placeholder="
              editingMessage
                ? 'Редактирование сообщения...'
                : 'Введите сообщение...'
            "
          />
          <button @click="editingMessage ? editMessage() : sendMessage()">
            ->
          </button>
        </div>
      </div>

      <div v-else class="placeholder">
        <p>Выберите чат, чтобы просмотреть сообщения</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from "vue";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const chats = ref([]);
const messages = ref([]);
const selectedChat = ref(null);
const currentUserId = ref(null);
const newMessage = ref("");
const messagesContainer = ref(null);
const stompClient = ref(null);
const showSearch = ref(false);
const searchQuery = ref("");
const filteredUsers = ref([]);
let readSubs = [];

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  chat: null,
});

const pendingDelete = ref({
  visible: false,
  chat: null,
  timer: null,
  seconds: 5,
});

// Контекстное меню для сообщений
const messageContextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  message: null,
});

const editingMessage = ref(null); // объект сообщения, если редактируем
const editingContent = ref(""); // текст для редактирования

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

  subscribeAllChats();
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
  // Преобразуем read -> isRead
  messages.value = (await res.json()).map((msg) => ({
    ...msg,
    isRead: msg.read,
  }));

  // Отметить как прочитанные только чужие сообщения
  const unreadIds = messages.value
    .filter((msg) => !msg.isRead && msg.senderId !== currentUserId.value)
    .map((msg) => msg.id);

  await markMessagesAsRead(unreadIds);

  // После запроса повторно обновлять isRead не нужно —
  // при следующем fetchMessages сервер вернёт актуальный статус для всех сообщений (и для своих, и для чужих)
  // Если хочешь мгновенно убрать маркер у своих сообщений:
  messages.value.forEach((msg) => {
    if (msg.senderId === currentUserId.value && msg.isRead) {
      // Маркер исчезнет, потому что isRead уже true
    }
  });

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

function showContextMenu(e, chat) {
  contextMenu.value.visible = true;
  contextMenu.value.x = e.clientX;
  contextMenu.value.y = e.clientY;
  contextMenu.value.chat = chat;
  // Закрыть меню при клике вне его
  setTimeout(() => {
    window.addEventListener("click", closeContextMenu);
  }, 0);
}
function closeContextMenu() {
  contextMenu.value.visible = false;
  window.removeEventListener("click", closeContextMenu);
}

const deleteChat = async (chat) => {
  contextMenu.value.visible = false;
  // Показываем уведомление и запускаем таймер
  pendingDelete.value = {
    visible: true,
    chat,
    timer: null,
    seconds: 5,
  };

  // Таймер обратного отсчёта
  pendingDelete.value.timer = setInterval(() => {
    if (pendingDelete.value.seconds > 1) {
      pendingDelete.value.seconds--;
    } else {
      clearInterval(pendingDelete.value.timer);
      pendingDelete.value.visible = false;
      // Только теперь реально удаляем чат
      doDeleteChat(chat);
    }
  }, 1000);
};

const undoDelete = () => {
  clearInterval(pendingDelete.value.timer);
  pendingDelete.value.visible = false;
};

const doDeleteChat = async (chat) => {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(
      `http://localhost:8080/api/chats/deleteChat/${chat.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );
    if (res.ok) {
      if (selectedChat.value && selectedChat.value.id === chat.id) {
        selectedChat.value = null;
        messages.value = [];
      }
      await fetchChats();
    } else {
      alert("Ошибка удаления чата");
    }
  } catch (e) {
    alert("Ошибка удаления чата");
  }
};

// Контекстное меню для сообщений
function showMessageContextMenu(e, message) {
  e.preventDefault();
  // Размеры меню (примерно, можно уточнить)
  const menuWidth = 160;
  const menuHeight = 90;
  const padding = 8;

  let x = e.clientX;
  let y = e.clientY;

  // Проверка выхода за правый и нижний край
  if (x + menuWidth > window.innerWidth - padding) {
    x = window.innerWidth - menuWidth - padding;
  }
  if (y + menuHeight > window.innerHeight - padding) {
    y = window.innerHeight - menuHeight - padding;
  }

  messageContextMenu.value.visible = true;
  messageContextMenu.value.x = x;
  messageContextMenu.value.y = y;
  messageContextMenu.value.message = message;
  setTimeout(() => {
    window.addEventListener("click", closeMessageContextMenu);
  }, 0);
}
function closeMessageContextMenu() {
  messageContextMenu.value.visible = false;
  window.removeEventListener("click", closeMessageContextMenu);
}

const deleteMessage = async () => {
  const { message } = messageContextMenu.value;
  if (!message) return;
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(
      `http://localhost:8080/messages/delete/${selectedChat.value.id}/${message.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );
    if (res.ok || res.status === 204) {
      messages.value = messages.value.filter((msg) => msg.id !== message.id);
      await fetchChats();
      // Найти обновлённый чат и присвоить его в selectedChat
      const updated = chats.value.find((c) => c.id === selectedChat.value.id);
      if (updated) selectedChat.value = updated;
      // Обновить сообщения и lastMessage
      if (selectedChat.value) {
        await fetchMessages(selectedChat.value.id);
      }
    } else {
      alert("Ошибка удаления сообщения");
    }
  } catch (e) {
    alert("Ошибка удаления сообщения");
  }
  closeMessageContextMenu();
};

function startEditMessage() {
  editingMessage.value = messageContextMenu.value.message;
  editingContent.value = editingMessage.value.content;
  messageContextMenu.value.visible = false;
  nextTick(() => {
    const input = document.getElementById("edit-message-input");
    if (input) input.focus();
  });
}

const editMessage = async () => {
  if (!editingMessage.value || !editingContent.value.trim()) return;
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(
      `http://localhost:8080/messages/edit/${
        editingMessage.value.id
      }/${encodeURIComponent(editingContent.value)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );
    if (res.ok) {
      const updated = await res.json();
      // Обновить сообщение в списке
      const idx = messages.value.findIndex((m) => m.id === updated.id);
      if (idx !== -1)
        messages.value[idx] = { ...messages.value[idx], ...updated };
      editingMessage.value = null;
      editingContent.value = "";
    } else {
      alert("Ошибка при редактировании сообщения");
    }
  } catch (e) {
    alert("Ошибка при редактировании сообщения");
  }
};

// ...остальные функции...
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
};

const toggleSearch = () => {
  showSearch.value = !showSearch.value;
  searchQuery.value = "";
  filteredUsers.value = [];
};

const onSearch = async () => {
  if (!searchQuery.value.trim()) {
    filteredUsers.value = [];
    return;
  }
  const token = localStorage.getItem("token");
  const res = await fetch(
    `http://localhost:8080/api/chats/searchUsers?name=${encodeURIComponent(
      searchQuery.value
    )}`,
    {
      headers: { Authorization: "Bearer " + token },
    }
  );
  if (res.ok) {
    // Ответ — массив имён, преобразуем в объекты для v-for
    const names = await res.json();
    filteredUsers.value = names.map((name) => ({ name }));
  } else {
    filteredUsers.value = [];
  }
};

const startChatWith = async (user) => {
  const token = localStorage.getItem("token");
  const res = await fetch(
    `http://localhost:8080/api/chats/private?user2Name=${encodeURIComponent(
      user.name
    )}`,
    {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
    }
  );
  if (res.ok) {
    await fetchChats();
    showSearch.value = false;
    searchQuery.value = "";
    filteredUsers.value = [];
    // Найти только что созданный чат и выбрать его
    const newChat = chats.value.find((chat) =>
      chat.participants.some((p) => p.name === user.name)
    );
    if (newChat) selectChat(newChat);
  } else {
    alert("Не удалось создать чат");
  }
};

const markMessagesAsRead = async (messageIds) => {
  console.log("markMessagesAsRead вызвана с:", messageIds);
  if (!messageIds.length) return;
  const token = localStorage.getItem("token");
  try {
    const res = await fetch("http://localhost:8080/messages/mark-read", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ messageIds }),
    });
    console.log("Ответ mark-read:", res.status, await res.text());
  } catch (e) {
    console.error("Ошибка запроса mark-read:", e);
  }
};

const sortedChats = computed(() => {
  return [...chats.value].sort((a, b) => {
    const aTime = a.lastMessage?.timestamp
      ? Date.parse(a.lastMessage.timestamp)
      : 0;
    const bTime = b.lastMessage?.timestamp
      ? Date.parse(b.lastMessage.timestamp)
      : 0;
    return bTime - aTime;
  });
});

const subscribeAllChats = () => {
  // Отписаться от старых подписок
  readSubs.forEach((sub) => sub.unsubscribe());
  readSubs = [];
  chats.value.forEach((chat) => {
    // Подписка на обновление статуса прочтения сообщений
    const sub = stompClient.value.subscribe(`/topic/chat/${chat.id}`, (msg) => {
      const { messageIds } = JSON.parse(msg.body);
      messages.value.forEach((m) => {
        if (messageIds.includes(m.id)) m.isRead = true;
      });
    });
    readSubs.push(sub);

    // Подписка на удаление сообщений
    const subDelete = stompClient.value.subscribe(
      `/topic/chats/${chat.id}/deleted`,
      async (msg) => {
        const data = JSON.parse(msg.body);

        // Обновить список чатов и подписки
        await fetchChats();
        subscribeAllChats();

        // Если чат открыт — обновить сообщения
        if (
          selectedChat.value &&
          String(data.chatId) === String(selectedChat.value.id)
        ) {
          await fetchMessages(selectedChat.value.id);
        }
      }
    );
    readSubs.push(subDelete);
  });
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

        // Подписка на все чаты пользователя!
        subscribeAllChats();

        // Подписка на сообщения в текущем чате
        stompClient.value.subscribe("/topic/chat", (message) => {
          const body = JSON.parse(message.body);
          if (selectedChat.value && body.chatId === selectedChat.value.id) {
            messages.value.push(body);
            nextTick(() => scrollToBottom());
          }
        });

        // Подписка на обновление списка чатов
        stompClient.value.subscribe("/topic/chats", () => {
          fetchChats();
        });

        // Подписка на обновление статуса прочтения сообщений
        if (selectedChat.value) {
          stompClient.value.subscribe(
            `/topic/chat/${selectedChat.value.id}`,
            (msg) => {
              const { messageIds } = JSON.parse(msg.body);
              messages.value.forEach((m) => {
                if (messageIds.includes(m.id)) m.isRead = true;
              });
            }
          );
        }
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
  readSubs.forEach((sub) => sub.unsubscribe());
  readSubs = [];
});

const sidebarWidth = ref(260);
let resizing = false;

function startResizing(e) {
  resizing = true;
  document.body.style.cursor = "ew-resize";
}

function stopResizing() {
  resizing = false;
  document.body.style.cursor = "";
}

function onMouseMove(e) {
  if (resizing) {
    sidebarWidth.value = Math.max(180, Math.min(500, e.clientX));
  }
}

onMounted(() => {
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", stopResizing);

  // Обработчик Esc для выхода из чата
  window.addEventListener("keydown", onEscKey);
});
onBeforeUnmount(() => {
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", stopResizing);

  window.removeEventListener("keydown", onEscKey);
});

function onEscKey(e) {
  if (e.key === "Escape") {
    selectedChat.value = null;
    messages.value = [];
    editingMessage.value = null;
    editingContent.value = "";
    messageContextMenu.value.visible = false;
    contextMenu.value.visible = false;
  }
}
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
  position: relative;
  min-width: 180px;
  max-width: 500px;
  background-color: #2d2d3a;
  display: flex;
  flex-direction: column;
  padding-top: 10px;
  border-right: 1px solid #444;
}

/* Заголовок сайдбара */
.sidebar-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.profile-button,
.new-chat-button {
  margin: 0;
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

/* Кнопка нового чата */
.new-chat-button {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border-radius: 50%;
  border: none;
  background-color: #0088cc;
  color: white;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.new-chat-button:hover {
  background-color: #0077b3;
}

.search-block {
  padding: 10px;
  background: #232336;
  border-radius: 10px;
  margin: 0 10px 16px 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.search-input {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  margin-bottom: 8px;
  background: #2d2d3a;
  color: white;
}
.search-list {
  max-height: 200px;
  overflow-y: auto;
}
.search-item {
  padding: 10px;
  border-radius: 6px;
  background: #3a3a4a;
  margin-bottom: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
.search-item:hover {
  background: #0088cc;
  color: white;
}
.search-empty {
  color: #888;
  text-align: center;
  padding: 10px 0;
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
  min-height: 0;
}
.messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 20px 20px 4px 20px; /* нижний padding уменьшен */
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
.message.unread {
  box-shadow: 0 0 0 2px #ff3b3b55;
  background-color: #4a4a5a;
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
  padding: 8px 16px 4px 16px;
  background-color: #1e1e2f;
  border-top: 1px solid #333;
  gap: 8px;
}

.message-input input {
  flex: 1;
  height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  box-sizing: border-box;
}

.message-input button {
  height: 44px;
  width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 8px;
  background-color: #0088cc;
  color: white;
  cursor: pointer;
  font-size: 20px;
  white-space: nowrap;
  margin-top: 0;
}
body {
  font-family: "Inter", Arial, sans-serif;
}

/* Заглушка */
.placeholder {
  margin: auto;
  text-align: center;
  color: #888;
  font-size: 18px;
}

.chat-header {
  padding: 16px 24px 8px 24px;
  background: #232336;
  border-bottom: 1px solid #333;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.chat-title {
  display: block;
  text-align: left;
}

.chat-item-title {
  font-weight: 600;
  font-size: 16px;
  color: #fff;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-item-last {
  font-size: 14px;
  color: #bbb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* Разделитель дат */
.date-separator {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 18px 0 8px 0;
  width: 100%;
}

.date-separator > span {
  padding: 4px 18px;
  border-radius: 16px;
  background: rgba(44, 44, 59, 0.7);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: inline-block;
}

/* Ресайзер сайдбара */
.sidebar-resizer {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
  z-index: 10;
}
.sidebar-resizer:hover {
  background: #0088cc33;
}

/* Значок непрочитанных сообщений */
.unread-badge {
  background: #ff3b3b;
  color: #fff;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 13px;
  margin-left: 8px;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
  display: inline-block;
}

/* Точка для непрочитанных сообщений */
.unread-dot {
  display: inline-block;
  margin-left: 8px;
  width: 8px;
  height: 8px;
  background: #ff3b3b;
  border-radius: 50%;
  vertical-align: middle;
}

.unread-label {
  color: #dad9d9;
  font-size: 12px;
  margin-top: 2px;
  text-align: right;
  font-style: italic;
}

/* Контекстное меню */
.context-menu {
  position: fixed;
  z-index: 1000;
  background: #232336;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 8px 0;
  min-width: 120px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
}
.delete-btn {
  width: 100%;
  background: none;
  border: none;
  color: #ff3b3b;
  font-size: 15px;
  padding: 8px 16px;
  text-align: left;
  cursor: pointer;
  border-radius: 0;
}
.delete-btn:hover {
  background: #3a3a4a;
}
.edit-btn {
  width: 100%;
  background: none;
  border: none;
  color: #0088cc;
  font-size: 15px;
  padding: 8px 16px;
  text-align: left;
  cursor: pointer;
  border-radius: 0;
  transition: background 0.2s, color 0.2s;
}
.edit-btn:hover {
  background: #0088cc;
  color: #fff;
}

/* Уведомление об удалении */
.delete-toast {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 18px;
  margin: 0 auto;
  background: #232336;
  color: #fff;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 12px 18px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 2000;
  max-width: 90%;
  min-width: 180px;
  font-size: 15px;
  gap: 12px;
}
.undo-btn {
  background: none;
  border: none;
  color: #0088cc;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  padding: 0 8px;
}
.undo-btn:hover {
  text-decoration: underline;
}
</style>
