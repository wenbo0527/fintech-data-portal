import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

/**
 * dev 服务器 LLM 桥接中间件
 *
 * 浏览器把「模型服务设置」里的 Base URL / API Key 随请求头传入，
 * 由 dev server 转发到 OpenAI 兼容端点（/chat/completions），
 * 规避浏览器 CORS，同时避免凭据写死在代码或构建产物里。
 * 仅 dev 环境生效（configureServer），构建产物不包含此逻辑。
 */

const BRIDGE_PATH = '/llm-api/chat/completions'

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function json(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(body)
}

export function llmBridge(): Plugin {
  return {
    name: 'semantic-llm-bridge',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (!url.includes(BRIDGE_PATH)) return next()
        if (req.method !== 'POST') return json(res, 405, { error: { message: '仅支持 POST' } })

        const baseUrl = String(req.headers['x-llm-base-url'] || '').trim()
        const auth = String(req.headers['authorization'] || '').trim()

        // 安全校验：仅允许 https 公网端点，禁止指向本机/内网（防 SSRF 滥用）
        let target: URL
        try {
          target = new URL(baseUrl.replace(/\/+$/, '') + BRIDGE_PATH)
        } catch {
          return json(res, 400, { error: { message: 'X-LLM-Base-Url 缺失或格式非法，请在「模型服务设置」中配置' } })
        }
        if (target.protocol !== 'https:' || /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(target.hostname)) {
          return json(res, 400, { error: { message: `不允许的转发目标：${target.hostname}（仅支持 https 公网端点）` } })
        }
        if (!auth) {
          return json(res, 400, { error: { message: '缺少 Authorization（API Key 未配置）' } })
        }

        const body = await readBody(req)
        try {
          const upstream = await fetch(target.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: auth
            },
            body
          })
          res.statusCode = upstream.status
          const ct = upstream.headers.get('content-type')
          if (ct) res.setHeader('Content-Type', ct)
          if (upstream.body) {
            for await (const chunk of upstream.body as unknown as AsyncIterable<Uint8Array>) {
              res.write(chunk)
            }
          }
          res.end()
        } catch (e) {
          json(res, 502, { error: { message: `无法连接模型端点 ${target.hostname}：${(e as Error).message}` } })
        }
      })
    }
  }
}
