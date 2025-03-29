// Pages/tasks/detail/detail.js
Page({
  data: {
    task: null,
    loading: true,
    isEdit: false,
    showMenu: false, // 控制操作菜单的显示和隐藏
    // 计时器相关数据
    showTimer: false,
    timerType: 'normal', // normal: 正计时, countdown: 倒计时
    timerRunning: false,
    timerSeconds: 0,
    timerDisplay: '00:00',
    timerInterval: null,
    totalFocusTime: 0,
    formatFocusTime: '0分钟',
    // 子计划相关数据
    subtasks: [],
    completedSubtasksCount: 0,
    showSubtaskModal: false,
    editingSubtask: false,
    subtaskTitle: '',
    subtaskDescription: '',
    subtaskFormError: '',
    currentSubtaskId: '',
    currentParentId: '',
    // 子计划详情相关
    showSubtaskDetail: false,
    currentSubtask: null,
    // 总体完成率
    totalCompletionRate: 0
  },

  onLoad(options) {
    // 获取任务ID
    const { id } = options;
    if (id) {
      this.loadTaskDetail(id);
      // 加载今日专注时间
      this.loadFocusTimeData(id);
    } else {
      wx.showToast({
        title: '任务不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  onUnload() {
    // 页面卸载时清除计时器
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
    }
    // 如果计时器正在运行，保存当前计时数据
    if (this.data.timerRunning) {
      this.saveFocusTimeData();
    }
  },

  // 加载任务详情
  loadTaskDetail(id) {
    this.setData({ loading: true });
    
    // 从本地存储获取任务数据
    const tasks = wx.getStorageSync('tasks') || [];
    const task = tasks.find(item => item.id === id);
    
    if (task) {
      // 如果任务有关联目标，获取目标名称
      if (task.goalId) {
        const goals = wx.getStorageSync('goals') || [];
        const goal = goals.find(g => g.id === task.goalId);
        if (goal) {
          task.goalTitle = goal.title; // 将目标名称添加到任务对象中
        }
      }
      
      // 加载子计划
      this.loadSubtasks(id);
      
      this.setData({
        task,
        loading: false
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
  },
  
  // 加载子计划
  loadSubtasks(taskId) {
    // 从本地存储获取子计划数据
    const subtasks = wx.getStorageSync('subtasks') || {};
    const taskSubtasks = subtasks[taskId] || [];
    
    // 计算已完成的子计划数量
    const completedSubtasksCount = taskSubtasks.filter(item => item.completed).length;
    
    // 更新子计划的子计划计数并设置expanded属性
    taskSubtasks.forEach(subtask => {
      // 递归加载所有层级的子计划
      this.loadSubtaskRecursively(subtask, subtasks);
    });
    
    // 计算总体完成率 - 考虑所有层级子计划的权重
    let totalCompletionRate = 0;
    if (taskSubtasks.length > 0) {
      // 计算所有顶层子计划的完成权重总和
      const totalWeight = taskSubtasks.reduce((sum, subtask) => {
        return sum + this.calculateSubtaskCompletionWeight(subtask, subtasks);
      }, 0);
      
      // 计算平均完成度百分比
      totalCompletionRate = Math.floor((totalWeight / taskSubtasks.length) * 100);
    }
    
    this.setData({
      subtasks: taskSubtasks,
      completedSubtasksCount,
      totalCompletionRate
    });
  },

  // 显示/隐藏操作菜单
  showActionMenu() {
    this.setData({
      showMenu: !this.data.showMenu
    });
  },

  // 编辑任务
  onEditTap() {
    this.setData({ showMenu: false });
    if (this.data.task) {
      wx.navigateTo({
        url: `/Pages/goals/detail/create-task?id=${this.data.task.id}&goalId=${this.data.task.goalId}`
      });
    }
  },

  // 删除任务
  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      success: (res) => {
        if (res.confirm) {
          // 从tasks存储中删除
          const tasks = wx.getStorageSync('tasks') || [];
          const newTasks = tasks.filter(item => item.id !== this.data.task.id);
          wx.setStorageSync('tasks', newTasks);
          
          // 从目标的任务列表中删除
          const goals = wx.getStorageSync('goals') || [];
          const goalIndex = goals.findIndex(g => g.id === this.data.task.goalId);
          
          if (goalIndex !== -1) {
            if (goals[goalIndex].tasks) {
              goals[goalIndex].tasks = goals[goalIndex].tasks.filter(t => t.id !== this.data.task.id);
              wx.setStorageSync('goals', goals);
            }
          }
          
          wx.showToast({
            title: '任务已删除',
            icon: 'success'
          });
          
          setTimeout(() => {
            // 获取页面栈
            const pages = getCurrentPages();
            // 找到目标详情页
            const goalDetailPage = pages.find(page => page.route && page.route.includes('/goals/detail/detail'));
            
            wx.navigateBack({
              success: () => {
                // 如果找到了目标详情页，刷新它的数据
                if (goalDetailPage && goalDetailPage.loadGoalDetail) {
                  goalDetailPage.loadGoalDetail(this.data.task.goalId);
                }
              }
            });
          }, 1500);
        }
      }
    });
  },

  // 切换任务完成状态
  toggleTaskStatus() {
    if (!this.data.task) return;
    
    const tasks = wx.getStorageSync('tasks') || [];
    const taskIndex = tasks.findIndex(item => item.id === this.data.task.id);
    
    if (taskIndex !== -1) {
      // 切换任务完成状态
      tasks[taskIndex].completed = !tasks[taskIndex].completed;
      
      // 如果标记为完成，记录完成时间
      if (tasks[taskIndex].completed) {
        tasks[taskIndex].completedTime = new Date().toISOString();
      } else {
        tasks[taskIndex].completedTime = null;
      }
      
      // 保存到本地存储
      wx.setStorageSync('tasks', tasks);
      
      // 更新页面数据
      this.setData({
        'task.completed': tasks[taskIndex].completed,
        'task.completedTime': tasks[taskIndex].completedTime
      });
      
      // 同步更新目标中的任务状态
      const goals = wx.getStorageSync('goals') || [];
      const goalIndex = goals.findIndex(g => g.id === this.data.task.goalId);
      
      if (goalIndex !== -1 && goals[goalIndex].tasks) {
        const goalTaskIndex = goals[goalIndex].tasks.findIndex(t => t.id === this.data.task.id);
        
        if (goalTaskIndex !== -1) {
          goals[goalIndex].tasks[goalTaskIndex].completed = tasks[taskIndex].completed;
          goals[goalIndex].tasks[goalTaskIndex].completedTime = tasks[taskIndex].completedTime;
          wx.setStorageSync('goals', goals);
        }
      }
      
      wx.showToast({
        title: tasks[taskIndex].completed ? '任务已完成' : '任务已取消完成',
        icon: 'success'
      });
    }
  },
  
  // 计时器相关方法
  showTimerModal() {
    this.setData({ showTimer: true });
  },
  
  hideTimerModal() {
    // 如果计时器正在运行，先保存数据
    if (this.data.timerRunning) {
      this.saveFocusTimeData();
    }
    this.setData({ showTimer: false });
  },
  
  switchTimerType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ timerType: type });
    this.resetTimer();
  },
  
  // 长按暂停功能
  longPressPause() {
    if (this.data.timerRunning) {
      // 暂停计时器
      clearInterval(this.data.timerInterval);
      this.setData({ 
        timerRunning: false,
        timerInterval: null
      });
      // 保存当前计时数据
      this.saveFocusTimeData();
      
      wx.showToast({
        title: '已暂停',
        icon: 'success',
        duration: 1500
      });
    }
  },
  
  toggleTimer() {
    if (this.data.timerRunning) {
      // 暂停计时器
      clearInterval(this.data.timerInterval);
      this.setData({ 
        timerRunning: false,
        timerInterval: null
      });
      // 保存当前计时数据
      this.saveFocusTimeData();
    } else {
      // 开始计时器
      const interval = setInterval(() => {
        let seconds = this.data.timerSeconds;
        
        if (this.data.timerType === 'normal') {
          // 正计时
          seconds++;
        } else {
          // 倒计时，如果设置了时间
          if (seconds > 0) {
            seconds--;
          } else {
            // 倒计时结束
            clearInterval(this.data.timerInterval);
            this.setData({ 
              timerRunning: false,
              timerInterval: null
            });
            wx.showToast({
              title: '计时结束',
              icon: 'success'
            });
            return;
          }
        }
        
        this.setData({
          timerSeconds: seconds,
          timerDisplay: this.formatTime(seconds)
        });
      }, 1000);
      
      this.setData({ 
        timerRunning: true,
        timerInterval: interval
      });
    }
  },
  
  resetTimer() {
    // 停止计时器
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
    }
    
    // 如果正在计时，保存数据
    if (this.data.timerRunning) {
      this.saveFocusTimeData();
    }
    
    // 重置计时器状态
    this.setData({
      timerRunning: false,
      timerSeconds: 0,
      timerDisplay: '00:00',
      timerInterval: null
    });
  },
  
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  },
  
  // 加载今日专注时间数据
  loadFocusTimeData(taskId) {
    const today = new Date().toISOString().split('T')[0];
    const focusLogs = wx.getStorageSync('focusLogs') || {};
    
    // 计算当日所有任务总时长
    let totalSeconds = 0;
    Object.values(focusLogs).forEach(taskLogs => {
      if (taskLogs[today]) {
        totalSeconds += taskLogs[today];
      }
    });

    this.setData({
      totalFocusTime: totalSeconds,
      formatFocusTime: this.formatFocusTimeDisplay(totalSeconds)
    });
  },
  
  // 保存专注时间数据
  saveFocusTimeData() {
    if (this.data.timerType === 'normal' && this.data.timerSeconds > 0) {
      const taskId = this.data.task.id;
      const today = new Date().toISOString().split('T')[0]; // 获取今天的日期，格式：YYYY-MM-DD
      const focusLogs = wx.getStorageSync('focusLogs') || {};
      
      // 更新今日该任务的专注时间
      if (!focusLogs[taskId]) {
        focusLogs[taskId] = {};
      }
      
      const currentSeconds = focusLogs[taskId][today] || 0;
      focusLogs[taskId][today] = currentSeconds + this.data.timerSeconds;
      
      // 保存到本地存储
      wx.setStorageSync('focusLogs', focusLogs);
      
      // 更新显示
      this.setData({
        totalFocusTime: focusLogs[taskId][today],
        formatFocusTime: this.formatFocusTimeDisplay(focusLogs[taskId][today])
      });
      
      // 重置计时器
      this.setData({
        timerSeconds: 0,
        timerDisplay: '00:00'
      });
    }
  },
  
  // 格式化专注时间显示
  formatFocusTimeDisplay(seconds) {
    if (seconds < 60) {
      return seconds + '秒';
    } else if (seconds < 3600) {
      return Math.floor(seconds / 60) + '分钟';
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return hours + '小时' + (minutes > 0 ? minutes + '分钟' : '');
    }
  },

  // 子计划相关方法
  // 显示添加子计划弹窗
  showAddSubtaskModal() {
    this.setData({
      showSubtaskModal: true,
      editingSubtask: false,
      subtaskTitle: '',
      subtaskDescription: '',
      subtaskFormError: '',
      currentSubtaskId: '',
      currentParentId: ''
    });
  },

  // 隐藏子计划弹窗
  hideSubtaskModal() {
    this.setData({
      showSubtaskModal: false
    });
  },

  // 子计划标题输入处理
  onSubtaskTitleInput(e) {
    this.setData({
      subtaskTitle: e.detail.value,
      subtaskFormError: ''
    });
  },

  // 子计划描述输入处理
  onSubtaskDescriptionInput(e) {
    this.setData({
      subtaskDescription: e.detail.value
    });
  },

  // 提交子计划表单
  submitSubtask() {
    // 表单验证
    if (!this.data.subtaskTitle.trim()) {
      this.setData({
        subtaskFormError: '请输入子计划名称'
      });
      return;
    }

    // 获取子计划数据
    const subtasks = wx.getStorageSync('subtasks') || {};
    const taskId = this.data.task.id;
    const parentId = this.data.currentParentId || taskId; // 如果有父级子计划ID，则使用它，否则使用任务ID
    
    // 确保有该任务/子计划的子计划数组
    if (!subtasks[parentId]) {
      subtasks[parentId] = [];
    }
    
    // 判断是新建还是编辑
    if (this.data.editingSubtask && this.data.currentSubtaskId) {
      // 编辑现有子计划
      const index = subtasks[parentId].findIndex(item => item.id === this.data.currentSubtaskId);
      if (index !== -1) {
        subtasks[parentId][index].title = this.data.subtaskTitle;
        subtasks[parentId][index].description = this.data.subtaskDescription;
        subtasks[parentId][index].updateTime = new Date().toISOString();
      }
    } else {
      // 创建新子计划
      const newSubtask = {
        id: Date.now().toString(),
        title: this.data.subtaskTitle,
        description: this.data.subtaskDescription,
        completed: false,
        createTime: new Date().toISOString(),
        parentId: parentId !== taskId ? parentId : null, // 如果父级不是主任务，记录父级ID
        expanded: false // 默认折叠状态
      };
      
      subtasks[parentId].push(newSubtask);
    }
    
    // 保存到本地存储
    wx.setStorageSync('subtasks', subtasks);
    
    // 重新加载子计划
    if (this.data.currentParentId && this.data.currentSubtask) {
      // 如果是在子计划详情中添加/编辑子计划，更新当前子计划的子计划列表
      this.loadNestedSubtasks(this.data.currentParentId, this.data.currentSubtask.id);
    } else {
      // 否则重新加载主任务的子计划列表
      this.loadSubtasks(taskId);
    }
    
    // 隐藏弹窗
    this.setData({
      showSubtaskModal: false
    });
    
    wx.showToast({
      title: this.data.editingSubtask ? '子计划已更新' : '子计划已添加',
      icon: 'success'
    });
  },

  // 编辑子计划
  editSubtask(e) {
    const id = e.currentTarget.dataset.id;
    const subtasks = wx.getStorageSync('subtasks') || {};
    const taskId = this.data.task.id;
    
    if (subtasks[taskId]) {
      const subtask = subtasks[taskId].find(item => item.id === id);
      if (subtask) {
        this.setData({
          showSubtaskModal: true,
          editingSubtask: true,
          subtaskTitle: subtask.title,
          subtaskDescription: subtask.description,
          subtaskFormError: '',
          currentSubtaskId: id,
          currentParentId: taskId
        });
      }
    }
  },

  // 删除子计划
  deleteSubtask(e) {
    const id = e.currentTarget.dataset.id;
    const taskId = this.data.task.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个子计划吗？这将同时删除其所有子计划。',
      success: (res) => {
        if (res.confirm) {
          // 获取子计划数据
          const subtasks = wx.getStorageSync('subtasks') || {};
          
          // 递归删除子计划及其所有子计划
          this.recursiveDeleteSubtask(subtasks, id);
          
          // 从父任务的子计划列表中删除
          if (subtasks[taskId]) {
            subtasks[taskId] = subtasks[taskId].filter(item => item.id !== id);
            // 如果子计划列表为空，删除该键
            if (subtasks[taskId].length === 0) {
              delete subtasks[taskId];
            }
          }
          
          // 保存到本地存储
          wx.setStorageSync('subtasks', subtasks);
          
          // 重新加载子计划
          this.loadSubtasks(taskId);
          
          wx.showToast({
            title: '子计划已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 递归删除子计划及其所有子计划
  recursiveDeleteSubtask(subtasks, subtaskId) {
    // 如果该子计划有子计划，先递归删除它们
    if (subtasks[subtaskId]) {
      // 复制一份子计划数组，避免在遍历过程中修改原数组
      const childSubtasks = [...subtasks[subtaskId]];
      childSubtasks.forEach(childSubtask => {
        this.recursiveDeleteSubtask(subtasks, childSubtask.id);
      });
      // 删除该子计划的子计划列表
      delete subtasks[subtaskId];
    }
  },

  // 切换子计划展开/折叠状态
  toggleSubtaskExpand(e) {
    const id = e.currentTarget.dataset.id;
    const subtasks = this.data.subtasks;
    
    // 找到对应的子计划并切换其expanded状态
    const index = subtasks.findIndex(item => item.id === id);
    if (index !== -1) {
      // 切换expanded状态
      const expanded = !subtasks[index].expanded;
      
      // 更新子计划的expanded状态
      this.setData({
        [`subtasks[${index}].expanded`]: expanded
      });
    }
  },

  // 切换嵌套子计划展开/折叠状态
  toggleNestedSubtaskExpand(e) {
    const parentId = e.currentTarget.dataset.parentId;
    const id = e.currentTarget.dataset.id;
    const subtasks = wx.getStorageSync('subtasks') || {};

    if (subtasks[parentId]) {
        const index = subtasks[parentId].findIndex(item => item.id === id);
        if (index !== -1) {
            // 切换 expanded 状态
            const newExpandedState = !subtasks[parentId][index].expanded;
            subtasks[parentId][index].expanded = newExpandedState;
            wx.setStorageSync('subtasks', subtasks);
            
            // 打印调试信息
            console.log(`切换子计划展开状态: ${id}, 新状态: ${newExpandedState}`);

            // 如果是展开操作，确保子计划的子计划数据已加载
            if (newExpandedState && subtasks[id]) {
                // 确保子计划的子计划数据已加载并设置expanded属性
                subtasks[id].forEach(childSubtask => {
                    if (typeof childSubtask.expanded === 'undefined') {
                        childSubtask.expanded = false;
                    }
                });
                wx.setStorageSync('subtasks', subtasks);
            }

            // 统一处理视图更新
            const findRefreshTarget = (targetId) => {
                // 如果目标ID是主任务的直接子计划
                if (this.data.subtasks && this.data.subtasks.some(t => t.id === targetId)) {
                    this.loadSubtasks(this.data.task.id);
                }
                // 如果是当前查看的子计划详情中的任务
                else if (this.data.currentSubtask && this.data.currentSubtask.id === targetId) {
                    this.loadNestedSubtasks(this.data.currentParentId, targetId);
                }
                // 递归查找父级
                else {
                    for (const [pid, list] of Object.entries(subtasks)) {
                        if (list.some(t => t.id === targetId)) {
                            findRefreshTarget(pid);
                            break;
                        }
                    }
                }
            };

            // 从当前操作的父级开始刷新
            findRefreshTarget(parentId);
        }
    }
},
  
  // 查找最顶层的父任务ID
  findTopParentId(subtaskId, subtasks) {
    // 遍历所有子计划列表，查找当前子计划的父任务
    for (const parentId in subtasks) {
      const foundSubtask = subtasks[parentId].find(item => item.id === subtaskId);
      if (foundSubtask) {
        // 如果父任务是主任务，直接返回
        if (parentId === this.data.task.id) {
          return subtaskId;
        }
        // 否则递归查找父任务的父任务
        return this.findTopParentId(parentId, subtasks);
      }
    }
    return subtaskId; // 如果没有找到父任务，返回自身ID
  },

  // 切换子计划完成状态
  toggleSubtaskStatus(e) {
    const id = e.currentTarget.dataset.id;
    const taskId = this.data.task.id;
    
    // 获取子计划数据
    const subtasks = wx.getStorageSync('subtasks') || {};
    
    if (subtasks[taskId]) {
      const index = subtasks[taskId].findIndex(item => item.id === id);
      if (index !== -1) {
        // 切换完成状态
        subtasks[taskId][index].completed = !subtasks[taskId][index].completed;
        
        // 如果标记为完成，记录完成时间
        if (subtasks[taskId][index].completed) {
          subtasks[taskId][index].completedTime = new Date().toISOString();
        } else {
          subtasks[taskId][index].completedTime = null;
        }
        
        // 保存到本地存储
        wx.setStorageSync('subtasks', subtasks);
        
        // 重新加载子计划
        this.loadSubtasks(taskId);
      }
    }
  },

  // 查看子计划详情
  viewSubtaskDetail(e) {
    const id = e.currentTarget.dataset.id;
    const subtasks = wx.getStorageSync('subtasks') || {};
    const taskId = this.data.task.id;
    
    if (subtasks[taskId]) {
      const subtask = subtasks[taskId].find(item => item.id === id);
      if (subtask) {
        // 加载子计划的子计划
        if (subtasks[id]) {
          subtask.subtasks = subtasks[id];
          subtask.completedSubtasksCount = subtask.subtasks.filter(item => item.completed).length;
          
          // 更新子计划的子计划计数
          subtask.subtasks.forEach(childSubtask => {
            if (subtasks[childSubtask.id]) {
              childSubtask.subtasks = subtasks[childSubtask.id];
              childSubtask.completedSubtasksCount = childSubtask.subtasks.filter(item => item.completed).length;
              // 确保每个子计划都有expanded属性
              if (typeof childSubtask.expanded === 'undefined') {
                childSubtask.expanded = false;
              }
            } else {
              childSubtask.subtasks = [];
              childSubtask.completedSubtasksCount = 0;
              childSubtask.expanded = false;
            }
          });
        } else {
          subtask.subtasks = [];
          subtask.completedSubtasksCount = 0;
        }
        
        this.setData({
          currentSubtask: subtask,
          showSubtaskDetail: true,
          currentParentId: taskId
        });
      }
    }
  },

  // 隐藏子计划详情弹窗
  hideSubtaskDetailModal() {
    this.setData({
      showSubtaskDetail: false,
      currentSubtask: null,
      currentParentId: ''
    });
    
    // 重新加载主任务的子计划列表，确保状态更新
    this.loadSubtasks(this.data.task.id);
  },

  // 编辑当前查看的子计划
  editCurrentSubtask() {
    if (this.data.currentSubtask) {
      this.setData({
        showSubtaskModal: true,
        editingSubtask: true,
        subtaskTitle: this.data.currentSubtask.title,
        subtaskDescription: this.data.currentSubtask.description,
        subtaskFormError: '',
        currentSubtaskId: this.data.currentSubtask.id,
        currentParentId: this.data.currentParentId
      });
    }
  },

  // 删除当前查看的子计划
  deleteCurrentSubtask() {
    if (this.data.currentSubtask) {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个子计划吗？这将同时删除其所有子计划。',
        success: (res) => {
          if (res.confirm) {
            // 获取子计划数据
            const subtasks = wx.getStorageSync('subtasks') || {};
            const taskId = this.data.task.id;
            const subtaskId = this.data.currentSubtask.id;
            
            // 递归删除子计划及其所有子计划
            this.recursiveDeleteSubtask(subtasks, subtaskId);
            
            // 从父任务的子计划列表中删除
            if (subtasks[this.data.currentParentId]) {
              subtasks[this.data.currentParentId] = subtasks[this.data.currentParentId].filter(item => item.id !== subtaskId);
              // 如果子计划列表为空，删除该键
              if (subtasks[this.data.currentParentId].length === 0) {
                delete subtasks[this.data.currentParentId];
              }
            }
            
            // 保存到本地存储
            wx.setStorageSync('subtasks', subtasks);
            
            // 重新加载子计划
            this.loadSubtasks(taskId);
            
            // 隐藏详情弹窗
            this.setData({
              showSubtaskDetail: false,
              currentSubtask: null,
              currentParentId: ''
            });
            
            wx.showToast({
              title: '子计划已删除',
              icon: 'success'
            });
          }
        }
      });
    }
  },

  // 在当前子计划中添加子计划
  addNestedSubtask() {
    if (this.data.currentSubtask) {
      this.setData({
        showSubtaskModal: true,
        editingSubtask: false,
        subtaskTitle: '',
        subtaskDescription: '',
        subtaskFormError: '',
        currentSubtaskId: '',
        currentParentId: this.data.currentSubtask.id
      });
    }
  },

  // 加载嵌套子计划
  loadNestedSubtasks(parentId, subtaskId) {
    // 从本地存储获取子计划数据
    const subtasks = wx.getStorageSync('subtasks') || {};
    
    if (subtasks[parentId]) {
      const subtaskIndex = subtasks[parentId].findIndex(item => item.id === subtaskId);
      if (subtaskIndex !== -1) {
        // 获取当前子计划
        const subtask = JSON.parse(JSON.stringify(subtasks[parentId][subtaskIndex]));
        console.log(`加载嵌套子计划: ${subtaskId}, 展开状态: ${subtask.expanded}`);
        
        // 加载子计划的子计划
        if (subtasks[subtaskId]) {
          // 保存原始的expanded状态
          const originalSubtasks = subtask.subtasks || [];
          const expandedMap = {};
          if (originalSubtasks.length > 0) {
            originalSubtasks.forEach(item => {
              expandedMap[item.id] = item.expanded;
            });
          }
          
          // 加载新的子计划数据
          subtask.subtasks = subtasks[subtaskId];
          subtask.completedSubtasksCount = subtask.subtasks.filter(item => item.completed).length;
          
          // 恢复之前的expanded状态
          subtask.subtasks.forEach(childSubtask => {
            if (expandedMap[childSubtask.id] !== undefined) {
              childSubtask.expanded = expandedMap[childSubtask.id];
            }
            // 递归加载所有层级的子计划
            this.loadSubtaskRecursively(childSubtask, subtasks);
          });
        } else {
          subtask.subtasks = [];
          subtask.completedSubtasksCount = 0;
        }
        
        this.setData({
          currentSubtask: subtask
        });
      }
    }
  },
  
  // 递归加载子计划及其所有层级的子计划
  // 递归计算子计划完成度，返回完成度权重值（0-1之间）
  calculateSubtaskCompletionWeight(subtask, allSubtasks) {
    // 如果任务已完成，直接返回1（100%完成）
    if (subtask.completed) {
      return 1;
    }
    
    // 检查是否有子计划
    if (allSubtasks[subtask.id] && allSubtasks[subtask.id].length > 0) {
      const childSubtasks = allSubtasks[subtask.id];
      let totalWeight = 0;
      
      // 计算所有子计划的完成权重总和
      childSubtasks.forEach(childSubtask => {
        totalWeight += this.calculateSubtaskCompletionWeight(childSubtask, allSubtasks);
      });
      
      // 返回子计划完成度的平均值
      return totalWeight / childSubtasks.length;
    }
    
    // 如果没有子计划且未完成，返回0
    return 0;
  },
  
  loadSubtaskRecursively(subtask, allSubtasks) {
    if (allSubtasks[subtask.id]) {
      // 保存原来的expanded状态
      const originalExpanded = subtask.expanded;
      
      // 加载子计划数据
      subtask.subtasks = allSubtasks[subtask.id];
      
      // 递归处理每个子计划
      subtask.subtasks.forEach(childSubtask => {
        // 确保子计划有expanded属性，默认为false
        if (typeof childSubtask.expanded === 'undefined') {
          childSubtask.expanded = false;
        }
        // 递归加载子计划的子计划
        this.loadSubtaskRecursively(childSubtask, allSubtasks);
      });
      
      // 计算子计划完成数量和完成权重
      subtask.completedSubtasksCount = subtask.subtasks.filter(item => item.completed).length;
      
      // 计算考虑所有层级的完成度权重
      const completionWeight = subtask.subtasks.reduce((sum, item) => {
        return sum + this.calculateSubtaskCompletionWeight(item, allSubtasks);
      }, 0) / subtask.subtasks.length;
      
      // 保存完成度权重和百分比
      subtask.completionWeight = completionWeight;
      subtask.completionPercentage = Math.floor(completionWeight * 100);
      
      // 确保每个子计划都有expanded属性，但不覆盖已有的状态
      if (typeof originalExpanded !== 'undefined') {
        // 保持原来的展开状态
        subtask.expanded = originalExpanded;
      } else if (typeof subtask.expanded === 'undefined') {
        // 只有在未定义时才设置默认值
        subtask.expanded = false;
      }
      
      // 打印调试信息
      console.log(`子计划${subtask.id}有${subtask.subtasks.length}个子计划，完成度: ${subtask.completionPercentage}%，展开状态: ${subtask.expanded}`);
    } else {
      subtask.subtasks = [];
      subtask.completedSubtasksCount = 0;
      subtask.completionWeight = subtask.completed ? 1 : 0;
      subtask.completionPercentage = subtask.completed ? 100 : 0;
      
      // 只有在未定义时才设置默认值
      if (typeof subtask.expanded === 'undefined') {
        subtask.expanded = false;
      }
    }
  },

  // 查看嵌套子计划详情
  viewNestedSubtask(e) {
    const parentId = e.currentTarget.dataset.parentId;
    const id = e.currentTarget.dataset.id;
    const subtasks = wx.getStorageSync('subtasks') || {};
    
    if (subtasks[parentId]) {
      const subtask = subtasks[parentId].find(item => item.id === id);
      if (subtask) {
        // 创建子计划的深拷贝，避免直接修改原始对象
        const subtaskCopy = JSON.parse(JSON.stringify(subtask));
        
        // 递归加载所有层级的子计划
        this.loadSubtaskRecursively(subtaskCopy, subtasks);
        
        // 打印调试信息
        console.log(`查看子计划: ${id}, 子计划数量: ${subtaskCopy.subtasks ? subtaskCopy.subtasks.length : 0}`);
        if (subtaskCopy.subtasks && subtaskCopy.subtasks.length > 0) {
          subtaskCopy.subtasks.forEach(child => {
            console.log(`  子计划: ${child.id}, 标题: ${child.title}, 展开状态: ${child.expanded}, 子计划数量: ${child.subtasks ? child.subtasks.length : 0}`);
          });
        }
        
        this.setData({
          currentSubtask: subtaskCopy,
          currentParentId: parentId,
          showSubtaskDetail: true // 显示子计划详情弹窗
        });
      }
    }
  },

  // 编辑嵌套子计划
  editNestedSubtask(e) {
    const parentId = e.currentTarget.dataset.parentId;
    const id = e.currentTarget.dataset.id;
    const subtasks = wx.getStorageSync('subtasks') || {};
    
    if (subtasks[parentId]) {
      const subtask = subtasks[parentId].find(item => item.id === id);
      if (subtask) {
        this.setData({
          showSubtaskModal: true,
          editingSubtask: true,
          subtaskTitle: subtask.title,
          subtaskDescription: subtask.description,
          subtaskFormError: '',
          currentSubtaskId: id,
          currentParentId: parentId
        });
      }
    }
  },

  // 删除嵌套子计划
  deleteNestedSubtask(e) {
    const parentId = e.currentTarget.dataset.parentId;
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个子计划吗？这将同时删除其所有子计划。',
      success: (res) => {
        if (res.confirm) {
          // 获取子计划数据
          const subtasks = wx.getStorageSync('subtasks') || {};
          
          // 递归删除子计划及其所有子计划
          this.recursiveDeleteSubtask(subtasks, id);
          
          // 从父任务的子计划列表中删除
          if (subtasks[parentId]) {
            subtasks[parentId] = subtasks[parentId].filter(item => item.id !== id);
            // 如果子计划列表为空，删除该键
            if (subtasks[parentId].length === 0) {
              delete subtasks[parentId];
            }
          }
          
          // 保存到本地存储
          wx.setStorageSync('subtasks', subtasks);
          
          // 重新加载子计划
          if (this.data.currentSubtask && this.data.currentSubtask.id === parentId) {
            // 如果是在子计划详情中，更新当前子计划的子计划列表
            this.loadNestedSubtasks(this.data.currentParentId, this.data.currentSubtask.id);
          } else {
            // 否则重新加载主任务的子计划列表
            this.loadSubtasks(this.data.task.id);
          }
          
          wx.showToast({
            title: '子计划已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 切换嵌套子计划完成状态
  toggleNestedSubtaskStatus(e) {
    const parentId = e.currentTarget.dataset.parentId;
    const id = e.currentTarget.dataset.id;
    
    // 获取子计划数据
    const subtasks = wx.getStorageSync('subtasks') || {};
    
    if (subtasks[parentId]) {
      const index = subtasks[parentId].findIndex(item => item.id === id);
      if (index !== -1) {
        // 切换完成状态
        subtasks[parentId][index].completed = !subtasks[parentId][index].completed;
        
        // 如果标记为完成，记录完成时间
        if (subtasks[parentId][index].completed) {
          subtasks[parentId][index].completedTime = new Date().toISOString();
        } else {
          subtasks[parentId][index].completedTime = null;
        }
        
        // 保存到本地存储
        wx.setStorageSync('subtasks', subtasks);
        
        // 重新加载子计划
        if (this.data.currentSubtask && this.data.currentSubtask.id === parentId) {
          // 如果是在子计划详情中，更新当前子计划的子计划列表
          this.loadNestedSubtasks(this.data.currentParentId, this.data.currentSubtask.id);
        } else {
          // 否则重新加载主任务的子计划列表
          this.loadSubtasks(this.data.task.id);
        }
      }
    }
  }
});