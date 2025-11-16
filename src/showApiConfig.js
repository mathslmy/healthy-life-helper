export async function showApiConfig(MODULE_NAME, ctx, saveSettings, debugLog, content){
        content.style.display = 'block';
        // 使 content 相对定位，便于右上角设置按钮定位
        content.style.position = 'relative';
        const cfg = ctx.extensionSettings[MODULE_NAME].apiConfig || {};
        content.innerHTML = `
          <div style="font-weight:600;margin-bottom:6px">独立 API 配置</div>

          <div style="margin-bottom:6px">
            <label style="font-size:12px;color:#666;display:block">API URL</label>
            <input id="ha-api-url" type="text" style="width:100%;padding:6px" value="${cfg.url || ''}" />
          </div>

          <div style="margin-bottom:6px">
            <label style="font-size:12px;color:#666;display:block">API Key</label>
            <input id="ha-api-key" type="text" style="width:100%;padding:6px" value="${cfg.key || ''}" />
          </div>

          <div style="margin-bottom:6px">
            <label style="font-size:12px;color:#666;display:block">模型</label>
            <select id="ha-api-model" style="width:100%;padding:6px"></select>
          </div>

          <div style="display:flex;gap:8px;margin-bottom:6px">
            <button id="ha-api-save" class="ha-btn" style="flex:1">保存配置</button>
            <button id="ha-api-test" class="ha-btn" style="flex:1">测试连接</button>
            <button id="ha-api-refresh" class="ha-btn" style="flex:1">刷新模型</button>
          </div>

          <div id="ha-api-status" class="ha-small"></div>
        `;

        // 小齿轮按钮（参考）
        const apiBtn = document.createElement('button');
        apiBtn.textContent = '⚙️';
        Object.assign(apiBtn.style, {
          position: 'absolute',
          top: '6px',
          right: '6px',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          fontSize: '16px'
        });
        content.appendChild(apiBtn);

        const apiModule = document.createElement('div');
        apiModule.id = 'api-module';
        Object.assign(apiModule.style, {
          marginTop: '28px',
          display: 'none'
        });
        content.appendChild(apiModule);

        apiBtn.addEventListener('click', async () => {
          apiModule.style.display = apiModule.style.display === 'none' ? 'block' : 'none';
          debugLog('切换API设置面板', apiModule.style.display);
          // 当面板第一次打开时，尝试自动拉取模型（如果未曾拉取过）
          if (apiModule.style.display === 'block') {
            try {
              await fetchAndPopulateModels(false); // 不强制，第一次会拉取一次并记录时间
            } catch (e) {
              // fetch 内部已经有 debugLog，这里仅捕获防止未处理的 promise
            }
          }
        });

        // API模块表单（包含刷新模型按钮）
        // （因已在 content.innerHTML 中提供基础表单，这里只负责将 apiModule 放置用于额外展示）
        apiModule.innerHTML = `
          <div style="font-size:12px;color:#666">（模型列表与额外信息会出现在此区域）</div>
        `;

        // 载入已有配置到 localStorage 兼容（保持向后兼容）
        const modelSelect = document.getElementById('ha-api-model');
        const savedModel = localStorage.getItem('independentApiModel') || cfg.model || '';

        // populateModelSelect 函数
        function populateModelSelect(models) {
          modelSelect.innerHTML = '';
          const uniq = Array.from(new Set(models || []));
          uniq.forEach(m => {
            const option = document.createElement('option');
            option.value = m;
            option.textContent = m;
            modelSelect.appendChild(option);
          });
          if (savedModel) {
            let existing = Array.from(modelSelect.options).find(o => o.value === savedModel);
            if (existing) {
              existing.textContent = savedModel + '（已保存）';
              modelSelect.value = savedModel;
            } else {
              const opt = document.createElement('option');
              opt.value = savedModel;
              opt.textContent = savedModel + '（已保存）';
              modelSelect.insertBefore(opt, modelSelect.firstChild);
              modelSelect.value = savedModel;
            }
          } else if (modelSelect.options.length > 0) {
            modelSelect.selectedIndex = 0;
          }
        }

        const storedModelsRaw = localStorage.getItem('independentApiModels');
        if (storedModelsRaw) {
          try {
            const arr = JSON.parse(storedModelsRaw);
            if (Array.isArray(arr)) populateModelSelect(arr);
          } catch (e) { /* ignore parse errors */ }
        } else if (savedModel) {
          const option = document.createElement('option');
          option.value = savedModel;
          option.textContent = savedModel + '（已保存）';
          modelSelect.appendChild(option);
          modelSelect.value = savedModel;
        }

        // 保存配置
        document.getElementById('ha-api-save').addEventListener('click', () => {
          const url = document.getElementById('ha-api-url').value;
          const key = document.getElementById('ha-api-key').value;
          const model = modelSelect.value;
          if(!url || !model) {
            alert('请完整填写API信息（至少 URL 与 模型）');
            return;
          }
          // 将 Key 视为可选（但通常需要）
          localStorage.setItem('independentApiUrl', url);
          if (key) localStorage.setItem('independentApiKey', key);
          if (model) localStorage.setItem('independentApiModel', model);
          // 同步到 extensionSettings
          ctx.extensionSettings[MODULE_NAME].apiConfig = { url, key, model };
          saveSettings();
          // 标记选中 option 为已保存样式
          Array.from(modelSelect.options).forEach(o => {
            if (o.value === model) o.textContent = model + '（已保存）';
            else if (o.textContent.endsWith('（已保存）')) o.textContent = o.value;
          });
          document.getElementById('ha-api-status').textContent = '已保存';
          debugLog('保存API配置', {url, model});
        });

        // 测试连接（优先 GET /v1/models/{model}，fallback 到 chat/completions）
        document.getElementById('ha-api-test').addEventListener('click', async () => {
          const urlRaw = document.getElementById('ha-api-url').value || localStorage.getItem('independentApiUrl');
          const key = document.getElementById('ha-api-key').value || localStorage.getItem('independentApiKey');
          const model = modelSelect.value || localStorage.getItem('independentApiModel');

          if (!urlRaw || !model) return alert('请至少填写 API URL 与 模型');

          const baseUrl = urlRaw.replace(/\/$/, '');
          document.getElementById('ha-api-status').textContent = '正在测试模型：' + model + ' ...';
          debugLog('测试连接开始', { baseUrl, model });

          try {
            // 1) 先尝试 GET /v1/models/{model}（许多实现支持）
            let res = await fetch(`${baseUrl}/v1/models/${encodeURIComponent(model)}`, {
              headers: { ...(key ? { 'Authorization': `Bearer ${key}` } : {}) }
            });

            if (res.ok) {
              const info = await res.json();
              document.getElementById('ha-api-status').textContent = `模型 ${model} 可用（metadata 校验通过）`;
              debugLog('GET /v1/models/{model} 成功', info);
              return;
            }

            // 2) 若 1) 不可用，退回到一次极轻量的 chat/completions 验证
            debugLog('GET model 信息失败，尝试用 chat/completions 验证', { status: res.status });
            res = await fetch(`${baseUrl}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                ...(key ? { 'Authorization': `Bearer ${key}` } : {}),
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 1
              })
            });

            if (!res.ok) throw new Error(`chat/completions 返回 HTTP ${res.status}`);

            const data = await res.json();
            document.getElementById('ha-api-status').textContent = `模型 ${model} 可用（通过 chat/completions 验证）`;
            debugLog('chat/completions 验证成功', data);
          } catch (e) {
            document.getElementById('ha-api-status').textContent = '连接失败: ' + (e.message || e);
            debugLog('测试连接失败', e.message || e);
          }
        });

        // 刷新模型（手动强制拉取）
        document.getElementById('ha-api-refresh').addEventListener('click', async () => {
          debugLog('手动触发刷新模型');
          await fetchAndPopulateModels(true); // 强制拉取
        });

        // 解析常见的模型列表响应结构，返回字符串数组（模型 id）
        function parseModelIdsFromResponse(data) {
          try {
            if (!data) return [];
            if (Array.isArray(data.data)) return data.data.map(m => m.id || m.model || m.name).filter(Boolean);
            if (Array.isArray(data.models)) return data.models.map(m => m.id || m.model || m.name).filter(Boolean);
            if (Array.isArray(data)) return data.map(m => m.id || m.model || m.name).filter(Boolean);
            // 有些实现直接返回 { model: 'xxx' } 或 { id: 'xxx' }
            if (data.model) return [data.model];
            if (data.id) return [data.id];
          } catch (e) { /* ignore */ }
          return [];
        }

        // 从独立 API 拉取模型并填充下拉框。
        // force=true 表示绕过“记过一次”的检查，强制拉取。
        async function fetchAndPopulateModels(force = false) {
          const url = document.getElementById('ha-api-url').value || localStorage.getItem('independentApiUrl');
          const key = document.getElementById('ha-api-key').value || localStorage.getItem('independentApiKey');
          if (!url || !key) {
            debugLog('拉取模型失败', '未配置 URL 或 Key');
            document.getElementById('ha-api-status').textContent = '请先在上方填写 API URL 和 API Key，然后保存或点击刷新。';
            return;
          }

          const lastFetch = localStorage.getItem('independentApiModelsFetchedAt');
          if (!force && lastFetch) {
            // 已经记录过一次拉取时间，不再自动重复拉取（可以手动刷新）
            const ts = new Date(parseInt(lastFetch, 10));
            document.getElementById('ha-api-status').textContent = `模型已在 ${ts.toLocaleString()} 拉取过一次。若需更新请点击“刷新模型”。`;
            debugLog('跳过自动拉取模型（已记过一次）', { lastFetch: ts.toString() });
            return;
          }

          document.getElementById('ha-api-status').textContent = '正在拉取模型...';
          debugLog('开始拉取模型', { url, force });
          try {
            const res = await fetch(`${url.replace(/\/$/, '')}/v1/models`, {
              headers: { ...(key ? { 'Authorization': `Bearer ${key}` } : {}) }
            });
            if(!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            debugLog('拉取模型返回原始数据', data);

            const ids = parseModelIdsFromResponse(data);
            if (ids.length === 0) {
              document.getElementById('ha-api-status').textContent = '未从 API 返回可用模型。';
              debugLog('未解析到模型ID', data);
              return;
            }

            // 保存模型列表到 localStorage（便于下次加载）
            localStorage.setItem('independentApiModels', JSON.stringify(ids));
            const now = Date.now();
            localStorage.setItem('independentApiModelsFetchedAt', String(now)); // 记过一次（时间戳）
            populateModelSelect(ids);

            document.getElementById('ha-api-status').textContent = `拉取成功，已填充 ${ids.length} 个模型（最后拉取: ${new Date(now).toLocaleString()}）。`;
            debugLog('拉取模型成功', { count: ids.length, first: ids[0] });
          } catch (e) {
            document.getElementById('ha-api-status').textContent = '拉取模型失败: ' + e.message;
            debugLog('拉取模型失败', e.message);
          }
        }

        // 首次打开时尝试拉取（非强制：会遵循已拉取过则不重复）
        fetchAndPopulateModels(false);
      }

     

    } catch (err) {
      console.error('健康生活助手初始化失败', err);
    }
  });
