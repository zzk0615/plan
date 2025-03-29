// pages/logs/logs.js
Page({
  data: {
    activeTab: 'day', // 当前选中的标签页：day, week, month, year
    currentDate: null, // 当前选择的日期
    currentDateDisplay: '', // 当前日期的显示文本
    summaryText: '冰冻三尺非一日之寒。', // 激励文本
    
    // 统计数据
    totalFocusTime: 0, // 已完成任务数
    focusCompletionRate: 0, // 完成率
    totalFocusMinutes: 0, // 专注总时长（分钟）
    pendingTasks: 0, // 待完成任务数
    expiredTasks: 0, // 已过期任务数
    
    // 专注记录
    focusRecords: [],
    
    // 日历数据
    calendarDays: []
  },

  onLoad() {
    // 初始化当前日期为今天
    const today = new Date();
    this.setData({
      currentDate: today,
      activeTab: 'day'
    });
    
    // 加载数据
    this.loadData();
  },
  
  // 处理日期选择器选择事件
  onDateChange(e) {
    const dateStr = e.detail.value;
    const date = new Date(dateStr);
    
    this.setData({
      currentDate: date
    });
    
    this.loadData();
  },

  onShow() {
    // 每次显示页面时重新加载数据
    this.loadData();
  },
  
  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    this.loadData();
  },
  
  // 上一个日期
  prevDate() {
    const currentDate = new Date(this.data.currentDate);
    
    switch (this.data.activeTab) {
      case 'day':
        currentDate.setDate(currentDate.getDate() - 1);
        break;
      case 'week':
        currentDate.setDate(currentDate.getDate() - 7);
        break;
      case 'month':
        currentDate.setMonth(currentDate.getMonth() - 1);
        break;
      case 'year':
        currentDate.setFullYear(currentDate.getFullYear() - 1);
        break;
    }
    
    this.setData({ currentDate });
    this.loadData();
  },
  
  // 下一个日期
  nextDate() {
    const currentDate = new Date(this.data.currentDate);
    const today = new Date();
    
    // 计算下一个日期
    switch (this.data.activeTab) {
      case 'day':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'week':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'month':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'year':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }
    
    // 不允许选择未来的日期
    if (currentDate > today) {
      return;
    }
    
    this.setData({ currentDate });
    this.loadData();
  },
  
  // 加载数据
  loadData() {
    // 更新日期显示
    this.updateDateDisplay();
    
    // 生成日历数据
    this.generateCalendarData();
    
    // 加载专注时间数据
    this.loadFocusData();
    
  },
  
  // 更新日期显示
  updateDateDisplay() {
    const date = new Date(this.data.currentDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    
    let displayText = '';
    
    switch (this.data.activeTab) {
      case 'day':
        displayText = `${month}月${day}日 星期${weekday}`;
        break;
      case 'week':
        // 获取本周的开始日期和结束日期
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        displayText = `${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;
        break;
      case 'month':
        displayText = `${year}年${month}月`;
        break;
      case 'year':
        displayText = `${year}年`;
        break;
    }
    
    this.setData({ currentDateDisplay: displayText });
  },
  
  // 生成日历数据
  generateCalendarData() {
    const date = new Date(this.data.currentDate);
    const today = new Date();
    const todayStr = today.toLocaleDateString('sv');
    const focusLogs = wx.getStorageSync('focusLogs') || {};
    
    // 根据不同的标签页生成不同的日历数据
    if (['day', 'week'].includes(this.data.activeTab)) {
      let startDate = new Date(date);
      
      if (this.data.activeTab === 'day') {
        startDate.setDate(date.getDate() - date.getDay());
      } else {
        startDate.setDate(date.getDate() - date.getDay());
      }
      
      const calendarDays = [];
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toLocaleDateString('sv');
        
        let focusMinutes = 0;
        Object.keys(focusLogs).forEach(taskId => {
          focusMinutes += Math.floor((focusLogs[taskId][dateStr] || 0) / 60);
        });
        
        calendarDays.push({
          date: dateStr,
          day: currentDate.getDate(),
          isToday: dateStr === todayStr,
          hasFocus: focusMinutes > 0,
          focusMinutes: focusMinutes,
          isSelected: dateStr === date.toISOString().split('T')[0]
        });
      }
      this.setData({ calendarDays });
    } else if (this.data.activeTab === 'month') {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const daysInMonth = monthEnd.getDate();
      
      const calendarDays = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const currentDate = new Date(date.getFullYear(), date.getMonth(), i);
        const dateStr = currentDate.toLocaleDateString('sv');
        
        let focusMinutes = 0;
        Object.keys(focusLogs).forEach(taskId => {
          focusMinutes += Math.floor((focusLogs[taskId][dateStr] || 0) / 60);
        });
        
        calendarDays.push({
          date: dateStr,
          day: i,
          isToday: dateStr === todayStr,
          hasFocus: focusMinutes > 0,
          focusMinutes: focusMinutes,
          isSelected: false
        });
      }
      this.setData({ calendarDays });
    } else if (this.data.activeTab === 'year') {
      const calendarDays = [];
      for (let month = 0; month < 12; month++) {
        const monthDate = new Date(date.getFullYear(), month, 1);
        let monthlyFocus = 0;
        
        Object.keys(focusLogs).forEach(taskId => {
          const monthStr = monthDate.toLocaleDateString('sv').substring(0, 7);
          Object.keys(focusLogs[taskId]).forEach(dateStr => {
            if (dateStr.startsWith(monthStr)) {
              monthlyFocus += Math.floor(focusLogs[taskId][dateStr] / 60);
            }
          });
        });
        
        calendarDays.push({
          date: monthDate.toLocaleDateString('sv').substring(0, 7),
          day: month + 1,
          isToday: false,
          hasFocus: monthlyFocus > 0,
          focusMinutes: monthlyFocus,
          isSelected: false
        });
      }
      this.setData({ calendarDays });
    }
  },
  
  // 选择日历中的某一天
  selectCalendarDay(e) {
    const dateStr = e.currentTarget.dataset.date;
    const date = new Date(dateStr);
    
    this.setData({
      currentDate: date,
      activeTab: 'day' // 切换到日视图
    });
    
    this.loadData();
  },

  viewTaskDetail(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/Pages/tasks/detail/detail?id=' + taskId
    });
  },

  // 加载专注时间数据
  loadFocusData() {
    const focusLogs = wx.getStorageSync('focusLogs') || {};
    const tasks = wx.getStorageSync('tasks') || {};
    const goals = wx.getStorageSync('goals') || [];
    
    let totalSeconds = 0;
    const records = [];
    
    // 遍历所有任务的专注记录
    Object.keys(focusLogs).forEach(taskId => {
      const taskLog = focusLogs[taskId];
      const task = tasks.find(t => t.id === taskId);
      
      if (task) {
        // 查找任务对应的目标
        const goal = goals.find(g => g.id === task.goalId);
        const goalTitle = goal ? goal.title : '未关联目标';
        
        // 遍历该任务的所有日期记录
        Object.keys(taskLog).forEach(dateStr => {
          const seconds = taskLog[dateStr];
          totalSeconds += seconds;
          
          records.push({
            id: taskId,
            taskTitle: task.title,
            focusTime: this.formatFocusTime(seconds),
            date: goalTitle, // 使用目标名称代替日期
            seconds: seconds
          });
        });
      }
    });
    
    // 按专注时长排序记录
    records.sort((a, b) => b.seconds - a.seconds);
    
    // 更新数据
    this.setData({
      totalFocusMinutes: Math.floor(totalSeconds / 60),
      focusRecords: records
    });
  },
  
  
  // 格式化专注时间显示
  formatFocusTime(seconds) {
    if (seconds < 60) {
      return seconds + '秒';
    } else if (seconds < 3600) {
      return Math.floor(seconds / 60) + '分钟';
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return hours + '小时' + (minutes > 0 ? minutes + '分钟' : '');
    }
  }
})