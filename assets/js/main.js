// ScoutAI 网站交互脚本

document.addEventListener('DOMContentLoaded', function() {
  // 添加平滑滚动
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // 历史卡片点击效果
  document.querySelectorAll('.history-card').forEach(card => {
    card.addEventListener('click', function() {
      const link = this.querySelector('.history-link');
      if (link) {
        window.location.href = link.href;
      }
    });
  });

  console.log('🔍 ScoutAI 网站已加载');
});
