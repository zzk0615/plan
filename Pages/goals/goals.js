// pages/goals/goals.js
Page({
  data: {
    goals: [],
    completedGoals: [],
    ongoingGoals: [],
    hasGoals: false,
    loading: true
  },

  onLoad() {
    this.loadGoals();
  },

  onShow() {
    this.loadGoals();
  },

  loadGoals() {
    // 模拟加载数据
    this.setData({ loading: true });
    
    // 从本地存储获取目标数据
    const goals = wx.getStorageSync('goals') || [];
    
    // 计算每个目标的剩余天数
    const today = new Date();
    const processedGoals = goals.map(goal => {
      const processedGoal = {
  ...goal,
  description: goal.description
};
      
      // 计算剩余天数
      if (goal.endDate) {
        const endDate = new Date(goal.endDate.replace(/\//g, '-'));
        const timeDiff = endDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        processedGoal.remainingDays = daysDiff > 0 ? daysDiff : 0;
      } else {
        processedGoal.remainingDays = null;
      }
      
      return processedGoal;
    });
    
    // 预先过滤目标数据
    const completedGoals = processedGoals.filter(goal => goal.completed);
    const ongoingGoals = processedGoals.filter(goal => !goal.completed);
    
    setTimeout(() => {
      this.setData({
        goals: processedGoals,
        completedGoals: completedGoals,
        ongoingGoals: ongoingGoals,
        hasGoals: processedGoals.length > 0,
        loading: false
      });
    }, 500);
  },

  // 跳转到创建目标页面
  createGoal() {
    wx.navigateTo({
      url: '/Pages/goals/create/create'
    });
  },

  // 跳转到目标详情页面
  viewGoalDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/Pages/goals/detail/detail?id=${id}`
    });
  }
});