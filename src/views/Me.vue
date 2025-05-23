<template>
  <div>
    <h2>Профиль пользователя</h2>
    <div v-if="user">
      <p><strong>Имя:</strong> {{ user.name }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>
      <p><strong>Роль:</strong> {{ user.role }}</p>
    </div>
    <div v-else>
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
