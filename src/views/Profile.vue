<template>
  <div class="profile">
    <h2>{{ profile.name }}</h2>
    <p>{{ profile.email }}</p>
    <div v-if="profile.bio !== null">
      <div v-if="!editingBio">
        <p class="bio-text">{{ profile.bio }}</p>
        <button @click="editingBio = true" class="edit-btn">
          Редактировать "О себе"
        </button>
      </div>
      <div v-else>
        <textarea v-model="bioDraft" rows="3" class="bio-input"></textarea>
        <button @click="saveBio" class="save-btn">Сохранить</button>
        <button @click="cancelEdit" class="cancel-btn">Отмена</button>
      </div>
    </div>
    <div v-else>
      <button @click="editingBio = true" class="edit-btn">
        Добавить "О себе"
      </button>
      <div v-if="editingBio">
        <textarea v-model="bioDraft" rows="3" class="bio-input"></textarea>
        <button @click="saveBio" class="save-btn">Сохранить</button>
        <button @click="cancelEdit" class="cancel-btn">Отмена</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const profile = ref({});
const editingBio = ref(false);
const bioDraft = ref("");

const fetchProfile = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("http://localhost:8080/api/profile/me", {
    headers: { Authorization: "Bearer " + token },
  });
  if (res.ok) {
    profile.value = await res.json();
  }
};

const saveBio = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch("http://localhost:8080/api/profile/updateBio", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      userId: profile.value.id,
      bio: bioDraft.value,
    }),
  });
  if (res.ok) {
    profile.value = await res.json();
    editingBio.value = false;
  }
};

const cancelEdit = () => {
  editingBio.value = false;
  bioDraft.value = profile.value.bio || "";
};

onMounted(async () => {
  await fetchProfile();
  bioDraft.value = profile.value.bio || "";
});
</script>

<style scoped>
.bio-input {
  width: 100%;
  margin-bottom: 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
  padding: 8px;
  font-size: 15px;
}
.edit-btn,
.save-btn,
.cancel-btn {
  margin-right: 8px;
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  background: #0088cc;
  color: #fff;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.2s;
}
.cancel-btn {
  background: #444;
}
.edit-btn:hover,
.save-btn:hover {
  background: #0077b3;
}
.cancel-btn:hover {
  background: #666;
}
.bio-text {
  margin-bottom: 8px;
  white-space: pre-line;
}
</style>
