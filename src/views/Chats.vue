<template>
  <div>
    <button class="profile-button" @click="$router.push('/me')">
      <span class="icon">👤</span>
    </button>
    <!-- <h1>Chats Page</h1> -->
  </div>
</template>

<script setup>
// Ничего не нужно
</script>

<style scoped>
.profile-button {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background-color: #eee;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-button:hover {
  background-color: #ddd;
}

.icon {
  font-size: 18px;
}
</style>
