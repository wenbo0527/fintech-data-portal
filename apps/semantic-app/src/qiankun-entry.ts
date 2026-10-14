/**
 * qiankun 微前端入口
 * 遵循现有子应用约定
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ArcoVue from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
import '@opentiny/tiny-robot/dist/style.css'
import App from './Root.vue'
import router from './router'
import './styles/index.scss'

let app: ReturnType<typeof createApp> | null = null

function render(container?: HTMLElement) {
  app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.use(ArcoVue)
  app.mount(container || '#app')
}

// 独立运行
if (!window.__POWERED_BY_QIANKUN__) {
  render()
}

// qiankun 生命周期
export async function bootstrap() {
  // eslint-disable-next-line no-console
  console.log('semantic-app bootstrap')
}

export async function mount(props: { container: HTMLElement }) {
  render(props.container)
}

export async function unmount() {
  if (app) {
    app.unmount()
    app = null
  }
}
