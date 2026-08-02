import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ArcoVue, { Message } from '@arco-design/web-vue'
import ArcoVueIcon from '@arco-design/web-vue/es/icon'
import '@arco-design/web-vue/es/index.css'
import '../../../src/styles/subapp-tokens.css'
import Root from './Root.vue'
import router from './router'

const app = createApp(Root)
app.use(createPinia())
app.use(ArcoVue)
app.use(ArcoVueIcon)
app.use(router)

app.mount('#app')

router.isReady().then(() => {
  console.log('[MKT] 独立模式启动，路由就绪:', router.currentRoute.value.fullPath)
})