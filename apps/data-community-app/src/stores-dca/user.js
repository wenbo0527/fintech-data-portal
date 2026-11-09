import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 用户基本信息
  const userInfo = ref({
    id: null,
    name: '张三',
    department: 'risk', // risk, marketing, data
    role: 'user',
    avatar: null,
    email: null,
    phone: null,
    joinDate: null
  })

  // 是否为新用户
  const isNewUser = ref(false)

  // 用户权限信息
  const permissions = ref([])

  // 用户偏好设置
  const preferences = ref({
    theme: 'light',
    language: 'zh-CN',
    notifications: true
  })

  // 计算属性：部门显示名称
  const departmentName = computed(() => {
    const departmentMap = {
      'risk': '风险管理部',
      'marketing': '市场营销部',
      'data': '数据分析部'
    }
    return departmentMap[userInfo.value.department] || '未知部门'
  })

  // 计算属性：用户完整信息
  const fullUserInfo = computed(() => ({
    ...userInfo.value,
    departmentName: departmentName.value,
    isNewUser: isNewUser.value
  }))

  // 设置用户信息
  const setUserInfo = (info) => {
    userInfo.value = { ...userInfo.value, ...info }
  }

  // 设置用户部门
  const setUserDepartment = (department) => {
    if (['risk', 'marketing', 'data'].includes(department)) {
      userInfo.value.department = department
    }
  }

  // 检查用户角色
  const checkUserRole = async () => {
    try {
      // 模拟异步检查用户角色
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 这里可以添加实际的用户角色检查逻辑
      // 例如从 localStorage 或 API 获取用户信息
      const savedUserInfo = localStorage.getItem('userInfo')
      if (savedUserInfo) {
        const parsed = JSON.parse(savedUserInfo)
        setUserInfo(parsed)
        isNewUser.value = parsed.isNewUser || false
      } else {
        // 如果没有保存的用户信息，则认为是新用户
        isNewUser.value = true
      }
      
      return isNewUser.value
    } catch (error) {

      return false
    }
  }

  // 设置新用户状态
  const setNewUserStatus = (status) => {
    isNewUser.value = status
    // 保存到本地存储
    const currentUserInfo = { ...userInfo.value, isNewUser: status }
    localStorage.setItem('userInfo', JSON.stringify(currentUserInfo))
  }

  // 更新用户权限
  const setPermissions = (newPermissions) => {
    permissions.value = newPermissions
  }

  const computeEffectivePermissions = () => {
    const result = new Set(permissions.value || [])
    try {
      const dataGrants = JSON.parse(localStorage.getItem('grants:data') || '[]')
      const appGrants = JSON.parse(localStorage.getItem('grants:app') || '[]')
      const roleDeptBindings = JSON.parse(localStorage.getItem('roles:deptBindings') || '{}')
      const roleDeptAssignments = JSON.parse(localStorage.getItem('roles:deptAssignments') || '{}')
      const dept = userInfo.value.department
      dataGrants.forEach(g => {
        if (g.subjectType === 'department' && g.subject === dept) {
          result.add('perm.data.manage')
        }
        if (g.subjectType === 'user' && (g.subject === 'zhangsan' && userInfo.value.name === '张三')) {
          result.add('perm.data.manage')
        }
        const assignList = roleDeptAssignments[g.subject] || []
        const bound = [] // 修复 bound 未定义的问题
        const mergedDept = Array.from(new Set([...(bound || []), ...(assignList || [])]))
        if (mergedDept.includes(dept)) {
          result.add('perm.data.manage')
        }
      })
      appGrants.forEach(g => {
        if (g.subjectType === 'department' && g.subject === dept) {
          result.add('perm.app.manage')
        }
        if (g.subjectType === 'user' && (g.subject === 'zhangsan' && userInfo.value.name === '张三')) {
          result.add('perm.app.manage')
        }
        const assignList = roleDeptAssignments[g.subject] || []
        const bound = [] // 修复 bound 未定义的问题
        const mergedDept = Array.from(new Set([...(bound || []), ...(assignList || [])]))
        if (mergedDept.includes(dept)) {
          result.add('perm.app.manage')
        }
      })
    } catch (e) {}
    permissions.value = Array.from(result)
  }

  // 检查用户是否有特定权限
  const hasPermission = (permission) => {
    return permissions.value.includes(permission)
  }

  // 更新用户偏好设置
  const updatePreferences = (newPreferences) => {
    preferences.value = { ...preferences.value, ...newPreferences }
    // 保存到本地存储
    localStorage.setItem('userPreferences', JSON.stringify(preferences.value))
  }

  // 登录用户
  const login = async (credentials) => {
    try {
      // 模拟登录API调用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 设置用户信息（这里使用模拟数据）
      const mockUserInfo = {
        id: 1,
        name: credentials.username || '张三',
        department: 'risk',
        role: 'user',
        email: credentials.email || 'zhangsan@company.com',
        joinDate: new Date().toISOString()
      }
      
      setUserInfo(mockUserInfo)
      setNewUserStatus(false)
      
      // 保存登录状态
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userInfo', JSON.stringify(mockUserInfo))
      
      return { success: true, user: mockUserInfo }
    } catch (error) {

      return { success: false, error: error.message }
    }
  }

  // 登出用户
  const logout = () => {
    // 清空用户信息
    userInfo.value = {
      id: null,
      name: '',
      department: 'risk',
      role: 'user',
      avatar: null,
      email: null,
      phone: null,
      joinDate: null
    }
    isNewUser.value = false
    permissions.value = []
    
    // 清除本地存储
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('userPreferences')
  }

  // 初始化用户数据
  const initializeUser = async () => {
    try {
      // 从本地存储恢复用户偏好设置
      const savedPreferences = localStorage.getItem('userPreferences')
      if (savedPreferences) {
        preferences.value = JSON.parse(savedPreferences)
      }
      
      // 检查登录状态
      const isLoggedIn = localStorage.getItem('isLoggedIn')
      if (isLoggedIn === 'true') {
        await checkUserRole()
      }
      computeEffectivePermissions()
    } catch (error) {

    }
  }

  return {
    // 状态
    userInfo,
    isNewUser,
    permissions,
    preferences,
    
    // 计算属性
    departmentName,
    fullUserInfo,
    
    // 方法
    setUserInfo,
    setUserDepartment,
    checkUserRole,
    setNewUserStatus,
    setPermissions,
    computeEffectivePermissions,
    hasPermission,
    updatePreferences,
    login,
    logout,
    initializeUser
  }
})
