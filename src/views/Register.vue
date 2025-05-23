<template>
  <div class="auth-container">
    <h2>Регистрация в Whisper</h2>
    <form @submit.prevent="register">
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
      email: "",
      password: "",
    };
  },
  methods: {
    async register() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8080/api/auth/register",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: this.email,
              password: this.password,
            }),
          }
        );

        if (!response.ok) throw new Error("Ошибка регистрации");

        alert("Успешная регистрация. Выполните вход.");
        this.$router.push("/login");
      } catch (error) {
        alert(error.message);
      }
    },
  },
};
</script>
