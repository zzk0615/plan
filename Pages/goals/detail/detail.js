// pages/goals/detail/detail.js
Page({
  data: {
    goal: null,
    loading: true,
    formatDate: '',
    showMenu: false,
    tasks: [],
    completedTasksCount: 0,
    totalTasksCount: 0,
    progressPercentage: 0,
    remainingDays: 0
  },

  onLoad(options) {
    // 获取目标ID
    const { id } = options;
    if (id) {
      this.loadGoalDetail(id);
    } else {
      wx.showToast({
        title: '目标不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 加载目标详情
  loadGoalDetail(id) {
    this.setData({ loading: true });
    
    // 从本地存储获取目标数据
    const goals = wx.getStorageSync('goals') || [];
    const goal = goals.find(item => item.id === id);
    
    if (goal) {
      // 确保有description字段
      if (typeof goal.description === 'undefined') {
        goal.description = '';
      }
      
      // 格式化日期
      let formatDate = '';
      if (goal.startDate && goal.endDate) {
        formatDate = `${goal.startDate} ~ ${goal.endDate}`;
      }
      
      // 确保目标有tasks属性
      if (!goal.tasks) {
        goal.tasks = [];
      }
      
      // 计算任务统计数据
      this.calculateTaskStats(goal);
      
      this.setData({
        goal,
        formatDate,
        tasks: goal.tasks || [],
        loading: false
      });
    } else {
      wx.showToast({
        title: '目标不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  // 计算任务统计数据
  calculateTaskStats(goal) {
    const tasks = goal.tasks || [];
    const totalTasksCount = tasks.length;
    const completedTasksCount = tasks.filter(task => task.completed).length;
    
    // 计算进度百分比
    let progressPercentage = 0;
    if (totalTasksCount > 0) {
      progressPercentage = Math.round((completedTasksCount / totalTasksCount) * 100);
    }
    
    // 计算剩余天数
    let remainingDays = 0;
    if (goal.endDate) {
      const endDate = new Date(goal.endDate);
      const today = new Date();
      const diffTime = endDate - today;
      remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      remainingDays = remainingDays > 0 ? remainingDays : 0;
    }
    
    this.setData({
      totalTasksCount,
      completedTasksCount,
      progressPercentage,
      remainingDays
    });
  },

  // 完成目标
  completeGoal() {
    const goals = wx.getStorageSync('goals') || [];
    const index = goals.findIndex(item => item.id === this.data.goal.id);
    
    if (index !== -1) {
      // 更新目标状态
      goals[index].completed = true;
      goals[index].completedTime = new Date().toISOString();
      
      // 保存到本地存储
      wx.setStorageSync('goals', goals);
      
      // 更新页面数据
      this.setData({
        'goal.completed': true,
        'goal.completedTime': goals[index].completedTime
      });
      
      wx.showToast({
        title: '目标已完成',
        icon: 'success'
      });
    }
  },

  // 删除目标
  deleteGoal() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个目标吗？',
      success: (res) => {
        if (res.confirm) {
          const goals = wx.getStorageSync('goals') || [];
          const newGoals = goals.filter(item => item.id !== this.data.goal.id);
          
          // 保存到本地存储
          wx.setStorageSync('goals', newGoals);
          
          wx.showToast({
            title: '目标已删除',
            icon: 'success'
          });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      }
    });
  },
  
  // 显示操作菜单
  showActionMenu() {
    this.setData({
      showMenu: !this.data.showMenu
    });
  },
  
  // 编辑目标
  editGoal() {
    this.setData({
      showMenu: false
    });
    // 跳转到编辑页面
    wx.navigateTo({
      url: `../create/create?id=${this.data.goal.id}`
    });
  },
  
  
  // 任务排序
  sortTasks() {
    this.setData({
      showMenu: false
    });
    wx.showToast({
      title: '排序功能开发中',
      icon: 'none'
    });
  },
  
  // 创建任务
  createTask() {
    wx.navigateTo({
      url: `./create-task?goalId=${this.data.goal.id}`
    });
  },

  // 切换任务完成状态
    // 查看任务详情
  viewTaskDetail(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/Pages/tasks/detail/detail?id=' + taskId
    });
  },

  toggleTaskStatus(e) {
    const taskId = e.currentTarget.dataset.id;
    const goals = wx.getStorageSync('goals') || [];
    const goalIndex = goals.findIndex(item => item.id === this.data.goal.id);
    
    if (goalIndex !== -1) {
      const taskIndex = goals[goalIndex].tasks.findIndex(task => task.id === taskId);
      
      if (taskIndex !== -1) {
        // 切换任务完成状态
        goals[goalIndex].tasks[taskIndex].completed = !goals[goalIndex].tasks[taskIndex].completed;
        
        // 保存到本地存储
        wx.setStorageSync('goals', goals);
        
        // 更新页面数据
        const updatedTasks = [...this.data.tasks];
        updatedTasks[taskIndex].completed = goals[goalIndex].tasks[taskIndex].completed;
        
        this.setData({
          tasks: updatedTasks
        });
        
        // 重新计算统计数据
        this.calculateTaskStats(goals[goalIndex]);
      }
    }
  },
  editTask(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/Pages/goals/detail/create-task?id=${taskId}&goalId=${this.data.goal.id}`
    });
  },

  // 删除任务
  deleteTask(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      success: (res) => {
        if (res.confirm) {
          // 从目标的任务列表中删除
          const tasks = this.data.tasks.filter(item => item.id !== taskId);
          this.setData({ tasks });
          
          // 更新目标中的任务列表
          const goals = wx.getStorageSync('goals') || [];
          const goalIndex = goals.findIndex(item => item.id === this.data.goal.id);
          if (goalIndex !== -1) {
            goals[goalIndex].tasks = tasks;
            wx.setStorageSync('goals', goals);
          }
          
          // 从tasks存储中删除
          const allTasks = wx.getStorageSync('tasks') || [];
          const newAllTasks = allTasks.filter(item => item.id !== taskId);
          wx.setStorageSync('tasks', newAllTasks);
          
          wx.showToast({ title: '删除成功', icon: 'success' });
          
          // 重新计算统计数据
          this.calculateTaskStats(goals[goalIndex]);
        }
      }
    });
  },
  
  // AI创建任务
  createAITasks() {
    // 显示加载提示
    wx.showLoading({
      title: 'AI生成中...',
    });
    
    // 准备目标详情数据作为输入
    const goalData = {
      title: this.data.goal.title,
      description: this.data.goal.description || '无',
      startDate: this.data.goal.startDate || '未设置',
      endDate: this.data.goal.endDate || '未设置',
      color: this.data.goal.color || '默认颜色',
      tasks: this.data.tasks.length ? this.data.tasks.join('，') : '无'
    };
    
    // 改用中文键名模板字符串拼接
    const inputStr = `标题：${goalData.title}，描述：${goalData.description}，开始时间：${goalData.startDate}，结束时间：${goalData.endDate}`;    
    console.log('最终发送的 input:', inputStr); // 关键调试信息
    // 调用Coze API
    wx.request({
      url: 'https://api.coze.cn/v1/workflow/run',
      method: 'POST',
      header: {
        'Authorization': 'Bearer pat_f0TDPQWEik5GF5jZoFcxtHJsmPFYqCekqvlWn5JDxMztHKn6AFmqfNf3Kq9kb5K3',
        'Content-Type': 'application/json'
      },
      data: {
        parameters: {
           input: inputStr 
        },
        workflow_id: "7486789483191353382",
        app_id: "7475337262205583372"
      },
      success: (res) => {
        console.log('-------- 完整API响应 --------');
        console.log('HTTP状态码:', res.statusCode);
        console.log('响应头:', res.header);
        console.log('响应数据:', res.data.data);
        console.log('响应数据结构:', res.data ? Object.keys(res.data) : '无数据');
        console.log('----------------------------');
        wx.hideLoading();
        
        if (res.statusCode === 200 && res.data) {
          // 处理API返回的数据
          try {
            // 新增：先解析整个data字段
            const responseData = JSON.parse(res.data.data); // 关键修改！
            let output = responseData.output;
            console.log('初步output:', output);
      
            // 处理output为字符串的情况
            if (typeof output === 'string') {
              output = JSON.parse(output);
            }
            // 新增调试日志
            console.log('[DEBUG] 完整解析结果:', responseData);
            console.log('[DEBUG] output数据类型:', typeof output);
            // 检查是否有返回的任务列表
            if (output && output.length > 0) {
              wx.showToast({
                title: '结果列表：' + output,
                icon: 'none'
              });
              // 创建新任务
              this.createTasksFromAIOutput(output);
            } else {
              wx.showToast({
                title: '未获取到任务建议',
                icon: 'none'
              });
            }
          } catch (error) {
            console.error('处理AI返回数据失败:', error);
            wx.showToast({
              title: '处理AI返回数据失败',
              icon: 'none'
            });
          }
        } else {
          // 打印完整的响应对象，帮助调试
          console.error('API调用失败详情:', JSON.stringify(res));
          console.error('状态码:', res.statusCode);
          console.error('响应数据结构:', Object.keys(res.data || {}));
          
          wx.showToast({
            title: 'AI接口调用失败',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        console.error('API请求失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 从AI输出创建任务
  createTasksFromAIOutput(output) {
    // 获取当前目标和任务
    const goals = wx.getStorageSync('goals') || [];
    const goalIndex = goals.findIndex(item => item.id === this.data.goal.id);
    
    if (goalIndex === -1) {
      wx.showToast({
        title: '目标不存在',
        icon: 'none'
      });
      return;
    }
    
    // 获取所有任务
    let allTasks = wx.getStorageSync('tasks') || [];
    
    // 处理每个AI生成的任务
    const newTasks = [];
    
    output.forEach((item, index) => {
      // 创建新任务对象
      const newTask = {
        id: `task_${Date.now()}_${index}`,
        goalId: this.data.goal.id,
        title: item.rw.title || '未命名任务',
        description: item.rw.data || '',
        completed: false,
        createTime: new Date().toISOString(),
        startDate: '',
        endDate: ''
      };
      
      // 处理日期
      if (item.rw.date) {
        const dateParts = item.rw.date.split('-');
        if (dateParts.length === 2) {
          newTask.startDate = dateParts[0].trim();
          newTask.endDate = dateParts[1].trim();
        }
      }
      
      // 添加到新任务列表
      newTasks.push(newTask);
      
      // 添加到所有任务列表
      allTasks.push(newTask);
    });
    
    // 更新目标的任务列表
    const updatedTasks = [...this.data.tasks, ...newTasks];
    goals[goalIndex].tasks = updatedTasks;
    
    // 保存到本地存储
    wx.setStorageSync('goals', goals);
    wx.setStorageSync('tasks', allTasks);
    
    // 更新页面数据
    this.setData({
      tasks: updatedTasks
    });
    
    // 重新计算统计数据
    this.calculateTaskStats(goals[goalIndex]);
    
    wx.showToast({
      title: `成功创建${newTasks.length}个任务`,
      icon: 'success'
    });
  },
});