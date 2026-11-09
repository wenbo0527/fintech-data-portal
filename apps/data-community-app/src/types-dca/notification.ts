// 通知管理系统类型定义

export interface Notification {
  id: string;
  title: string;
  type: string; // 二级分类
  target?: string[];
  dataAssets?: string[];
  content: string;
  categoryId: string; // 一级分类
  status: NotificationStatus;
  author?: string;
  views?: number;
  isSticky?: boolean;
  isPublic?: boolean;
  allowComments?: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  documents?: NotificationDocument[];
  serviceType?: string;
  targetTable?: string;
  summary?: string;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface NotificationDocument {
  id: string;
  notificationId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface OperationLog {
  id: string;
  userId: string;
  notificationId: string;
  operation: string;
  details: string;
  createdAt: string;
}

export type NotificationStatus = 'draft' | 'published' | 'archived';

export interface NotificationListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  type?: string;
  status?: NotificationStatus;
  keyword?: string;
}

export interface NotificationListResponse {
  success: boolean;
  data: {
    list: Notification[];
    total: number;
  };
}

export interface CreateNotificationRequest {
  title: string;
  content: string;
  categoryId: string;
  publishAt?: string;
}

export interface UpdateNotificationRequest {
  title?: string;
  content?: string;
  categoryId?: string;
  status?: NotificationStatus;
  publishAt?: string;
}

export interface FileUploadResponse {
  success: boolean;
  data: {
    id: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

// 表单验证规则
export interface NotificationFormRules {
  title: Array<{
    required?: boolean;
    message: string;
    trigger?: string;
  }>;
  content: Array<{
    required?: boolean;
    message: string;
    trigger?: string;
  }>;
  categoryId: Array<{
    required?: boolean;
    message: string;
    trigger?: string;
  }>;
}

// 分页参数
export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showTotal: boolean;
  showJumper: boolean;
  showPageSize: boolean;
}

// 表格列配置
export interface TableColumn {
  title: string;
  dataIndex: string;
  key?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  ellipsis?: boolean;
  sortable?: boolean;
}