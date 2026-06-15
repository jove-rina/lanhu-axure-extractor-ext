/**
 * 蓝湖 Axure 需求提取器 — 后台服务脚本
 *
 * 职责精简：仅保留消息中继和 frame 查询支持
 * 下载/提取逻辑已移至 popup 直接与 content script 通信
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'ping':
      sendResponse({ pong: true });
      break;

    case 'get-tab-info':
      if (!sender.tab) {
        sendResponse({ error: 'no tab' });
        return;
      }
      chrome.tabs.get(sender.tab.id, tab => {
        sendResponse({ url: tab.url, title: tab.title, id: tab.id });
      });
      return true;
  }
});

console.log('[蓝湖提取器] 后台服务已启动 (精简模式)');
