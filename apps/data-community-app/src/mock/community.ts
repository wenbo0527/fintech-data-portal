/**
 * 社区资源管理系统 - Mock 数据
 */

import {
  ResourceCategory,
  NotificationType,
  DocumentStatus,
  UserRole,
  type ResourceCategoryModel,
  type TreeNode,
  type Document,
  type User,
  type CategoryStats,
  type HomeStats,
  type UserGroup
} from '@/types-dca/community'
import { mockNotifications } from './notification'

// Mock 用户组数据
export const mockUserGroups: UserGroup[] = [
  {
    id: 'group-1',
    name: '全体用户',
    notificationTypes: [NotificationType.ANNOUNCEMENT, NotificationType.ACTIVITY, NotificationType.UPDATE, NotificationType.POLICY_NOTICE, NotificationType.DATA_SERVICE, NotificationType.GENERAL],
    creatorId: 'user-1',
    creatorName: '系统管理员',
    memberCount: 150,
    members: [],
    remark: '系统预置组，包含所有注册用户',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'group-2',
    name: '数据分析师',
    notificationTypes: [NotificationType.DATA_SERVICE, NotificationType.UPDATE],
    creatorId: 'user-1',
    creatorName: '系统管理员',
    memberCount: 15,
    members: ['user-3'],
    remark: '专门负责数据分析的人员',
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-05T10:00:00Z'
  },
  {
    id: 'group-3',
    name: '核心开发组',
    notificationTypes: [NotificationType.UPDATE, NotificationType.GENERAL],
    creatorId: 'user-1',
    creatorName: '系统管理员',
    memberCount: 8,
    members: ['user-1'],
    remark: '负责平台核心功能开发的人员',
    createdAt: '2024-01-10T14:30:00Z',
    updatedAt: '2024-01-10T14:30:00Z'
  }
]

// Mock 用户数据
export const mockUsers: User[] = [
  {
    id: 'user-1',
    username: 'admin',
    email: 'admin@example.com',
    displayName: '系统管理员',
    avatar: '',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'system',
    lastLoginAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'user-2',
    username: 'editor',
    email: 'editor@example.com',
    displayName: '内容编辑员',
    avatar: '',
    role: UserRole.CONTENT_EDITOR,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    lastLoginAt: '2024-01-15T09:15:00Z'
  }
]

// Mock 分类数据
export const mockCategories: ResourceCategoryModel[] = [
  {
    id: 'cat-1',
    name: '政策制度',
    code: ResourceCategory.POLICY,
    description: '相关政策法规和制度文件',
    sortOrder: 1,
    isActive: true,
    icon: 'IconSafe',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1'
  },
  {
    id: 'cat-2',
    name: '实践案例',
    code: ResourceCategory.CASES,
    description: '优秀的数据应用实践案例分享',
    sortOrder: 2,
    isActive: true,
    icon: 'IconBulb',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1'
  },
  {
    id: 'cat-3',
    name: '操作指南',
    code: ResourceCategory.GUIDE,
    description: '详细的操作手册和使用教程',
    sortOrder: 3,
    isActive: true,
    icon: 'IconBook',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1'
  },
  {
    id: 'cat-4',
    name: '社区动态',
    code: ResourceCategory.NEWS,
    description: '最新的社区公告、活动和技术分享',
    sortOrder: 4,
    isActive: true,
    icon: 'IconNotification',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1'
  }
]

// Mock 树节点数据
export const mockTreeNodes: TreeNode[] = [
  // 政策制度
  {
    id: 'tree-1',
    title: '政策制度',
    key: 'policy',
    categoryId: 'cat-1',
    sortOrder: 1,
    isLeaf: false,
    count: 15,
    icon: 'IconSafe',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    children: [
      {
        id: 'tree-1-1',
        title: '法律法规',
        key: 'policy-law',
        parentId: 'tree-1',
        categoryId: 'cat-1',
        sortOrder: 1,
        isLeaf: true,
        count: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      },
      {
        id: 'tree-1-2',
        title: '管理办法',
        key: 'policy-management',
        parentId: 'tree-1',
        categoryId: 'cat-1',
        sortOrder: 2,
        isLeaf: true,
        count: 6,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      },
      {
        id: 'tree-1-3',
        title: '标准规范',
        key: 'policy-standard',
        parentId: 'tree-1',
        categoryId: 'cat-1',
        sortOrder: 3,
        isLeaf: true,
        count: 4,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      }
    ]
  },
  // 实践案例
  {
    id: 'tree-2',
    title: '实践案例',
    key: 'cases',
    categoryId: 'cat-2',
    sortOrder: 2,
    isLeaf: false,
    count: 12,
    icon: 'IconBulb',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    children: [
      {
        id: 'tree-2-1',
        title: '数据分析',
        key: 'cases-analytics',
        parentId: 'tree-2',
        categoryId: 'cat-2',
        sortOrder: 1,
        isLeaf: true,
        count: 4,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      },
      {
        id: 'tree-2-2',
        title: '机器学习',
        key: 'cases-ml',
        parentId: 'tree-2',
        categoryId: 'cat-2',
        sortOrder: 2,
        isLeaf: true,
        count: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      },
      {
        id: 'tree-2-3',
        title: '数据可视化',
        key: 'cases-visualization',
        parentId: 'tree-2',
        categoryId: 'cat-2',
        sortOrder: 3,
        isLeaf: true,
        count: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      },
      {
        id: 'tree-2-4',
        title: '数据治理',
        key: 'cases-governance',
        parentId: 'tree-2',
        categoryId: 'cat-2',
        sortOrder: 4,
        isLeaf: true,
        count: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      }
    ]
  },
  // 操作指南
  {
    id: 'tree-3',
    title: '操作指南',
    key: 'guide',
    categoryId: 'cat-3',
    sortOrder: 3,
    isLeaf: false,
    count: 18,
    icon: 'IconBook',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    children: [
      {
        id: 'tree-3-1',
        title: '基础操作',
        key: 'guide-basic',
        parentId: 'tree-3',
        categoryId: 'cat-3',
        sortOrder: 1,
        isLeaf: true,
        count: 8,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      },
      {
        id: 'tree-3-2',
        title: '高级功能',
        key: 'guide-advanced',
        parentId: 'tree-3',
        categoryId: 'cat-3',
        sortOrder: 2,
        isLeaf: true,
        count: 6,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      },
      {
        id: 'tree-3-3',
        title: '故障排除',
        key: 'guide-troubleshooting',
        parentId: 'tree-3',
        categoryId: 'cat-3',
        sortOrder: 3,
        isLeaf: true,
        count: 4,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      }
    ]
  },
  // 社区动态
  {
    id: 'tree-4',
    title: '社区动态',
    key: 'news',
    categoryId: 'cat-4',
    sortOrder: 4,
    isLeaf: false,
    count: 8,
    icon: 'IconNotification',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    children: [
      {
        id: 'tree-4-1',
        title: '公告通知',
        key: 'news-announcement',
        parentId: 'tree-4',
        categoryId: 'cat-4',
        sortOrder: 1,
        isLeaf: true,
        count: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      },
      {
        id: 'tree-4-2',
        title: '活动资讯',
        key: 'news-activity',
        parentId: 'tree-4',
        categoryId: 'cat-4',
        sortOrder: 2,
        isLeaf: true,
        count: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      },
      {
        id: 'tree-4-3',
        title: '更新日志',
        key: 'news-update',
        parentId: 'tree-4',
        categoryId: 'cat-4',
        sortOrder: 3,
        isLeaf: true,
        count: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-1'
      }
    ]
  }
]

// Mock 文档数据
export const mockDocuments: Document[] = [
  // 政策制度文档
  {
    id: 'doc-1',
    title: '数据安全管理办法',
    description: '规范数据收集、存储、使用和销毁的安全管理制度',
    fileName: '数据安全管理办法.pdf',
    fileUrl: '/mock-pdf.pdf',
    fileSize: '2.5MB',
    mimeType: 'application/pdf',
    categoryId: 'cat-1',
    treeNodeId: 'tree-1-2',
    author: '张三',
    publishTime: '2024-01-10T10:00:00Z',
    status: DocumentStatus.PUBLISHED,
    views: 1250,
    downloads: 85,
    tags: ['数据安全', '管理制度'],
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
    createdBy: 'user-1'
  },
  // 实践案例文档
  {
    id: 'doc-2',
    title: '客户画像分析实践',
    description: '基于大数据技术构建客户画像系统的成功案例分享',
    fileName: '客户画像分析实践.pdf',
    fileUrl: '/mock-pdf.pdf',
    fileSize: '3.2MB',
    mimeType: 'application/pdf',
    categoryId: 'cat-2',
    treeNodeId: 'tree-2-1',
    author: '李四',
    publishTime: '2024-01-12T14:30:00Z',
    status: DocumentStatus.PUBLISHED,
    views: 980,
    downloads: 65,
    tags: ['客户画像', '数据分析', '大数据'],
    createdAt: '2024-01-12T14:30:00Z',
    updatedAt: '2024-01-12T14:30:00Z',
    createdBy: 'user-2'
  }
]

// Mock 统计数据
export const mockCategoryStats: CategoryStats[] = [
  {
    categoryId: 'cat-1',
    categoryName: '政策制度',
    documentCount: 15,
    notificationCount: 2,
    totalViews: 5420,
    recentUpdates: 3
  },
  {
    categoryId: 'cat-2',
    categoryName: '实践案例',
    documentCount: 12,
    notificationCount: 1,
    totalViews: 3890,
    recentUpdates: 2
  },
  {
    categoryId: 'cat-3',
    categoryName: '操作指南',
    documentCount: 18,
    notificationCount: 0,
    totalViews: 7250,
    recentUpdates: 5
  },
  {
    categoryId: 'cat-4',
    categoryName: '社区动态',
    documentCount: 8,
    notificationCount: 6,
    totalViews: 4680,
    recentUpdates: 4
  }
]

export const mockHomeStats: HomeStats = {
  totalDocuments: 53,
  totalNotifications: 9,
  totalViews: 21240,
  categoryStats: mockCategoryStats,
  recentDocuments: mockDocuments.slice(0, 5),
  recentNotifications: mockNotifications.slice(0, 3)
}

// 导出所有 Mock 数据
export default {
  users: mockUsers,
  categories: mockCategories,
  treeNodes: mockTreeNodes,
  documents: mockDocuments,
  notifications: mockNotifications,
  categoryStats: mockCategoryStats,
  homeStats: mockHomeStats
}