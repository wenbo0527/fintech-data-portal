import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import type { MonitorTarget, MonitorRule, MonitorRun } from '../types/monitor.js';
import type { StorageService } from './storage.js';

export class MonitorService {
  private browser: Browser | null = null;
  private storage: StorageService;

  constructor(storage: StorageService) {
    this.storage = storage;
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runMonitor(target: MonitorTarget, rules: MonitorRule[]): Promise<MonitorRun> {
    const runId = uuidv4();
    const startTime = Date.now();
    
    const run: MonitorRun = {
      id: runId,
      targetId: target.id,
      status: 'running',
      duration: 0,
      errors: [],
      metrics: {},
      createdAt: new Date().toISOString()
    };

    try {
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      const page = await context.newPage();
      
      await this.performLogin(page, target);
      
      const navigationStart = Date.now();
      await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30000 });
      
      run.metrics.loadTime = Date.now() - navigationStart;
      
      await this.validateRules(page, rules, run);
      
      const screenshot = await page.screenshot({ fullPage: true });
      const screenshotRef = await this.storage.saveScreenshot(target.id, runId, screenshot);
      run.screenshotRef = screenshotRef;
      
      const har = await this.captureNetworkData(page);
      const harRef = await this.storage.saveHar(target.id, runId, har);
      run.harRef = harRef;
      
      run.status = run.errors.length > 0 ? 'failed' : 'success';
      
      await context.close();
    } catch (error) {
      run.status = 'failed';
      run.errors.push({
        ruleId: 'system',
        type: 'system_error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      run.duration = Date.now() - startTime;
      run.createdAt = new Date().toISOString();
    }

    return run;
  }

  private async performLogin(page: Page, target: MonitorTarget): Promise<void> {
    if (target.authType === 'password' && target.authConfig) {
      const { username, password, loginUrl, usernameSelector, passwordSelector, submitSelector } = target.authConfig;
      
      if (loginUrl && loginUrl !== target.url) {
        await page.goto(loginUrl, { waitUntil: 'networkidle' });
      }
      
      if (usernameSelector) {
        await page.fill(usernameSelector, username);
      }
      
      if (passwordSelector) {
        await page.fill(passwordSelector, password);
      }
      
      if (submitSelector) {
        await page.click(submitSelector);
        await page.waitForLoadState('networkidle');
      }
    }
  }

  private async validateRules(page: Page, rules: MonitorRule[], run: MonitorRun): Promise<void> {
    for (const rule of rules) {
      if (!rule.enabled) continue;
      
      try {
        switch (rule.type) {
          case 'exists':
            if (rule.selector) {
              const element = await page.locator(rule.selector).first();
              if (!(await element.count())) {
                throw new Error(`Element not found: ${rule.selector}`);
              }
            }
            break;
            
          case 'visible':
            if (rule.selector) {
              const element = await page.locator(rule.selector).first();
              if (!(await element.isVisible())) {
                throw new Error(`Element not visible: ${rule.selector}`);
              }
            }
            break;
            
          case 'textMatch':
            if (rule.selector && rule.expect) {
              const element = await page.locator(rule.selector).first();
              const text = await element.textContent();
              if (!text || !text.includes(String(rule.expect))) {
                throw new Error(`Text mismatch. Expected: ${rule.expect}, Got: ${text}`);
              }
            }
            break;
            
          case 'nonEmpty':
            if (rule.selector) {
              const element = await page.locator(rule.selector).first();
              const text = await element.textContent();
              if (!text || text.trim().length === 0) {
                throw new Error(`Element is empty: ${rule.selector}`);
              }
            }
            break;
            
          case 'tableRows':
            if (rule.selector && rule.threshold) {
              const rows = await page.locator(`${rule.selector} tr`).count();
              if (rows < rule.threshold) {
                throw new Error(`Table has ${rows} rows, expected at least ${rule.threshold}`);
              }
            }
            break;
            
          case 'minPerf':
            if (rule.threshold && run.metrics.loadTime) {
              if (run.metrics.loadTime < rule.threshold) {
                throw new Error(`Load time ${run.metrics.loadTime}ms is less than minimum ${rule.threshold}ms`);
              }
            }
            break;
            
          case 'maxPerf':
            if (rule.threshold && run.metrics.loadTime) {
              if (run.metrics.loadTime > rule.threshold) {
                throw new Error(`Load time ${run.metrics.loadTime}ms exceeds maximum ${rule.threshold}ms`);
              }
            }
            break;
        }
      } catch (error) {
        run.errors.push({
          ruleId: rule.id,
          type: rule.type,
          message: error instanceof Error ? error.message : 'Validation failed'
        });
      }
    }
  }

  private async captureNetworkData(page: Page): Promise<any> {
    const requests = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((entry: any) => ({
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize,
        status: entry.responseStatus
      }));
    });
    
    return {
      log: {
        version: '1.2',
        creator: { name: 'report-monitor', version: '1.0.0' },
        entries: requests
      }
    };
  }
}