<template>
  <div class="auth-container">
    <h2>Регистрация в Whisper</h2>
    <form @submit.prevent="register">
      <input
        v-model="name"
        type="text"
        placeholder="Имя пользователя (латиница и цифры)"
        required
      />
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Пароль" required />
      <button type="submit">Создать аккаунт</button>
    </form>
    <p>
      Уже есть аккаунт?
      <router-link to="/login">Войти</router-link>
    </p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      name: "",
      email: "",
      password: "",
    };
  },
  methods: {
    async register() {
      try {
        const res = await fetch("http://127.0.0.1:8080/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: this.name,
            email: this.email,
            password: this.password,
            role: "ROLE_USER",
          }),
        });

        if (!res.ok) throw new Error("Ошибка регистрации");

        // Успешная регистрация — логиним пользователя
        await this.login();
      } catch (err) {
        alert(err.message);
      }
    },

    async login() {
      try {
        const res = await fetch("http://127.0.0.1:8080/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: this.email,
            password: this.password,
          }),
        });

        if (!res.ok) throw new Error("Ошибка входа");

        const data = await res.json();
        localStorage.setItem("token", data.token);
        this.$router.push("/chats");
      } catch (err) {
        alert(err.message);
      }
    },
  },
};
</script>

<style scoped>
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
  align-items: center; /* Центрируем содержимое контейнера */
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}

form {
  display: flex;
  flex-direction: column;
  align-items: center; /* Центрируем элементы формы */
  width: 100%;
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

button:hover {
  background-color: #006fa3;
}

p {
  text-align: center;
  margin-top: 15px;
}

a {
  color: #00aaff;
  text-decoration: none;
}
</style>
