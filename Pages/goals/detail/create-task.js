// pages/goals/detail/create-task.js
Page({
  data: {
    goalId: '',
    title: '',
    description: '',
    dateType: 'single', // 默认为单日选择
    singleDate: '',
    startDate: '',
    endDate: '',
    enableQuantify: false,
    quantifyValue: '',
    formError: '',
    isEdit: false,  // 添加编辑模式标识
    isView: false   // 添加查看模式标识
  },

  onLoad(options) {
    // 获取参数
    const { goalId, id: taskId } = options;
    
    if (goalId) {
      this.setData({ 
        goalId,
        taskId: taskId || ''
      });
      
      // 如果是编辑模式，加载任务数据
      if (taskId) {
        this.setData({
          isEdit: true  // 设置为编辑模式
        });
        wx.setNavigationBarTitle({
          title: '编辑任务'
        });
        const tasks = wx.getStorageSync('tasks') || [];
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          this.setData({
            title: task.title,
            description: task.description,
            dateType: task.dateType,
            singleDate: task.singleDate,
            startDate: task.startDate,
            endDate: task.endDate,
            enableQuantify: task.enableQuantify,
            quantifyValue: task.quantifyValue
          });
        } else {
          wx.showToast({
            title: '任务不存在',
            icon: 'error'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      } else {
        // 新建模式
        wx.setNavigationBarTitle({
          title: '创建任务'
        });
      }
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 任务名称输入处理
  onTitleInput(e) {
    this.setData({
      title: e.detail.value,
      formError: ''
    });
  },

  // 备注输入处理
  onDescriptionInput(e) {
    this.setData({
      description: e.detail.value
    });
  },

  // 切换日期类型
  switchDateType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      dateType: type
    });
  },

  // 单日选择处理
  onSingleDateChange(e) {
    this.setData({
      singleDate: e.detail.value
    });
  },

  // 开始日期选择处理
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    });
  },

  // 结束日期选择处理
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    });
  },

  // 任务量化开关处理
  onEnableQuantifyChange(e) {
    this.setData({
      enableQuantify: e.detail.value
    });
  },

  // 量化数值输入处理
  onQuantifyValueInput(e) {
    this.setData({
      quantifyValue: e.detail.value
    });
  },

  // 提交表单
  submitForm() {
    // 表单验证
    if (!this.data.title.trim()) {
      this.setData({
        formError: '请输入任务名称'
      });
      return;
    }

    if (this.data.enableQuantify && !this.data.quantifyValue) {
      this.setData({
        formError: '请输入量化数值'
      });
      return;
    }

    // 获取目标数据
    const goals = wx.getStorageSync('goals') || [];
    const goalIndex = goals.findIndex(item => item.id === this.data.goalId);
    
    if (goalIndex === -1) {
      wx.showToast({
        title: '目标不存在',
        icon: 'error'
      });
      return;
    }

    // 确保目标有tasks属性
    if (!goals[goalIndex].tasks) {
      goals[goalIndex].tasks = [];
    }
    
    // 创建/更新任务
    const taskData = {
      title: this.data.title,
      description: this.data.description,
      dateType: this.data.dateType,
      singleDate: this.data.dateType === 'single' ? this.data.singleDate : '',
      startDate: this.data.dateType === 'range' ? this.data.startDate : '',
      endDate: this.data.dateType === 'range' ? this.data.endDate : '',
      enableQuantify: this.data.enableQuantify,
      quantifyValue: this.data.enableQuantify ? this.data.quantifyValue : '',
      completed: false,
      goalId: this.data.goalId
    };
    
    // 判断是新建还是编辑
    const isEdit = !!this.data.taskId;
    let updatedTask;
    
    if (isEdit) {
      // 更新现有任务
      const tasks = wx.getStorageSync('tasks') || [];
      const index = tasks.findIndex(t => t.id === this.data.taskId);
      if (index !== -1) {
        updatedTask = {
          ...tasks[index],
          ...taskData,
          updateTime: new Date().toISOString()
        };
        tasks.splice(index, 1, updatedTask);
        wx.setStorageSync('tasks', tasks);
      }
    } else {
      // 创建新任务
      updatedTask = {
        ...taskData,
        id: Date.now().toString(),
        createTime: new Date().toISOString()
      };
      const tasks = wx.getStorageSync('tasks') || [];
      tasks.unshift(updatedTask);
      wx.setStorageSync('tasks', tasks);
    }
    
    // 更新目标的任务列表
    if (isEdit) {
      const taskIndex = goals[goalIndex].tasks.findIndex(t => t.id === this.data.taskId);
      if (taskIndex !== -1) {
        goals[goalIndex].tasks.splice(taskIndex, 1, updatedTask);
      }
    } else {
      goals[goalIndex].tasks.unshift(updatedTask);
    }

    // 同步保存到tasks存储
    const allTasks = wx.getStorageSync('tasks') || [];
    if (isEdit) {
      const taskIndex = allTasks.findIndex(t => t.id === this.data.taskId);
      if (taskIndex !== -1) {
        allTasks.splice(taskIndex, 1, updatedTask);
      }
    } else {
      allTasks.unshift(updatedTask);
    }
    wx.setStorageSync('tasks', allTasks);
    
    // 保存到本地存储
    wx.setStorageSync('goals', goals);
    
    wx.showToast({
      title: isEdit ? '任务已更新' : '任务已创建',
      icon: 'success'
    });
    
    setTimeout(() => {
      // 先获取页面栈再跳转
      const pages = getCurrentPages()
      const prevPage = pages[pages.length - 2] // 注意这里取 -2
    
      wx.navigateBack({
        delta: 1,
        success: () => {
          if (prevPage && prevPage.loadGoalDetail) {
            prevPage.loadGoalDetail(this.data.goalId)
          }
        }
      })
    }, 1500);
  },
  // 删除任务
  deleteTask() {
    if (!this.data.taskId) return;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      success: (res) => {
        if (res.confirm) {
          // 从tasks存储中删除
          const tasks = wx.getStorageSync('tasks') || [];
          const newTasks = tasks.filter(item => item.id !== this.data.taskId);
          wx.setStorageSync('tasks', newTasks);
          
          // 从目标的任务列表中删除
          const goals = wx.getStorageSync('goals') || [];
          const goalIndex = goals.findIndex(g => g.id === this.data.goalId);
          
          if (goalIndex !== -1 && goals[goalIndex].tasks) {
            goals[goalIndex].tasks = goals[goalIndex].tasks.filter(t => t.id !== this.data.taskId);
            wx.setStorageSync('goals', goals);
          }
          
          wx.showToast({
            title: '任务已删除',
            icon: 'success'
          });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      }
    });
  }
});