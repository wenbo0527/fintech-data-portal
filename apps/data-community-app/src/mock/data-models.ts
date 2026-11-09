import type { MockMethod } from 'vite-plugin-mock';
import Mock from 'mockjs';

// 数据模型状态枚举
export enum DataModelStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

// 语言类型枚举
export enum LanguageType {
  SQL = 'sql',
  PYTHON = 'python'
}

// 使用场景枚举
export enum UseCase {
  DATA_ANALYSIS = 'data_analysis',
  DATA_CLEANING = 'data_cleaning',
  FEATURE_ENGINEERING = 'feature_engineering',
  MODEL_TRAINING = 'model_training',
  REPORT_GENERATION = 'report_generation',
  DATA_VALIDATION = 'data_validation',
  EXTERNAL_DATA_SAMPLE = 'external_data_sample',
  VALIDATION_RULE = 'validation_rule'
}

// 数据模型接口定义
export interface DataModel {
  id: string;
  name: string;
  useCase: UseCase;
  languageType: LanguageType;
  manager: string;
  status: DataModelStatus;
  version: string;
  description: string;
  code: string;
  parameters: ModelParameter[];
  executionConfig: ExecutionConfig;
  createdAt: string;
  updatedAt: string;
  executionHistory: ExecutionRecord[];
  executionStats: ExecutionStats;
}

// 模型参数接口
export interface ModelParameter {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  defaultValue: any;
  required: boolean;
  description: string;
}

// 执行配置接口
export interface ExecutionConfig {
  timeout: number; // 超时时间(秒)
  maxMemory: number; // 最大内存(MB)
}

// 执行记录接口
export interface ExecutionRecord {
  id: string;
  executedAt: string;
  status: 'success' | 'failed' | 'running';
  duration: number; // 执行时长(秒)
  resultRows: number;
  errorMessage?: string;
  executedBy: string;
}

// 执行统计接口
export interface ExecutionStats {
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  lastExecutedAt: string;
}

// 生成mock数据
const generateMockDataModels = (): DataModel[] => {
  return [
    {
      id: 'dm_001',
      name: '用户行为分析模型',
      useCase: UseCase.DATA_ANALYSIS,
      languageType: LanguageType.SQL,
      manager: '张三',
      status: DataModelStatus.ACTIVE,
      version: 'v1.2.0',
      description: '分析用户在平台上的行为模式，包括访问频率、停留时间、转化路径等关键指标',
      code: `SELECT 
    user_id,
    COUNT(*) as visit_count,
    AVG(session_duration) as avg_duration,
    SUM(page_views) as total_page_views,
    MAX(last_visit_date) as last_visit
FROM user_behavior_log 
WHERE visit_date >= '{start_date}'
    AND visit_date <= '{end_date}'
GROUP BY user_id
HAVING visit_count >= {min_visits}
ORDER BY total_page_views DESC
LIMIT {limit};`,
      parameters: [
        {
          id: 'p1',
          name: 'start_date',
          type: 'date',
          defaultValue: '2024-01-01',
          required: true,
          description: '分析开始日期'
        },
        {
          id: 'p2',
          name: 'end_date',
          type: 'date',
          defaultValue: '2024-12-31',
          required: true,
          description: '分析结束日期'
        },
        {
          id: 'p3',
          name: 'min_visits',
          type: 'number',
          defaultValue: 5,
          required: false,
          description: '最小访问次数过滤条件'
        },
        {
          id: 'p4',
          name: 'limit',
          type: 'number',
          defaultValue: 1000,
          required: false,
          description: '返回结果数量限制'
        }
      ],
      executionConfig: {
        timeout: 300,
        maxMemory: 2048
      },
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-03-20T14:45:00Z',
      executionHistory: [
        {
          id: 'exec_001',
          executedAt: '2024-03-20T14:45:00Z',
          status: 'success',
          duration: 45,
          resultRows: 1250,
          executedBy: '李四'
        },
        {
          id: 'exec_002',
          executedAt: '2024-03-19T09:20:00Z',
          status: 'success',
          duration: 52,
          resultRows: 1180,
          executedBy: '张三'
        }
      ],
      executionStats: {
        totalExecutions: 45,
        successRate: 95.6,
        avgDuration: 48.5,
        lastExecutedAt: '2024-03-20T14:45:00Z'
      }
    },
    {
      id: 'dm_002',
      name: '数据清洗处理脚本',
      useCase: UseCase.DATA_CLEANING,
      languageType: LanguageType.PYTHON,
      manager: '王五',
      status: DataModelStatus.ACTIVE,
      version: 'v2.1.0',
      description: '对原始数据进行清洗和预处理，包括缺失值处理、异常值检测、数据格式标准化等',
      code: `import pandas as pd
import numpy as np
from datetime import datetime

def clean_data(input_file, output_file, missing_threshold=0.3):
    """
    数据清洗主函数
    
    Args:
        input_file: 输入文件路径
        output_file: 输出文件路径
        missing_threshold: 缺失值阈值
    """
    # 读取数据
    df = pd.read_csv(input_file)
    
    # 删除缺失值过多的列
    missing_ratio = df.isnull().sum() / len(df)
    df = df.drop(columns=missing_ratio[missing_ratio > missing_threshold].index)
    
    # 处理数值型缺失值
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
    
    # 处理分类型缺失值
    categorical_cols = df.select_dtypes(include=['object']).columns
    df[categorical_cols] = df[categorical_cols].fillna(df[categorical_cols].mode().iloc[0])
    
    # 异常值检测和处理
    for col in numeric_cols:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        df[col] = df[col].clip(lower_bound, upper_bound)
    
    # 保存清洗后的数据
    df.to_csv(output_file, index=False)
    
    return {
        'total_rows': len(df),
        'total_columns': len(df.columns),
        'cleaned_at': datetime.now().isoformat()
    }

# 执行清洗
if __name__ == "__main__":
    result = clean_data('{input_file}', '{output_file}', {missing_threshold})
    print(f"数据清洗完成: {result}")`,
      parameters: [
        {
          id: 'p1',
          name: 'input_file',
          type: 'string',
          defaultValue: '/data/raw/input.csv',
          required: true,
          description: '输入数据文件路径'
        },
        {
          id: 'p2',
          name: 'output_file',
          type: 'string',
          defaultValue: '/data/cleaned/output.csv',
          required: true,
          description: '输出数据文件路径'
        },
        {
          id: 'p3',
          name: 'missing_threshold',
          type: 'number',
          defaultValue: 0.3,
          required: false,
          description: '缺失值阈值(0-1之间)'
        }
      ],
      executionConfig: {
        timeout: 600,
        maxMemory: 4096
      },
      createdAt: '2024-02-10T08:15:00Z',
      updatedAt: '2024-03-18T16:30:00Z',
      executionHistory: [
        {
          id: 'exec_003',
          executedAt: '2024-03-18T16:30:00Z',
          status: 'success',
          duration: 120,
          resultRows: 50000,
          executedBy: '王五'
        }
      ],
      executionStats: {
        totalExecutions: 28,
        successRate: 92.9,
        avgDuration: 115.2,
        lastExecutedAt: '2024-03-18T16:30:00Z'
      }
    },
    {
      id: 'dm_003',
      name: '特征工程模型',
      useCase: UseCase.FEATURE_ENGINEERING,
      languageType: LanguageType.SQL,
      manager: '赵六',
      status: DataModelStatus.DRAFT,
      version: 'v0.8.0',
      description: '从原始数据中提取和构造机器学习所需的特征特征',
      code: `-- 特征工程SQL脚本
WITH user_features AS (
    SELECT 
        user_id,
        -- 基础特征
        age,
        gender,
        city,
        -- 行为特征
        COUNT(DISTINCT order_id) as order_count_30d,
        SUM(order_amount) as total_amount_30d,
        AVG(order_amount) as avg_order_amount,
        -- 时间特征
        EXTRACT(HOUR FROM first_order_time) as first_order_hour,
        EXTRACT(DOW FROM first_order_time) as first_order_dow,
        -- 偏好特征
        MODE() WITHIN GROUP (ORDER BY category) as preferred_category
    FROM user_orders 
    WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY user_id, age, gender, city, first_order_time
),
rfm_features AS (
    SELECT 
        user_id,
        -- RFM特征
        CURRENT_DATE - MAX(order_date) as recency,
        COUNT(*) as frequency,
        SUM(order_amount) as monetary
    FROM user_orders
    GROUP BY user_id
)
SELECT 
    uf.*,
    rf.recency,
    rf.frequency,
    rf.monetary,
    -- 组合特征
    CASE 
        WHEN rf.recency <= 7 AND rf.frequency >= 5 THEN 'high_value'
        WHEN rf.recency <= 30 AND rf.frequency >= 2 THEN 'medium_value'
        ELSE 'low_value'
    END as user_segment
FROM user_features uf
JOIN rfm_features rf ON uf.user_id = rf.user_id;`,
      parameters: [],
      executionConfig: {
        timeout: 180,
        maxMemory: 1024
      },
      createdAt: '2024-03-01T12:00:00Z',
      updatedAt: '2024-03-15T10:20:00Z',
      executionHistory: [],
      executionStats: {
        totalExecutions: 0,
        successRate: 0,
        avgDuration: 0,
        lastExecutedAt: ''
      }
    },
    {
      id: 'dm_004',
      name: '月度营收报表生成',
      useCase: UseCase.REPORT_GENERATION,
      languageType: LanguageType.SQL,
      manager: '李四',
      status: DataModelStatus.ACTIVE,
      version: 'v1.5.0',
      description: '每月自动汇总各业务线营收数据，生成财务所需的基础报表',
      code: `SELECT 
    department_id,
    business_line,
    SUM(revenue) as total_revenue,
    SUM(cost) as total_cost,
    (SUM(revenue) - SUM(cost)) as gross_profit,
    ((SUM(revenue) - SUM(cost)) / NULLIF(SUM(revenue), 0)) * 100 as profit_margin
FROM financial_records 
WHERE record_month = '{report_month}'
GROUP BY department_id, business_line
ORDER BY total_revenue DESC;`,
      parameters: [
        {
          id: 'p1',
          name: 'report_month',
          type: 'string',
          defaultValue: '2024-02',
          required: true,
          description: '报表月份(YYYY-MM)'
        }
      ],
      executionConfig: {
        timeout: 120,
        maxMemory: 1024
      },
      createdAt: '2023-11-05T09:00:00Z',
      updatedAt: '2024-03-01T10:00:00Z',
      executionHistory: [
        {
          id: 'exec_004',
          executedAt: '2024-03-01T10:05:00Z',
          status: 'success',
          duration: 15,
          resultRows: 45,
          executedBy: '李四'
        }
      ],
      executionStats: {
        totalExecutions: 12,
        successRate: 100,
        avgDuration: 14.5,
        lastExecutedAt: '2024-03-01T10:05:00Z'
      }
    },
    {
      id: 'dm_005',
      name: '用户流失预警模型',
      useCase: UseCase.MODEL_TRAINING,
      languageType: LanguageType.PYTHON,
      manager: '钱七',
      status: DataModelStatus.ACTIVE,
      version: 'v3.0.1',
      description: '基于XGBoost算法，预测未来30天内极可能流失的高价值用户',
      code: `import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

def train_churn_model(data_path, model_save_path):
    # 加载特征数据
    df = pd.read_csv(data_path)
    
    # 划分特征和标签
    X = df.drop(columns=['user_id', 'is_churn'])
    y = df['is_churn']
    
    # 划分训练集和验证集
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 训练XGBoost模型
    model = xgb.XGBClassifier(
        max_depth={max_depth},
        learning_rate={learning_rate},
        n_estimators={n_estimators},
        objective='binary:logistic',
        eval_metric='auc'
    )
    
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], early_stopping_rounds=10, verbose=False)
    
    # 评估
    preds = model.predict(X_val)
    auc = roc_auc_score(y_val, model.predict_proba(X_val)[:, 1])
    
    # 保存模型
    model.save_model(model_save_path)
    
    return {"accuracy": accuracy_score(y_val, preds), "auc": auc}

if __name__ == "__main__":
    result = train_churn_model('{input_data}', '{output_model}')
    print(f"模型训练完成, 评估结果: {result}")`,
      parameters: [
        {
          id: 'p1',
          name: 'input_data',
          type: 'string',
          defaultValue: '/data/features/user_features.csv',
          required: true,
          description: '输入特征数据路径'
        },
        {
          id: 'p2',
          name: 'output_model',
          type: 'string',
          defaultValue: '/models/churn_xgb.model',
          required: true,
          description: '模型保存路径'
        },
        {
          id: 'p3',
          name: 'max_depth',
          type: 'number',
          defaultValue: 5,
          required: false,
          description: '树的最大深度'
        },
        {
          id: 'p4',
          name: 'learning_rate',
          type: 'number',
          defaultValue: 0.1,
          required: false,
          description: '学习率'
        },
        {
          id: 'p5',
          name: 'n_estimators',
          type: 'number',
          defaultValue: 100,
          required: false,
          description: '树的数量'
        }
      ],
      executionConfig: {
        timeout: 3600,
        maxMemory: 8192
      },
      createdAt: '2023-08-15T14:20:00Z',
      updatedAt: '2024-03-25T09:15:00Z',
      executionHistory: [
        {
          id: 'exec_005',
          executedAt: '2024-03-25T09:15:00Z',
          status: 'success',
          duration: 1850,
          resultRows: 0,
          executedBy: '钱七'
        }
      ],
      executionStats: {
        totalExecutions: 8,
        successRate: 87.5,
        avgDuration: 1900.2,
        lastExecutedAt: '2024-03-25T09:15:00Z'
      }
    },
    {
      id: 'dm_006',
      name: '身份证号合规性校验',
      useCase: UseCase.DATA_VALIDATION,
      languageType: LanguageType.SQL,
      manager: '孙八',
      status: DataModelStatus.INACTIVE,
      version: 'v1.0.0',
      description: '通过正则表达式校验系统中存储的身份证号码格式是否合规',
      code: `SELECT 
    user_id, 
    real_name, 
    id_card_no 
FROM user_info 
WHERE id_card_no !~ '^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[1-2]\\d|3[0-1])\\d{3}[0-9Xx]$'
LIMIT {limit};`,
      parameters: [
        {
          id: 'p1',
          name: 'limit',
          type: 'number',
          defaultValue: 500,
          required: false,
          description: '返回异常数据的最大条数'
        }
      ],
      executionConfig: {
        timeout: 60,
        maxMemory: 512
      },
      createdAt: '2023-05-10T11:00:00Z',
      updatedAt: '2023-10-20T16:00:00Z',
      executionHistory: [
        {
          id: 'exec_006',
          executedAt: '2023-10-20T16:00:00Z',
          status: 'success',
          duration: 12,
          resultRows: 34,
          executedBy: '孙八'
        }
      ],
      executionStats: {
        totalExecutions: 5,
        successRate: 100,
        avgDuration: 11.5,
        lastExecutedAt: '2023-10-20T16:00:00Z'
      }
    },
    {
      id: 'dm_007',
      name: '外部API数据采集样例',
      useCase: UseCase.EXTERNAL_DATA_SAMPLE,
      languageType: LanguageType.PYTHON,
      manager: '周九',
      status: DataModelStatus.ACTIVE,
      version: 'v1.1.0',
      description: '调用外部天气API接口获取指定城市的历史天气数据，用于补充内部业务数据的环境维度',
      code: `import requests
import json
import pandas as pd
from datetime import datetime

def fetch_weather_data(city_code, start_date, end_date, api_key):
    url = f"https://api.external-weather.com/v1/history"
    params = {
        "city": city_code,
        "start": start_date,
        "end": end_date,
        "key": api_key
    }
    
    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        df = pd.DataFrame(data['daily_records'])
        # 数据转换与入库逻辑(省略)
        return {"status": "success", "records_fetched": len(df)}
    else:
        raise Exception(f"API请求失败: {response.status_code}")

if __name__ == "__main__":
    res = fetch_weather_data('{city_code}', '{start_date}', '{end_date}', '{api_key}')
    print(res)`,
      parameters: [
        {
          id: 'p1',
          name: 'city_code',
          type: 'string',
          defaultValue: '101010100',
          required: true,
          description: '城市编码(默认北京)'
        },
        {
          id: 'p2',
          name: 'start_date',
          type: 'date',
          defaultValue: '2024-03-01',
          required: true,
          description: '开始日期'
        },
        {
          id: 'p3',
          name: 'end_date',
          type: 'date',
          defaultValue: '2024-03-07',
          required: true,
          description: '结束日期'
        },
        {
          id: 'p4',
          name: 'api_key',
          type: 'string',
          defaultValue: 'demo_key_12345',
          required: true,
          description: 'API授权密钥'
        }
      ],
      executionConfig: {
        timeout: 300,
        maxMemory: 1024
      },
      createdAt: '2024-01-20T13:45:00Z',
      updatedAt: '2024-03-22T10:30:00Z',
      executionHistory: [
        {
          id: 'exec_007',
          executedAt: '2024-03-22T10:30:00Z',
          status: 'success',
          duration: 5,
          resultRows: 7,
          executedBy: '周九'
        },
        {
          id: 'exec_008',
          executedAt: '2024-03-21T10:30:00Z',
          status: 'failed',
          duration: 2,
          resultRows: 0,
          errorMessage: 'API请求超时',
          executedBy: '系统定时任务'
        }
      ],
      executionStats: {
        totalExecutions: 60,
        successRate: 98.3,
        avgDuration: 4.2,
        lastExecutedAt: '2024-03-22T10:30:00Z'
      }
    },
    {
      id: 'dm_008',
      name: '交易金额异常监控规则',
      useCase: UseCase.VALIDATION_RULE,
      languageType: LanguageType.SQL,
      manager: '吴十',
      status: DataModelStatus.ARCHIVED,
      version: 'v1.0.0',
      description: '监控单笔交易金额超过阈值的记录（已归档，被实时风控系统替代）',
      code: `SELECT 
    transaction_id,
    user_id,
    amount,
    transaction_time,
    risk_level
FROM transaction_log
WHERE amount > {amount_threshold}
  AND transaction_time >= CURRENT_DATE - INTERVAL '1 day';`,
      parameters: [
        {
          id: 'p1',
          name: 'amount_threshold',
          type: 'number',
          defaultValue: 50000,
          required: true,
          description: '异常金额阈值'
        }
      ],
      executionConfig: {
        timeout: 60,
        maxMemory: 1024
      },
      createdAt: '2022-01-10T00:00:00Z',
      updatedAt: '2023-12-31T23:59:59Z',
      executionHistory: [],
      executionStats: {
        totalExecutions: 720,
        successRate: 99.8,
        avgDuration: 8.5,
        lastExecutedAt: '2023-12-31T23:00:00Z'
      }
    },
    {
      id: 'dm_009',
      name: '商品推荐协同过滤算法',
      useCase: UseCase.MODEL_TRAINING,
      languageType: LanguageType.PYTHON,
      manager: '郑十一',
      status: DataModelStatus.DRAFT,
      version: 'v0.5.0',
      description: '基于用户历史购买行为，使用矩阵分解（SVD）训练商品推荐模型',
      code: `import pandas as pd
from surprise import Dataset, Reader, SVD
from surprise.model_selection import cross_validate

def train_recommender(ratings_file):
    # 加载数据
    df = pd.read_csv(ratings_file)
    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(df[['user_id', 'item_id', 'rating']], reader)
    
    # 算法选择
    algo = SVD(n_factors={n_factors}, n_epochs={n_epochs}, lr_all={lr_all})
    
    # 交叉验证评估
    results = cross_validate(algo, data, measures=['RMSE', 'MAE'], cv=5, verbose=True)
    
    # 全量数据训练
    trainset = data.build_full_trainset()
    algo.fit(trainset)
    
    return {"rmse": results['test_rmse'].mean()}

if __name__ == "__main__":
    train_recommender('{ratings_file}')`,
      parameters: [
        {
          id: 'p1',
          name: 'ratings_file',
          type: 'string',
          defaultValue: '/data/ratings.csv',
          required: true,
          description: '评分数据路径'
        },
        {
          id: 'p2',
          name: 'n_factors',
          type: 'number',
          defaultValue: 100,
          required: false,
          description: '隐因子数量'
        },
        {
          id: 'p3',
          name: 'n_epochs',
          type: 'number',
          defaultValue: 20,
          required: false,
          description: '迭代次数'
        },
        {
          id: 'p4',
          name: 'lr_all',
          type: 'number',
          defaultValue: 0.005,
          required: false,
          description: '学习率'
        }
      ],
      executionConfig: {
        timeout: 7200,
        maxMemory: 16384
      },
      createdAt: '2024-03-20T09:00:00Z',
      updatedAt: '2024-03-21T15:00:00Z',
      executionHistory: [],
      executionStats: {
        totalExecutions: 0,
        successRate: 0,
        avgDuration: 0,
        lastExecutedAt: ''
      }
    }
  ];
};

// Mock API 配置
const mockApiConfig = [
  // 获取数据模型列表
  {
    url: '/api/data-models',
    method: 'get',
    response: ({ query }: any) => {
      const { page = 1, pageSize = 10, name, useCase, status, languageType } = query;
      let models = generateMockDataModels();
      
      // 过滤
      if (name) {
        models = models.filter(model => model.name.includes(name));
      }
      if (useCase) {
        models = models.filter(model => model.useCase === useCase);
      }
      if (status) {
        models = models.filter(model => model.status === status);
      }
      if (languageType) {
        models = models.filter(model => model.languageType === languageType);
      }
      
      // 分页
      const total = models.length;
      const start = (page - 1) * pageSize;
      const end = start + parseInt(pageSize, 10);
      const list = models.slice(start, end);
      
      return {
        code: 200,
        message: 'success',
        data: {
          list,
          total,
          page: parseInt(page, 10),
          pageSize: parseInt(pageSize, 10)
        }
      };
    }
  },
  
  // 获取数据模型详情
  {
    url: '/api/data-models/:id',
    method: 'get',
    response: ({ url }: any) => {
      const id = url.split('/').pop();
      const models = generateMockDataModels();
      const model = models.find(m => m.id === id);
      
      if (!model) {
        return {
          code: 404,
          message: '数据模型不存在'
        };
      }
      
      return {
        code: 200,
        message: 'success',
        data: model
      };
    }
  },
  
  // 创建数据模型
  {
    url: '/api/data-models',
    method: 'post',
    response: ({ body }: any) => {
      const newModel = {
        id: `dm_${Date.now()}`,
        ...body,
        version: 'v1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        executionHistory: [],
        executionStats: {
          totalExecutions: 0,
          successRate: 0,
          avgDuration: 0,
          lastExecutedAt: ''
        }
      };
      
      return {
        code: 200,
        message: '创建成功',
        data: newModel
      };
    }
  },
  
  // 更新数据模型
  {
    url: '/api/data-models/:id',
    method: 'put',
    response: ({ url, body }: any) => {
      const id = url.split('/').pop();
      const models = generateMockDataModels();
      const model = models.find(m => m.id === id);
      
      if (!model) {
        return {
          code: 404,
          message: '数据模型不存在'
        };
      }
      
      const updatedModel = {
        ...model,
        ...body,
        updatedAt: new Date().toISOString()
      };
      
      return {
        code: 200,
        message: '更新成功',
        data: updatedModel
      };
    }
  },
  
  // 删除数据模型
  {
    url: '/api/data-models/:id',
    method: 'delete',
    response: ({ url }: any) => {
      const id = url.split('/').pop();
      
      return {
        code: 200,
        message: '删除成功'
      };
    }
  },
  
  // 复制数据模型
  {
    url: '/api/data-models/:id/copy',
    method: 'post',
    response: ({ url }: any) => {
      const id = url.split('/').pop();
      const models = generateMockDataModels();
      const model = models.find(m => m.id === id);
      
      if (!model) {
        return {
          code: 404,
          message: '数据模型不存在'
        };
      }
      
      const copiedModel = {
        ...model,
        id: `dm_${Date.now()}`,
        name: `${model.name}_副本`,
        status: DataModelStatus.DRAFT,
        version: 'v1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        executionHistory: [],
        executionStats: {
          totalExecutions: 0,
          successRate: 0,
          avgDuration: 0,
          lastExecutedAt: ''
        }
      };
      
      return {
        code: 200,
        message: '复制成功',
        data: copiedModel
      };
    }
  },
  
  // 执行数据模型
  {
    url: '/api/data-models/:id/execute',
    method: 'post',
    response: ({ url, body }: any) => {
      const id = url.split('/').pop();
      const { parameters = {} } = body;
      
      // 模拟执行过程
      const executionResult = {
        id: `exec_${Date.now()}`,
        modelId: id,
        status: 'success',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30000).toISOString(),
        duration: 30,
        resultRows: Mock.Random.integer(100, 10000),
        parameters,
        result: {
          columns: ['user_id', 'visit_count', 'avg_duration', 'total_page_views'],
          data: Mock.mock({
            'list|10': [{
              'user_id': '@id',
              'visit_count': '@integer(1, 100)',
              'avg_duration': '@float(10, 300, 2, 2)',
              'total_page_views': '@integer(5, 500)'
            }]
          }).list
        }
      };
      
      return {
        code: 200,
        message: '执行成功',
        data: executionResult
      };
    }
  },
  
  // 获取执行历史
  {
    url: '/api/data-models/:id/executions',
    method: 'get',
    response: ({ url, query }: any) => {
      const id = url.split('/')[3]; // /api/data-models/:id/executions
      const { page = 1, pageSize = 10 } = query;
      
      const models = generateMockDataModels();
      const model = models.find(m => m.id === id);
      
      if (!model) {
        return {
          code: 404,
          message: '数据模型不存在'
        };
      }
      
      const total = model.executionHistory.length;
      const start = (page - 1) * pageSize;
      const end = start + parseInt(pageSize, 10);
      const list = model.executionHistory.slice(start, end);
      
      return {
        code: 200,
        message: 'success',
        data: {
          list,
          total,
          page: parseInt(page, 10),
          pageSize: parseInt(pageSize, 10)
        }
      };
    }
  }
] as MockMethod[];

// 导出 mock 数据
export const mockDataModels = generateMockDataModels();

// 导出 mock API 配置
export default mockApiConfig;