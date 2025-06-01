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
  padding: 30px;
  background-color: #2c2c3b;
  color: white;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
}
input {
  padding: 10px;
  margin-bottom: 15px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  width: 100%; /* Растягиваем поля на всю ширину формы */
  box-sizing: border-box;
}
button {
  padding: 12px;
  background-color: #0088cc;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  width: 100%; /* Кнопка на всю ширину */
}
p {
  text-align: center;
  margin-top: 15px;
}
a {
  color: #00aaff;
  text-decoration: none;
}
body {
  min-height: 100vh;
  background-color: #505060;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-family: "Inter", Arial, sans-serif;
}
</style>
