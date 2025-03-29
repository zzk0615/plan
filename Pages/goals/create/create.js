// pages/goals/create/create.js
Page({
  data: {
    title: '',
    desc: '',
    description: '',
    deadline: '',
    formError: '',
    selectedColor: '#FF6B9A', // 默认选择粉色
    colors: [
      { color: '#FF6B9A', name: '粉色' },
      { color: '#FFA500', name: '橙色' },
      { color: '#4CAF50', name: '绿色' },
      { color: '#2196F3', name: '蓝色' },
      { color: '#9C27B0', name: '紫色' },
      { color: '#FF5252', name: '红色' }
    ],
    startDate: '2025/3/25',
    endDate: '2025/6/25',
    dateRange: '2025/3/25-2025/6/25',
    isEdit: false,
    goalId: ''
  },

  // 页面加载时检查是否为编辑模式
  onLoad(options) {
    // 检查是否传入了目标ID，如果有则为编辑模式
    if (options.id) {
      const goals = wx.getStorageSync('goals') || [];
      const goal = goals.find(item => item.id === options.id);
      
      if (goal) {
        // 设置为编辑模式并加载目标数据
        this.setData({
          isEdit: true,
          goalId: options.id,
          title: goal.title,
          description: goal.description || '',
          selectedColor: goal.color || '#FF6B9A',
          startDate: goal.startDate || '',
          endDate: goal.endDate || '',
          dateRange: goal.startDate && goal.endDate ? `${goal.startDate}-${goal.endDate}` : ''
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
    }
  },

  // 处理标题输入
  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    });
  },

  // 处理描述输入（激励语）
  onDescriptionInput(e) {
    this.setData({
      description: e.detail.value
    });
  },

  // 处理描述输入
  onDescInput(e) {
    this.setData({
      desc: e.detail.value
    });
  },

  // 选择颜色
  selectColor(e) {
    const { color } = e.currentTarget.dataset;
    this.setData({
      selectedColor: color
    });
  },

  // 处理日期范围选择
  onDateRangeChange(e) {
    const value = e.detail.value;
    // 将日期格式从YYYY-MM-DD转换为YYYY/MM/DD
    const formattedDate = value.replace(/-/g, '/');
    
    // 如果是第一次选择日期，设置为开始日期
    if (!this.data.startDate || (this.data.startDate && this.data.endDate)) {
      this.setData({
        startDate: formattedDate,
        endDate: '',
        dateRange: formattedDate
      });
      wx.showToast({
        title: '请再次选择结束日期',
        icon: 'none'
      });
    } else {
      // 第二次选择，设置为结束日期
      const startDate = new Date(this.data.startDate);
      const endDate = new Date(formattedDate);
      
      // 确保结束日期不早于开始日期
      if (endDate < startDate) {
        wx.showToast({
          title: '结束日期不能早于开始日期',
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        endDate: formattedDate,
        dateRange: `${this.data.startDate}-${formattedDate}`
      });
      
      // 计算持续天数
      const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      this.setData({
        durationDays: durationDays
      });
    }
  },
  
  // 跳转到目标指南页面
  goToGuide() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 清除日期
  clearDate() {
    this.setData({
      dateRange: '',
      startDate: '',
      endDate: ''
    });
  },

  // 提交表单
  submitForm() {
    // 表单验证
    if (!this.data.title.trim()) {
      this.setData({
        formError: '请输入目标标题'
      });
      return;
    }

    // 获取现有目标
    const goals = wx.getStorageSync('goals') || [];
    
    if (this.data.isEdit) {
      // 编辑现有目标
      const index = goals.findIndex(item => item.id === this.data.goalId);
      
      if (index !== -1) {
        // 更新目标数据，保留原有的其他字段
        goals[index] = {
          ...goals[index],
          title: this.data.title,
          description: this.data.description,
          color: this.data.selectedColor,
          startDate: this.data.startDate,
          endDate: this.data.endDate,
          updateTime: new Date().toISOString()
        };
        
        // 保存到本地存储
        wx.setStorageSync('goals', goals);
        
        // 显示成功提示
        wx.showToast({
          title: '目标更新成功',
          icon: 'success',
          duration: 2000
        });
      }
    } else {
      // 创建新目标
      const newGoal = {
        id: Date.now().toString(),
        title: this.data.title,
        description: this.data.description,
        color: this.data.selectedColor,
        startDate: this.data.startDate,
        endDate: this.data.endDate,
        createTime: new Date().toISOString(),
        completed: false
      };

      // 添加到目标列表
      goals.unshift(newGoal);
      
      // 保存到本地存储
      wx.setStorageSync('goals', goals);

      // 显示成功提示
      wx.showToast({
        title: '目标创建成功',
        icon: 'success',
        duration: 2000
      });
    }

    // 返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 取消创建
  cancelCreate() {
    wx.navigateBack();
  }
})