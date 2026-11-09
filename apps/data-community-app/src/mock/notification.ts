// 通知管理系统Mock数据

import { NotificationType } from '@/types-dca/community';
import type { 
  Notification, 
  Category, 
  NotificationDocument, 
  OperationLog,
  NotificationListResponse,
  NotificationListParams,
  ApiResponse 
} from '@/types-dca/notification';

// 分类Mock数据
export const mockCategories: Category[] = [
  {
    id: '1',
    name: '社区发布',
    color: '#722ed1',
    icon: 'IconNotification',
    sortOrder: 1,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: '使用指南',
    color: '#165dff',
    icon: 'IconBook',
    sortOrder: 2,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: '案例库',
    color: '#00d084',
    icon: 'IconFile',
    sortOrder: 3,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    name: '产品动态',
    color: '#ff7d00',
    icon: 'IconApps',
    sortOrder: 4,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    name: '营销活动',
    color: '#f53f3f',
    icon: 'IconGift',
    sortOrder: 5,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '6',
    name: '人员动态',
    color: '#165dff',
    icon: 'IconUserGroup',
    sortOrder: 6,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  }
];

// 通知文档Mock数据
export const mockDocuments: NotificationDocument[] = [
  {
    id: 'doc1',
    notificationId: '1',
    fileName: '数据社区平台使用指南V2.0.pdf',
    filePath: '/uploads/documents/guide-v2.pdf',
    fileType: 'application/pdf',
    fileSize: 2048576,
    uploadedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'doc2',
    notificationId: '2',
    fileName: '新功能演示视频.mp4',
    filePath: '/uploads/documents/demo-video.mp4',
    fileType: 'video/mp4',
    fileSize: 15728640,
    uploadedAt: '2024-01-16T14:30:00Z'
  }
];

// 通知Mock数据
export const mockNotifications: Notification[] = [
  {
    id: '1',
    title: '【产品动态】关于 DeepSeek-V3 和 DeepSeek-R1 模型上线的通知',
    content: '亲爱的用户，我们很高兴地宣布 DeepSeek-V3 和 DeepSeek-R1 模型正式上线！本次更新带来了更强大的 AI 能力，支持更多复杂的应用场景。DeepSeek 系列模型在代码生成、逻辑推理和多轮对话方面均有显著提升。',
    type: 'news-update',
    categoryId: 'news',
    status: 'published',
    author: '系统管理员',
    views: 1250,
    isSticky: true,
    isPublic: true,
    allowComments: true,
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-01-20T09:00:00Z',
    target: ['all']
  },
  {
    id: '2',
    title: '【使用指南】数据社区平台使用技巧分享',
    content: '为了帮助大家更好地利用数据社区平台，我们整理了一系列实用的小技巧。包括如何快速搜索资源、如何高效参与讨论以及如何自定义您的个人主页。快来学习吧！',
    type: 'guide-basic',
    categoryId: 'guide',
    status: 'published',
    author: '内容编辑员',
    views: 856,
    isSticky: false,
    isPublic: true,
    allowComments: true,
    createdAt: '2024-01-18T14:30:00Z',
    updatedAt: '2024-01-18T14:30:00Z',
    target: ['all']
  },
  {
    id: '3',
    title: '【营销活动】数据大屏设计大赛火热进行中',
    content: '展现您的创意与才华！数据大屏设计大赛已经正式拉开帷幕。无论您是专业的设计师还是对数据可视化感兴趣的爱好者，都欢迎加入我们。丰厚奖品等你来拿！',
    type: 'news-activity',
    categoryId: 'news',
    status: 'published',
    author: '运营专家',
    views: 2100,
    isSticky: true,
    isPublic: true,
    allowComments: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    target: ['all']
  },
  {
    id: '4',
    title: '【管理办法】关于数据安全合规操作的最新规定',
    content: '为进一步加强数据安全管理，保护用户隐私 and 公司数据资产，公司制定了最新的《数据安全合规操作规定》。请各位同事认真学习并严格遵守。',
    type: 'policy-management',
    categoryId: 'policy',
    status: 'published',
    author: '安全审计部',
    views: 3420,
    isSticky: false,
    isPublic: true,
    allowComments: false,
    createdAt: '2024-01-10T08:30:00Z',
    updatedAt: '2024-01-10T08:30:00Z',
    target: ['all']
  },
  {
    id: '5',
    title: '【数据资产】用户行为表(ods_user_action)结构变更预告',
    content: '由于业务系统升级，用户行为表(ods_user_action)计划于本周五凌晨进行结构变更。新增字段包括：device_id, session_id。请相关下游任务负责人提前做好适配。',
    type: 'data_asset_change',
    categoryId: 'data_service',
    status: 'published',
    author: '数据开发',
    views: 450,
    isSticky: false,
    isPublic: true,
    allowComments: true,
    createdAt: '2024-01-22T16:00:00Z',
    updatedAt: '2024-01-22T16:00:00Z',
    target: ['analysts', 'developers']
  },
  {
    id: '6',
    title: '【腾讯云智能体】关于 DeepSeek-V3 和 DeepSeek-R1 模型上线的通知（含附件）',
    content: '您好！这是一条关于【腾讯云智能体】上线的通知，附件包含更新说明与操作手册，便于您快速了解与使用。',
    type: 'news-update',
    categoryId: 'news',
    status: 'published',
    author: '数据社区运营团队',
    views: 268,
    isSticky: false,
    isPublic: true,
    allowComments: true,
    createdAt: '2025-11-21T18:27:22Z',
    updatedAt: '2025-11-21T18:27:22Z',
    target: ['all'],
    documents: [
      {
        id: 'doc6-1',
        notificationId: '6',
        fileName: '更新说明文档_v2.0.pdf',
        filePath: '/uploads/documents/release-notes-v2.pdf',
        fileType: 'application/pdf',
        fileSize: 2411724,
        uploadedAt: '2025-11-21T18:27:22Z'
      },
      {
        id: 'doc6-2',
        notificationId: '6',
        fileName: '操作手册.docx',
        filePath: '/uploads/documents/user-guide.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 1895342,
        uploadedAt: '2025-11-21T18:27:22Z'
      }
    ]
  }
];

// 操作日志Mock数据
export const mockOperationLogs: OperationLog[] = [
  {
    id: 'log1',
    userId: 'admin',
    notificationId: '1',
    operation: 'create',
    details: '创建通知：数据社区平台使用指南V2.0发布',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'log2',
    userId: 'admin',
    notificationId: '1',
    operation: 'publish',
    details: '发布通知：数据社区平台使用指南V2.0发布',
    createdAt: '2024-01-15T10:05:00Z'
  },
  {
    id: 'log3',
    userId: 'admin',
    notificationId: '2',
    operation: 'create',
    details: '创建通知：新增数据可视化功能上线',
    createdAt: '2024-01-16T14:30:00Z'
  }
];

// Mock API服务类
export class NotificationMockService {
  // 获取通知列表
  static async getNotifications(params: NotificationListParams): Promise<NotificationListResponse> {
    const { page = 1, pageSize = 10, category, status, keyword, type } = params;
    
    let filteredNotifications = [...mockNotifications];
    
    // 分类筛选
    if (category) {
      filteredNotifications = filteredNotifications.filter(n => n.categoryId === category);
    }
    
    // 类型筛选
    if (type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === type);
    }

    // 状态筛选
    if (status) {
      filteredNotifications = filteredNotifications.filter(n => n.status === status);
    }
    
    // 关键词搜索
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredNotifications = filteredNotifications.filter(n => 
        n.title.toLowerCase().includes(lowerKeyword) || 
        n.content.toLowerCase().includes(lowerKeyword)
      );
    }
    
    // 分页
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const list = filteredNotifications.slice(start, end);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            list,
            total: filteredNotifications.length
          }
        });
      }, 300);
    });
  }
  
  // 获取单个通知
  static async getNotification(id: string): Promise<ApiResponse<Notification>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const notification = mockNotifications.find(n => n.id === id);
        if (notification) {
          resolve({
            success: true,
            data: notification
          });
        } else {
          resolve({
            success: false,
            message: '通知不存在'
          });
        }
      }, 200);
    });
  }
  
  // 创建通知
  static async createNotification(data: any): Promise<ApiResponse<Notification>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newNotification: Notification = {
          id: Date.now().toString(),
          ...data,
          status: 'draft',
          createdBy: 'admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          documents: []
        };
        
        mockNotifications.unshift(newNotification);
        
        resolve({
          success: true,
          data: newNotification
        });
      }, 500);
    });
  }
  
  // 更新通知
  static async updateNotification(id: string, data: any): Promise<ApiResponse<Notification>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockNotifications.findIndex(n => n.id === id);
        if (index !== -1) {
          mockNotifications[index] = {
            ...mockNotifications[index],
            ...data,
            updatedAt: new Date().toISOString()
          };
          
          resolve({
            success: true,
            data: mockNotifications[index]!
          });
        } else {
          resolve({
            success: false,
            message: '通知不存在'
          });
        }
      }, 400);
    });
  }
  
  // 删除通知
  static async deleteNotification(id: string): Promise<ApiResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = mockNotifications.findIndex(n => n.id === id);
        if (index !== -1) {
          mockNotifications.splice(index, 1);
          resolve({
            success: true
          });
        } else {
          resolve({
            success: false,
            message: '通知不存在'
          });
        }
      }, 300);
    });
  }
  
  // 获取分类列表
  static async getCategories(): Promise<ApiResponse<any[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: [], // 列表页不再直接使用这个 API，而是从常量获取
          message: 'success'
        });
      }, 200);
    });
  }
  
  // 文件上传
  static async uploadFile(file: File): Promise<ApiResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockFile = {
          id: Date.now().toString(),
          fileName: file.name,
          filePath: `/uploads/documents/${file.name}`,
          fileType: file.type,
          fileSize: file.size
        };
        
        resolve({
          success: true,
          data: mockFile
        });
      }, 1000);
    });
  }
  
  // 获取操作日志
  static async getOperationLogs(notificationId: string): Promise<ApiResponse<OperationLog[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const logs = mockOperationLogs.filter(log => log.notificationId === notificationId);
        resolve({
          success: true,
          data: logs
        });
      }, 200);
    });
  }
}
