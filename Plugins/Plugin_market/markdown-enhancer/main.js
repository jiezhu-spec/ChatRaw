/**
 * Markdown Renderer Plus - Enhanced Markdown rendering for ChatRaw
 * 
 * Features:
 * - KaTeX math formulas ($...$ and $$...$$)
 * - Mermaid diagrams (```mermaid code blocks)
 * - Code copy buttons
 * - Extended syntax highlighting (15+ languages)
 * 
 * Fully offline - all dependencies bundled locally.
 */
(function(ChatRawPlugin) {
    'use strict';
    
    const PLUGIN_ID = 'markdown-enhancer';
    const LIB_BASE = `/api/plugins/${PLUGIN_ID}/lib`;
    
    // ============ State ============
    let katexLoaded = false;
    let mermaidLoaded = false;
    let extraLangsLoaded = false;
    let copyButtonsInitialized = false;
    let mermaidCounter = 0;
    
    // ============ i18n ============
    const i18n = {
        en: {
            copied: 'Copied!',
            copyFailed: 'Copy failed',
            copy: 'Copy',
            renderError: 'Render error',
            loading: 'Loading...'
        },
        zh: {
            copied: '已复制！',
            copyFailed: '复制失败',
            copy: '复制',
            renderError: '渲染错误',
            loading: '加载中...'
        }
    };
    
    function t(key) {
        const lang = ChatRawPlugin?.utils?.getLanguage?.() || 'en';
        return i18n[lang]?.[key] || i18n.en[key] || key;
    }
    
    // ============ CSS Loader ============
    function loadCSS(url) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`link[href="${url}"]`);
            if (existing) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = resolve;
            link.onerror = () => reject(new Error(`Failed to load CSS: ${url}`));
            document.head.appendChild(link);
        });
    }
    
    // ============ Script Loader ============
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${url}"]`);
            if (existing) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }
    
    // ============ Initialize Dependencies ============
    async function initKatex() {
        if (katexLoaded) return true;
        
        try {
            await loadCSS(`${LIB_BASE}/katex.min.css`);
            await loadScript(`${LIB_BASE}/katex.min.js`);
            
            if (window.katex) {
                katexLoaded = true;
                console.log('[MarkdownEnhancer] KaTeX loaded');
                return true;
            }
        } catch (e) {
            console.error('[MarkdownEnhancer] Failed to load KaTeX:', e);
        }
        return false;
    }
    
    async function initMermaid(theme = 'default') {
        if (mermaidLoaded) return true;
        
        try {
            await loadScript(`${LIB_BASE}/mermaid.min.js`);
            
            if (window.mermaid) {
                // Initialize mermaid with theme
                window.mermaid.initialize({
                    startOnLoad: false,
                    theme: theme === 'dark' ? 'dark' : theme,
                    securityLevel: 'loose',
                    fontFamily: 'inherit'
                });
                mermaidLoaded = true;
                console.log('[MarkdownEnhancer] Mermaid loaded');
                return true;
            }
        } catch (e) {
            console.error('[MarkdownEnhancer] Failed to load Mermaid:', e);
        }
        return false;
    }
    
    async function initExtraLanguages() {
        if (extraLangsLoaded || !window.hljs) return;
        
        const languages = [
            'typescript', 'go', 'rust', 'java', 'c', 'cpp', 'csharp',
            'ruby', 'php', 'swift', 'kotlin', 'sql', 'yaml', 'xml', 'shell'
        ];
        
        try {
            for (const lang of languages) {
                try {
                    await loadScript(`${LIB_BASE}/hljs-${lang}.min.js`);
                } catch (e) {
                    // Ignore individual language load failures
                }
            }
            extraLangsLoaded = true;
            console.log('[MarkdownEnhancer] Extra languages loaded');
        } catch (e) {
            console.error('[MarkdownEnhancer] Failed to load extra languages:', e);
        }
    }
    
    // ============ KaTeX Rendering ============
    function renderKatex(content) {
        if (!window.katex) return content;
        
        // Block math: $$...$$ or \[...\]
        content = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
            try {
                return `<div class="katex-block">${window.katex.renderToString(formula.trim(), {
                    displayMode: true,
                    throwOnError: false,
                    output: 'html'
                })}</div>`;
            } catch (e) {
                console.error('[MarkdownEnhancer] KaTeX block error:', e);
                return `<div class="katex-error" title="${t('renderError')}">${match}</div>`;
            }
        });
        
        content = content.replace(/\\\[([\s\S]+?)\\\]/g, (match, formula) => {
            try {
                return `<div class="katex-block">${window.katex.renderToString(formula.trim(), {
                    displayMode: true,
                    throwOnError: false,
                    output: 'html'
                })}</div>`;
            } catch (e) {
                return `<div class="katex-error" title="${t('renderError')}">${match}</div>`;
            }
        });
        
        // Inline math: $...$ or \(...\)
        // Be careful not to match $$ or currency like $100
        content = content.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (match, formula) => {
            // Skip if it looks like currency ($100, $50.00)
            if (/^\d+(\.\d+)?$/.test(formula.trim())) {
                return match;
            }
            try {
                return window.katex.renderToString(formula.trim(), {
                    displayMode: false,
                    throwOnError: false,
                    output: 'html'
                });
            } catch (e) {
                return `<span class="katex-error" title="${t('renderError')}">${match}</span>`;
            }
        });
        
        content = content.replace(/\\\(([\s\S]+?)\\\)/g, (match, formula) => {
            try {
                return window.katex.renderToString(formula.trim(), {
                    displayMode: false,
                    throwOnError: false,
                    output: 'html'
                });
            } catch (e) {
                return `<span class="katex-error" title="${t('renderError')}">${match}</span>`;
            }
        });
        
        return content;
    }
    
    // ============ Mermaid Rendering ============
    function renderMermaid(content) {
        if (!window.mermaid) return content;
        
        // Match ```mermaid code blocks (already rendered by marked.js as <pre><code class="language-mermaid">)
        // We need to replace the <pre><code> with mermaid container
        const mermaidBlockRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi;
        
        content = content.replace(mermaidBlockRegex, (match, code) => {
            const id = `mermaid-${Date.now()}-${mermaidCounter++}`;
            // Decode HTML entities
            const decodedCode = code
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim();
            
            // Schedule async rendering
            setTimeout(async () => {
                const container = document.getElementById(id);
                if (!container) return;
                
                try {
                    const { svg } = await window.mermaid.render(`${id}-svg`, decodedCode);
                    container.innerHTML = svg;
                    container.classList.remove('mermaid-loading');
                    container.classList.add('mermaid-rendered');
                } catch (e) {
                    console.error('[MarkdownEnhancer] Mermaid render error:', e);
                    container.innerHTML = `<div class="mermaid-error">
                        <strong>${t('renderError')}:</strong> ${e.message || 'Unknown error'}
                        <pre>${decodedCode}</pre>
                    </div>`;
                    container.classList.remove('mermaid-loading');
                    container.classList.add('mermaid-error');
                }
            }, 50);
            
            return `<div id="${id}" class="mermaid-container mermaid-loading">
                <div class="mermaid-loading-text">${t('loading')}</div>
            </div>`;
        });
        
        return content;
    }
    
    // ============ Code Copy Buttons ============
    function initCopyButtons() {
        if (copyButtonsInitialized) return;
        
        // Inject styles for copy button
        const styleId = 'markdown-enhancer-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* Code copy button */
                .message-content pre {
                    position: relative;
                }
                .code-copy-btn {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    padding: 4px 8px;
                    font-size: 12px;
                    background: var(--bg-tertiary, #e5e5e5);
                    color: var(--text-secondary, #666);
                    border: 1px solid var(--border-color, #ddd);
                    border-radius: 4px;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.2s, background 0.2s;
                    z-index: 10;
                }
                .message-content pre:hover .code-copy-btn {
                    opacity: 1;
                }
                .code-copy-btn:hover {
                    background: var(--bg-hover, #d5d5d5);
                }
                .code-copy-btn.copied {
                    background: var(--success-color, #10b981);
                    color: white;
                    border-color: var(--success-color, #10b981);
                }
                
                /* KaTeX styles */
                .katex-block {
                    display: block;
                    text-align: center;
                    margin: 1em 0;
                    overflow-x: auto;
                }
                .katex-error {
                    color: var(--error-color, #ef4444);
                    background: rgba(239, 68, 68, 0.1);
                    padding: 2px 4px;
                    border-radius: 2px;
                    font-family: monospace;
                }
                
                /* Mermaid styles */
                .mermaid-container {
                    display: flex;
                    justify-content: center;
                    margin: 1em 0;
                    padding: 1em;
                    background: var(--bg-secondary, #f5f5f5);
                    border-radius: 8px;
                    overflow-x: auto;
                }
                .mermaid-loading {
                    min-height: 100px;
                    align-items: center;
                }
                .mermaid-loading-text {
                    color: var(--text-secondary, #666);
                    font-style: italic;
                }
                .mermaid-error {
                    color: var(--error-color, #ef4444);
                    background: rgba(239, 68, 68, 0.1);
                }
                .mermaid-error pre {
                    margin-top: 8px;
                    font-size: 12px;
                    white-space: pre-wrap;
                }
                .mermaid-rendered svg {
                    max-width: 100%;
                    height: auto;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Use MutationObserver to add copy buttons to new code blocks
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        addCopyButtonsToElement(node);
                    }
                }
            }
        });
        
        // Start observing
        const messagesContainer = document.querySelector('.messages-container') || document.body;
        observer.observe(messagesContainer, {
            childList: true,
            subtree: true
        });
        
        // Add to existing code blocks
        addCopyButtonsToElement(document.body);
        
        copyButtonsInitialized = true;
        console.log('[MarkdownEnhancer] Copy buttons initialized');
    }
    
    function addCopyButtonsToElement(element) {
        const codeBlocks = element.querySelectorAll('.message-content pre');
        codeBlocks.forEach(pre => {
            // Skip if already has copy button
            if (pre.querySelector('.code-copy-btn')) return;
            
            const code = pre.querySelector('code');
            if (!code) return;
            
            const btn = document.createElement('button');
            btn.className = 'code-copy-btn';
            btn.textContent = t('copy');
            btn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    await navigator.clipboard.writeText(code.textContent);
                    btn.textContent = t('copied');
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = t('copy');
                        btn.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    console.error('[MarkdownEnhancer] Copy failed:', err);
                    btn.textContent = t('copyFailed');
                    setTimeout(() => {
                        btn.textContent = t('copy');
                    }, 2000);
                }
            };
            
            pre.appendChild(btn);
        });
    }
    
    // ============ Register Hooks ============
    ChatRawPlugin.hooks.register('after_receive', {
        priority: 10,
        
        handler: async (message) => {
            if (!message?.content) {
                return { success: false };
            }
            
            // Get plugin settings
            let settings = {};
            try {
                const res = await fetch('/api/plugins');
                if (res.ok) {
                    const plugins = await res.json();
                    const plugin = plugins.find(p => p.id === PLUGIN_ID);
                    if (plugin?.settings_values) {
                        settings = plugin.settings_values;
                    }
                }
            } catch (e) {
                console.error('[MarkdownEnhancer] Failed to get settings:', e);
            }
            
            let content = message.content;
            let modified = false;
            
            // Initialize and render KaTeX
            if (settings.enableKatex !== false) {
                const loaded = await initKatex();
                if (loaded) {
                    const newContent = renderKatex(content);
                    if (newContent !== content) {
                        content = newContent;
                        modified = true;
                    }
                }
            }
            
            // Initialize and render Mermaid
            if (settings.enableMermaid !== false) {
                const theme = settings.mermaidTheme || 'default';
                const loaded = await initMermaid(theme);
                if (loaded) {
                    const newContent = renderMermaid(content);
                    if (newContent !== content) {
                        content = newContent;
                        modified = true;
                    }
                }
            }
            
            // Initialize copy buttons (doesn't modify content)
            if (settings.enableCopyButton !== false) {
                initCopyButtons();
            }
            
            // Load extra languages (doesn't modify content, just registers with hljs)
            if (settings.enableExtraLanguages !== false) {
                initExtraLanguages();
            }
            
            if (modified) {
                return { success: true, content };
            }
            
            return { success: false };
        }
    });
    
    // ============ Initialize ============
    console.log('[MarkdownEnhancer] Plugin loaded');
    
})(window.ChatRawPlugin);
