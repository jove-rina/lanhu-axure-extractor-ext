/**
 * 蓝湖 Axure 需求提取器 — Popup
 * 支持全页提取 + 拾取模式（点击元素提取）
 /**
  * 蓝湖 Axure 需求提取器 — Popup
  * 文档构建模式：打开构建器浮动面板
  */

 (function () {
   'use strict';

   const DOM = {
     statusDot: document.getElementById('statusDot'),
     statusText: document.getElementById('statusText'),
     btnBuilder: document.getElementById('btnBuilder'),
   };

   function setStatus(text, type = 'ready') {
     DOM.statusText.textContent = text;
     DOM.statusDot.className = 'status-dot ' + type;
   }

   async function openBuilder() {
     setStatus('正在打开文档构建器...', 'busy');
     try {
       const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
       if (!tab || !tab.url || !tab.url.includes('lanhuapp.com')) {
         setStatus('⚠️ 请在 lanhuapp.com 上使用', 'error');
         return;
       }
       await chrome.tabs.sendMessage(tab.id, { action: 'open-builder' });
       setStatus('✅ 文档构建器已打开', 'ready');
       window.close();
     } catch (err) {
       setStatus('⚠️ 请刷新页面后重试 (' + err.message + ')', 'error');
     }
   }

   async function init() {
     try {
       const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
       if (!tab || !tab.url || !tab.url.includes('lanhuapp.com')) {
         setStatus('⚠️ 不在蓝湖页面', 'error');
       }
     } catch {}
   }

   DOM.btnBuilder.addEventListener('click', openBuilder);
   init();
 })();
