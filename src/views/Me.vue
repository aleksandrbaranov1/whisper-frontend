<template>
  <div class="profile-container">
    <h2>Профиль пользователя</h2>
    <div v-if="user" class="profile-card">
      <p><strong>Имя:</strong> {{ user.name }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>
      <p><strong>Роль:</strong> {{ user.role }}</p>
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
    };
  },
  methods: {
    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
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
</style>
