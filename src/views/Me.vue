<template>
  <div class="profile-container">
    <h2>Профиль пользователя</h2>
    <div v-if="user" class="profile-card">
      <p><strong>Имя:</strong> {{ user.name }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>
      <p><strong>Роль:</strong> {{ user.role }}</p>

      <!-- Блок "О себе" -->
      <div v-if="user.bio !== null">
        <div v-if="!editingBio">
          <p class="bio-label"><strong>О себе:</strong></p>
          <p class="bio-text">{{ user.bio }}</p>
          <button class="edit-btn" @click="startEditBio">Редактировать</button>
        </div>
        <div v-else>
          <textarea v-model="bioDraft" rows="3" class="bio-input"></textarea>
          <button class="save-btn" @click="saveBio">Сохранить</button>
          <button class="cancel-btn" @click="cancelEditBio">Отмена</button>
        </div>
      </div>
      <div v-else>
        <button class="edit-btn" @click="startEditBio">Добавить "О себе"</button>
        <div v-if="editingBio">
          <textarea v-model="bioDraft" rows="3" class="bio-input"></textarea>
          <button class="save-btn" @click="saveBio">Сохранить</button>
          <button class="cancel-btn" @click="cancelEditBio">Отмена</button>
        </div>
      </div>

      <button class="logout-btn" @click="logout">Выйти</button>
    </div>
    <div v-else class="profile-loading">
      <p>Загрузка...</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      user: null,
      editingBio: false,
      bioDraft: "",
    };
  },
  methods: {
    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
    },
    startEditBio() {
      this.editingBio = true;
      this.bioDraft = this.user.bio || "";
    },
    cancelEditBio() {
      this.editingBio = false;
      this.bioDraft = this.user.bio || "";
    },
    async saveBio() {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://localhost:8080/api/profile/updateBio", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            userId: this.user.id,
            bio: this.bioDraft,
          }),
        });
        if (!res.ok) throw new Error("Ошибка при обновлении 'О себе'");
        this.user = await res.json();
        this.editingBio = false;
      } catch (error) {
        alert(error.message);
      }
    },
  },
  async created() {
    const token = localStorage.getItem("token");
    if (!token) {
      this.$router.push("/login");
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/api/profile/me", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });
      if (!res.ok) throw new Error("Ошибка получения профиля");
      this.user = await res.json();
    } catch (error) {
      alert(error.message);
      this.$router.push("/login");
    }
  },
};
</script>

<style scoped>
.profile-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 30px 24px;
  background-color: #2c2c3b;
  color: white;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: "Inter", Arial, sans-serif;
}

h2 {
  margin-bottom: 24px;
  text-align: center;
  font-weight: 600;
  font-size: 24px;
}

.profile-card {
  width: 100%;
  background: #232336;
  border-radius: 10px;
  padding: 20px;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.profile-card p {
  margin: 12px 0;
  font-size: 16px;
}

.profile-card strong {
  color: #00aaff;
  font-weight: 600;
}

.profile-loading {
  width: 100%;
  text-align: center;
  color: #bbb;
  font-size: 16px;
}

.logout-btn {
  margin-top: 24px;
  width: 100%;
  padding: 12px 0;
  background: #ff3b3b;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #d32f2f;
}

.bio-label {
  margin-top: 16px;
  margin-bottom: 4px;
}

.bio-text {
  margin-bottom: 8px;
  white-space: pre-line;
}

.bio-input {
  width: 100%;
  margin-bottom: 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
  padding: 8px;
  font-size: 15px;
  color: #232336;
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
</style>
