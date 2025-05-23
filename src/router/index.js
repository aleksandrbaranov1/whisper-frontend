import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import Chats from "../views/Chats.vue";
import Me from "../views/Me.vue";

const routes = [
  {
    path: "/",
    component: Login,
    meta: { title: "Whisper" },
  },
  {
    path: "/register",
    component: Register,
    meta: { title: "Whisper" },
  },
  {
    path: "/chats",
    component: Chats,
    meta: { title: "Whisper" },
  },
  {
    path: "/me",
    component: Me,
    meta: { title: "Whisper" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
