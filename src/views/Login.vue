<template>
  <div class="auth-container">
    <h2>Вход в Whisper</h2>
    <form @submit.prevent="login">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Пароль" required />
      <button type="submit">Войти</button>
    </form>
    <p>
      Нет аккаунта?
      <router-link to="/register">Зарегистрироваться</router-link>
    </p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      email: "",
      password: "",
    };
  },
  methods: {
    async login() {
      try {
        const response = await fetch("http://127.0.0.1:8080/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: this.email, password: this.password }),
        });

        if (!response.ok) throw new Error("Ошибка входа");

        const data = await response.json();
        console.log("Ответ сервера при логине:", data);
        localStorage.setItem("token", data.token);
        this.$router.push("/chats"); // Добавишь позже
      } catch (error) {
        alert(error.message);
      }
    },
  },
};
</script>

<style>
.auth-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid #ddd;
}
input,
button {
  display: block;
  width: 100%;
  margin-bottom: 10px;
}
</style>
