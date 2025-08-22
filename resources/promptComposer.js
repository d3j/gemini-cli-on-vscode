(function() {
    const vscode = acquireVsCodeApi();
    
    // DOM elements
    const promptInput = document.getElementById('prompt-input');
    const charCount = document.getElementById('char-count');
    const tokenCount = document.getElementById('token-count');
    const askAllBtn = document.getElementById('ask-all');
    // Context now uses button toggle (v4.3)
    const includeContextBtn = document.getElementById('include-context-btn');
    const previewContent = document.getElementById('preview-content');
    
    // State
    let currentContext = {};
    let persisted = {
        prompt: '',
        includeContext: true,
        agents: { gemini: true, codex: true, claude: true, qwen: false }
    };
    
    // Auto-resize textarea function
    function autoResizeTextarea() {
        const minHeight = 120;
        // VS Codeウィンドウの高さの90%を最大高さとする
        const viewportHeight = window.innerHeight;
        const maxHeight = Math.floor(viewportHeight * 0.9);
        
        // 一旦autoにしてコンテンツの高さを取得
        promptInput.style.height = 'auto';
        const scrollHeight = promptInput.scrollHeight;
        
        // 高さを設定（最小高さと最大高さの間）
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        promptInput.style.height = newHeight + 'px';
        
        // スクロールバーは常時表示（CSSで設定済み）
        promptInput.style.overflowY = 'scroll';
    }
    
    // IME composing state
    let isComposing = false;

    // Initialize
    function init() {
        // Restore persisted state
        const saved = vscode.getState && vscode.getState();
        if (saved) {
            persisted = Object.assign(persisted, saved);
        }

        // Apply saved state to UI
        promptInput.value = persisted.prompt || '';
        if (includeContextBtn) {
            includeContextBtn.classList.toggle('active', !!persisted.includeContext);
        }
        
        // Apply saved agent states to toggle buttons (v4.2)
        try {
            const geminiToggle = document.querySelector('.ai-toggle[data-agent="gemini"]');
            const codexToggle = document.querySelector('.ai-toggle[data-agent="codex"]');
            const claudeToggle = document.querySelector('.ai-toggle[data-agent="claude"]');
            const qwenToggle = document.querySelector('.ai-toggle[data-agent="qwen"]');
            
            if (geminiToggle) geminiToggle.classList.toggle('active', !!persisted.agents.gemini);
            if (codexToggle) codexToggle.classList.toggle('active', !!persisted.agents.codex);
            if (claudeToggle) claudeToggle.classList.toggle('active', !!persisted.agents.claude);
            if (qwenToggle) qwenToggle.classList.toggle('active', !!persisted.agents.qwen);
        } catch (e) {}

        vscode.postMessage({ type: 'composer/init' });
        
        // Notify extension that WebView is ready
        setTimeout(() => {
            vscode.postMessage({ type: 'composer/ready' });
        }, 100);
        
        // Set up event listeners
        promptInput.addEventListener('input', () => { 
            updateStats(); 
            saveState(); 
            autoResizeTextarea();  // 入力時に高さ自動調整
        });
        promptInput.addEventListener('input', debounce(() => { updatePreview(); }, 300));
        
        // Track IME composing to avoid interfering while composing
        promptInput.addEventListener('compositionstart', () => { isComposing = true; });
        promptInput.addEventListener('compositionend', () => { isComposing = false; });

        // Keyboard shortcut for quick submit (Ctrl+Enter or Cmd+Enter)
        promptInput.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleAskAll();
            }
            
            // PageUp/PageDownは独自処理でキャレット＋スクロールを1ページ分移動
            if (!isComposing && (e.key === 'PageUp' || e.key === 'PageDown')) {
                e.preventDefault();
                const direction = e.key === 'PageDown' ? 'down' : 'up';
                handlePageNavigation(promptInput, direction);
            }
        });
        
        // 既定のフォールバックは不要（高精度調整を内蔵）
        
        askAllBtn.addEventListener('click', handleAskAll);
        
        // Context button event listener (v4.3)
        if (includeContextBtn) {
            includeContextBtn.addEventListener('click', () => {
                includeContextBtn.classList.toggle('active');
                saveState();
                updatePreview();
            });
        }
        
        // Agent toggle buttons (v4.2)
        document.querySelectorAll('.ai-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.currentTarget.classList.toggle('active');
                updateAgentCount();
                saveState();
            });
        });
        
        updateStats();
        autoResizeTextarea();  // 初期表示時にも高さ調整
        
        // ウィンドウサイズ変更時にも最大高さを再計算
        window.addEventListener('resize', debounce(() => {
            autoResizeTextarea();
        }, 100));
    }
    
    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'composer/state':
                handleStateUpdate(message.payload);
                break;
            case 'composer/error':
                showError(message.payload.message);
                break;
            case 'composer/contextAdded':
                handleContextAdded(message.payload);
                break;
            case 'composer/previewUpdate':
                handlePreviewUpdate(message.payload);
                break;
            case 'composer/setPrompt':
                handleSetPrompt(message.payload);
                break;
        }
    });
    
    function handleStateUpdate(state) {
        // Set default agents (v4.2 - using toggle buttons)
        if (state.defaultAgents) {
            document.querySelectorAll('.ai-toggle').forEach(toggle => {
                const agentName = toggle.dataset.agent;
                // Keep user's persisted choice as priority; otherwise use defaults
                const persistedValue = (persisted.agents || {})[agentName];
                if (typeof persistedValue === 'boolean') {
                    toggle.classList.toggle('active', persistedValue);
                } else {
                    toggle.classList.toggle('active', state.defaultAgents.includes(agentName));
                }
            });
        }
        
        
        // Context indicators removed - only Include Context button remains
        
        updateAgentCount();
        saveState();
    }
    
    function handleAskAll() {
        const prompt = promptInput.value.trim();
        
        if (!prompt) {
            showError('Please enter a prompt');
            return;
        }
        
        const agents = getSelectedAgents();
        
        if (agents.length === 0) {
            showError('Please select at least one AI agent');
            return;
        }
        
        vscode.postMessage({
            type: 'composer/askAll',
            payload: {
                prompt,
                agents,
                includeContext: includeContextBtn.classList.contains('active')
            }
        });
        // Save state on send
        saveState();
    }
    
    // Context addition removed - Include Context button handles file paths only
    
    function handleContextAdded(context) {
        // Context indicators removed
        updatePreview();
    }
    
    function updateStats() {
        const text = promptInput.value;
        const chars = text.length;
        const tokens = Math.ceil(chars / 4); // Rough estimate
        
        charCount.textContent = chars;
        tokenCount.textContent = tokens;
        
        // Update button state
        askAllBtn.disabled = chars === 0;
    }
    
    function updatePreview() {
        vscode.postMessage({
            type: 'composer/preview',
            payload: {
                prompt: promptInput.value,
                includeContext: includeContextBtn.classList.contains('active')
            }
        });
    }
    
    function handlePreviewUpdate(data) {
        let preview = data.preview;
        
        // Format preview
        if (preview) {
            preview = preview.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        } else {
            preview = '<em>Your prompt will appear here...</em>';
        }
        
        previewContent.innerHTML = preview;
        
        // Update stats with context
        charCount.textContent = data.characterCount || 0;
        tokenCount.textContent = data.estimatedTokens || 0;
    }
    
    function handleSetPrompt(payload) {
        if (payload && payload.text) {
            // Always append to existing content
            if (promptInput.value) {
                promptInput.value += '\n\n' + payload.text;
            } else {
                promptInput.value = payload.text;
            }
            
            // Update UI state
            updateStats();
            autoResizeTextarea();
            saveState();
            
            // Focus and move cursor to end
            promptInput.focus();
            promptInput.setSelectionRange(promptInput.value.length, promptInput.value.length);
        }
    }
    
    function getSelectedAgents() {
        const agents = [];
        document.querySelectorAll('.ai-toggle.active').forEach(toggle => {
            agents.push(toggle.dataset.agent);
        });
        return agents;
    }

    function saveState() {
        const state = {
            prompt: promptInput.value,
            includeContext: includeContextBtn?.classList.contains('active') ?? true,
            agents: {
                gemini: document.querySelector('.ai-toggle[data-agent="gemini"]')?.classList.contains('active') ?? true,
                codex: document.querySelector('.ai-toggle[data-agent="codex"]')?.classList.contains('active') ?? true,
                claude: document.querySelector('.ai-toggle[data-agent="claude"]')?.classList.contains('active') ?? true,
                qwen: document.querySelector('.ai-toggle[data-agent="qwen"]')?.classList.contains('active') ?? false,
            }
        };
        try { vscode.setState && vscode.setState(state); } catch (e) {}
        persisted = state;
    }
    
    function updateAgentCount() {
        const count = getSelectedAgents().length;
        if (count > 0) {
            askAllBtn.textContent = `🔮 Ask ${count} AIs`;
            askAllBtn.title = 'Send to selected AIs (Ctrl+Enter)';
        } else {
            askAllBtn.textContent = '🔒 Select AIs';
            askAllBtn.title = 'Select at least one AI to enable sending';
        }
    }
    
    function showError(message) {
        // Create a temporary error element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(errorDiv);
            }, 300);
        }, 3000);
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // キャレットを1ページ分（可視高さ基準）上下に移動し、上下端に揃えてスクロールを補正
    function handlePageNavigation(textarea, direction /* 'down' | 'up' */) {
        const len = textarea.value.length;
        const currentPos = textarea.selectionEnd;

        withMirrorMeasurement(textarea, (measure) => {
            const cur = measure(currentPos);
            const cs = window.getComputedStyle(textarea);
            const padTop = parseFloat(cs.paddingTop) || 0;
            const padBottom = parseFloat(cs.paddingBottom) || 0;
            const clientH = textarea.clientHeight;
            const lineH = parseFloat(cs.lineHeight) || cur.height || 16;
            const pageStep = Math.max(1, clientH - lineH); // 1ページ分（行高さを少し残す）

            // 目標となるコンテンツ内のY位置
            const targetTop = direction === 'down'
                ? cur.top + pageStep
                : Math.max(0, cur.top - pageStep);

            // targetTopに最も近い文字オフセットを二分探索で探す
            const newPos = findPositionForTop(textarea, targetTop, measure, direction);
            const next = measure(newPos);

            // キャレット移動
            textarea.setSelectionRange(newPos, newPos);

            // 上下端に揃えるようscrollTopを補正
            const maxScrollTop = Math.max(0, textarea.scrollHeight - clientH);
            const margin = 4; // 視認性の余白
            let targetScroll;
            if (direction === 'down') {
                targetScroll = next.top - (clientH - next.height - padBottom - margin);
            } else {
                targetScroll = next.top - (padTop + margin);
            }
            textarea.scrollTop = Math.max(0, Math.min(maxScrollTop, Math.round(targetScroll)));
        });
    }

    // targetTop（px）に最も近い文字位置を二分探索で求める
    function findPositionForTop(textarea, targetTop, measure, direction) {
        let left = 0;
        let right = textarea.value.length;
        // 探索範囲を方向に応じて近傍から始める最適化（任意）
        // 今回はシンプルに全域探索

        while (left < right) {
            const mid = (left + right) >>> 1;
            const m = measure(mid);
            if (m.top < targetTop) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        // leftが最小の>=targetTopの位置。上下に少し微調整して近い方を採用
        const cand1 = Math.max(0, left - 1);
        const cand2 = Math.min(textarea.value.length, left);
        const d1 = Math.abs(measure(cand1).top - targetTop);
        const d2 = Math.abs(measure(cand2).top - targetTop);
        return d2 < d1 ? cand2 : cand1;
    }

    // ミラー要素を1回だけ構築して、measure(pos)で座標計測できるようにするユーティリティ
    function withMirrorMeasurement(textarea, callback) {
        const style = window.getComputedStyle(textarea);
        const div = document.createElement('div');
        const span = document.createElement('span');
        const textNode = document.createTextNode('');

        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordWrap = 'break-word';
        div.style.top = '0px';
        div.style.left = '-9999px';

        const props = [
            'boxSizing','paddingTop','paddingRight','paddingBottom','paddingLeft',
            'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
            'fontStyle','fontVariant','fontWeight','fontStretch','fontSize','lineHeight','fontFamily',
            'textAlign','textTransform','textIndent','textDecoration','letterSpacing','wordSpacing',
            'direction'
        ];
        props.forEach(p => { div.style[p] = style[p]; });
        div.style.width = textarea.clientWidth + 'px';
        div.style.height = 'auto';
        div.style.overflow = 'visible';

        // 子は [textNode, span] の順に配置（measureでtextNodeだけを書き換える）
        div.appendChild(textNode);
        div.appendChild(span);
        document.body.appendChild(div);

        const value = textarea.value;

        function measure(pos) {
            // 文字数に応じて更新（textNodeの中身だけを差し替える）
            const text = value.substring(0, pos);
            textNode.nodeValue = text.length ? text : ' ';
            // spanはキャレット位置。ゼロ幅スペースで高さ/位置を得る
            span.textContent = '\u200b';

            const rect = span.getBoundingClientRect();
            const containerRect = div.getBoundingClientRect();
            const top = rect.top - containerRect.top;
            const height = rect.height || parseFloat(style.lineHeight) || 16;
            return { top, height };
        }

        try {
            callback(measure);
        } finally {
            document.body.removeChild(div);
        }
    }

    // キャレット座標をベースにscrollTopを補正して、
    // PageDown時は最下部、PageUp時は最上部にキャレットが来るようにする
    function adjustScrollForCaret(textarea, direction /* 'down' | 'up' */) {
        try {
            const pos = textarea.selectionEnd;
            const coords = getCaretCoordinates(textarea, pos);
            const cs = window.getComputedStyle(textarea);
            const padTop = parseFloat(cs.paddingTop) || 0;
            const padBottom = parseFloat(cs.paddingBottom) || 0;
            const clientH = textarea.clientHeight;
            const maxScrollTop = Math.max(0, textarea.scrollHeight - clientH);
            const margin = 4; // 視認性のための僅かな余白

            // コンテンツ先頭からキャレットまでの距離（px）
            const caretTopInContent = coords.top;

            let target;
            if (direction === 'down') {
                // キャレットが可視領域の最下部に位置するように
                target = caretTopInContent - (clientH - coords.height - padBottom - margin);
            } else {
                // キャレットが可視領域の最上部に位置するように
                target = caretTopInContent - (padTop + margin);
            }

            const next = Math.max(0, Math.min(maxScrollTop, Math.round(target)));
            if (!Number.isNaN(next)) textarea.scrollTop = next;
        } catch (e) {
            // 失敗時は何もしない（既定のスクロールに委ねる）
        }
    }

    // 簡易ミラーを使ってtextarea内キャレットの座標（コンテンツ先頭からの距離）を推定
    function getCaretCoordinates(textarea, position) {
        const style = window.getComputedStyle(textarea);
        const div = document.createElement('div');
        const span = document.createElement('span');

        // ミラーのベース設定
        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordWrap = 'break-word';
        div.style.top = '0px';
        div.style.left = '-9999px';

        // textareaの表示と同等になるよう、主要なスタイルをコピー
        const props = [
            'boxSizing','paddingTop','paddingRight','paddingBottom','paddingLeft',
            'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
            'fontStyle','fontVariant','fontWeight','fontStretch','fontSize','lineHeight','fontFamily',
            'textAlign','textTransform','textIndent','textDecoration','letterSpacing','wordSpacing',
            'direction'
        ];
        props.forEach(p => { div.style[p] = style[p]; });

        // 実寸に合わせる（スクロールバーを除いた幅を使う）
        div.style.width = textarea.clientWidth + 'px';
        div.style.height = 'auto';
        div.style.overflow = 'visible';

        // キャレット直前までのテキスト
        const textBefore = textarea.value.substring(0, position);
        div.textContent = textBefore.length ? textBefore : ' ';

        // キャレット位置の測定用にspanを追加（ゼロ幅スペース）
        span.textContent = textBefore.length ? '\u200b' : ' ';
        div.appendChild(span);
        document.body.appendChild(div);

        const rect = span.getBoundingClientRect();
        const containerRect = div.getBoundingClientRect();
        const top = rect.top - containerRect.top;
        const height = rect.height || parseFloat(style.lineHeight) || 16;

        document.body.removeChild(div);
        return { top, height };
    }
    
    // Add animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
