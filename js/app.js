/* ============================================
   Folder Tree Viewer - App Logic
   ============================================ */

(function () {
    'use strict';

    // DOM Elements
    const folderInput = document.getElementById('folderInput');
    const uploadArea = document.getElementById('uploadArea');
    const statsBar = document.getElementById('statsBar');
    const toolbar = document.getElementById('toolbar');
    const treeContainer = document.getElementById('treeContainer');
    const tree = document.getElementById('tree');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const expandAll = document.getElementById('expandAll');
    const collapseAll = document.getElementById('collapseAll');
    const copyTree = document.getElementById('copyTree');
    const toast = document.getElementById('toast');

    // Stats elements
    const folderCountEl = document.getElementById('folderCount');
    const fileCountEl = document.getElementById('fileCount');
    const totalSizeEl = document.getElementById('totalSize');
    const rootNameEl = document.getElementById('rootName');

    // State
    let fileEntries = [];
    let rootName = '';
    let currentSearch = '';
    let allNodes = [];

    /* ============================================
       File Icon Mapping
       ============================================ */
    const iconMap = {
        // Folders
        folder: '📁',
        node_modules: '📦',
        dist: '📦',
        build: '📦',
        out: '📦',
        target: '📦',
        '.git': '🔀',

        // Images
        jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
        svg: '🖼️', webp: '🖼️', ico: '🖼️', bmp: '🖼️',

        // Code
        js: '📜', mjs: '📜', jsx: '⚛️', ts: '📘',
        tsx: '⚛️', vue: '💚', svelte: '🔥', py: '🐍',
        rb: '💎', php: '🐘', java: '☕', kt: '🎯',
        swift: '🍎', go: '🔵', rs: '🦀', c: '🔧',
        cpp: '🔧', cc: '🔧', h: '🔧', hpp: '🔧',

        // Web
        html: '🌐', htm: '🌐', css: '🎨', scss: '🎨',
        sass: '🎨', less: '🎨', json: '📋', xml: '📋',
        yaml: '📋', yml: '📋', toml: '📋',

        // Docs
        md: '📝', markdown: '📝', txt: '📄', doc: '📝',
        docx: '📝', pdf: '📕', rtf: '📄',

        // Data
        csv: '📊', tsv: '📊', xls: '📊', xlsx: '📊',
        sql: '🗃️', db: '🗃️', sqlite: '🗃️',

        // Config
        env: '⚙️', gitignore: '🔀', gitattributes: '🔀',
        editorconfig: '⚙️', prettierrc: '⚙️', eslintrc: '⚙️',
        babelrc: '⚙️', webpack: '📦', npmrc: '⚙️',
        'package.json': '📦', 'package-lock.json': '🔒',

        // Shell/Scripts
        sh: '🖥️', bash: '🖥️', zsh: '🖥️', fish: '🖥️',
        bat: '🖥️', cmd: '🖥️', ps1: '🖥️', pyw: '🐍',

        // Media
        mp3: '🎵', wav: '🎵', flac: '🎵', ogg: '🎵',
        mp4: '🎬', mkv: '🎬', mov: '🎬', avi: '🎬',
        webm: '🎬', svg: '🖼️',

        // Archives
        zip: '🗜️', tar: '🗜️', gz: '🗜️', rar: '🗜️',
        '7z': '🗜️', bz2: '🗜️', xz: '🗜️',

        // Font
        ttf: '🔤', otf: '🔤', woff: '🔤', woff2: '🔤',
        eot: '🔤',

        // Others
        lock: '🔒', log: '📜', toml: '⚙️',
    };

    function getIcon(name, isFolder) {
        if (isFolder) return iconMap[name.toLowerCase()] || '📁';
        const ext = name.split('.').pop().toLowerCase();
        return iconMap[ext] || '📄';
    }

    /* ============================================
       File Size Formatting
       ============================================ */
    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
    }

    /* ============================================
       Build Tree Structure
       ============================================ */
    function buildTree(files) {
        const root = {};

        files.forEach(file => {
            const pathParts = file.webkitRelativePath.split('/');
            let current = root;

            pathParts.forEach((part, idx) => {
                if (!current[part]) {
                    current[part] = { _isFolder: idx < pathParts.length - 1 ? {} : null, _file: null };
                }
                if (idx < pathParts.length - 1) {
                    current = current[part]._isFolder;
                } else {
                    current[part]._file = file;
                }
            });
        });

        return root;
    }

    /* ============================================
       Count Stats
       ============================================ */
    function countStats(tree, path = '') {
        let folders = 0;
        let files = 0;
        let totalSize = 0;

        Object.keys(tree).forEach(name => {
            const node = tree[name];
            if (node._file) {
                files++;
                totalSize += node._file.size;
            } else if (node._isFolder) {
                folders++;
                const sub = countStats(node._isFolder, path + '/' + name);
                folders += sub.folders;
                files += sub.files;
                totalSize += sub.totalSize;
            }
        });

        return { folders, files, totalSize };
    }

    /* ============================================
       Render Tree
       ============================================ */
    function renderTree(tree, parentEl, parentPath = '') {
        const keys = Object.keys(tree).sort((a, b) => {
            const aIsFolder = !!tree[a]._isFolder;
            const bIsFolder = !!tree[b]._isFolder;
            if (aIsFolder !== bIsFolder) return bIsFolder ? 1 : -1;
            return a.localeCompare(b, undefined, { sensitivity: 'base' });
        });

        keys.forEach(name => {
            const node = tree[name];
            const isFolder = !!node._isFolder;
            const nodePath = parentPath ? `${parentPath}/${name}` : name;
            const icon = getIcon(name, isFolder);

            const nodeEl = document.createElement('div');
            nodeEl.className = 'tree-node';
            nodeEl.dataset.path = nodePath;
            nodeEl.dataset.name = name;
            nodeEl.dataset.isFolder = isFolder;

            const contentEl = document.createElement('div');
            contentEl.className = 'tree-node-content' + (isFolder ? ' is-folder' : '');

            // Toggle
            const toggleEl = document.createElement('span');
            toggleEl.className = 'tree-toggle' + (isFolder ? '' : ' hidden');
            toggleEl.textContent = '▶';
            contentEl.appendChild(toggleEl);

            // Icon
            const iconEl = document.createElement('span');
            iconEl.className = 'tree-icon';
            iconEl.textContent = icon;
            contentEl.appendChild(iconEl);

            // Name
            const nameEl = document.createElement('span');
            nameEl.className = 'tree-name';
            nameEl.textContent = name;
            if (isFolder) nameEl.style.fontWeight = '700';
            contentEl.appendChild(nameEl);

            // Meta (size for files)
            if (!isFolder && node._file) {
                const metaEl = document.createElement('span');
                metaEl.className = 'tree-meta';
                metaEl.textContent = formatSize(node._file.size);
                contentEl.appendChild(metaEl);
            }

            nodeEl.appendChild(contentEl);
            parentEl.appendChild(nodeEl);
            allNodes.push({ el: nodeEl, content: contentEl, name, isFolder, nodePath });

            // Children
            if (isFolder) {
                const childrenEl = document.createElement('div');
                childrenEl.className = 'tree-children';
                nodeEl.appendChild(childrenEl);

                contentEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleNode(nodeEl, childrenEl, toggleEl);
                });

                renderTree(node._isFolder, childrenEl, nodePath);
            }
        });
    }

    /* ============================================
       Toggle Node
       ============================================ */
    function toggleNode(nodeEl, childrenEl, toggleEl) {
        const isExpanded = !childrenEl.classList.contains('collapsed');

        if (isExpanded) {
            childrenEl.classList.add('collapsed');
            toggleEl.classList.remove('expanded');
        } else {
            childrenEl.classList.remove('collapsed');
            toggleEl.classList.add('expanded');
        }
    }

    /* ============================================
       Search
       ============================================ */
    function performSearch(query) {
        currentSearch = query.toLowerCase().trim();

        allNodes.forEach(({ el, content, name, isFolder }) => {
            const match = !currentSearch ||
                name.toLowerCase().includes(currentSearch);

            content.classList.remove('search-match');

            if (!match) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
                // Expand all parents of matched node
                if (currentSearch) {
                    let parent = el.parentElement;
                    while (parent && parent.classList.contains('tree-children')) {
                        parent.classList.remove('collapsed');
                        const prev = parent.parentElement;
                        if (prev && prev.classList.contains('tree-node')) {
                            const toggle = prev.querySelector('.tree-toggle');
                            if (toggle) toggle.classList.add('expanded');
                        }
                        parent = parent.parentElement;
                    }
                }
            }
        });

        // Highlight matching text
        if (currentSearch) {
            allNodes.forEach(({ el, content, name }) => {
                if (name.toLowerCase().includes(currentSearch)) {
                    content.classList.add('search-match');
                }
            });
        }
    }

    /* ============================================
       Copy Tree as Text
       ============================================ */
    function copyTreeAsText(tree, prefix = '', isLast = true) {
        let result = '';
        const keys = Object.keys(tree).sort((a, b) => {
            const aIsFolder = !!tree[a]._isFolder;
            const bIsFolder = !!tree[b]._isFolder;
            if (aIsFolder !== bIsFolder) return bIsFolder ? -1 : 1;
            return a.localeCompare(b, undefined, { sensitivity: 'base' });
        });

        keys.forEach((name, idx) => {
            const node = tree[name];
            const isLastItem = idx === keys.length - 1;
            const isFolder = !!node._isFolder;
            const connector = isLast ? '  ' : '│ ';
            const branch = isLastItem ? '└── ' : '├── ';

            result += prefix + branch + (isFolder ? '📁 ' : '📄 ') + name + '\n';

            if (isFolder) {
                const newPrefix = prefix + connector;
                result += copyTreeAsText(node._isFolder, newPrefix, isLastItem);
            }
        });

        return result;
    }

    /* ============================================
       Show Toast
       ============================================ */
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    /* ============================================
       Event Handlers
       ============================================ */

    // Folder selection
    folderInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        fileEntries = files;
        rootName = files[0].webkitRelativePath.split('/')[0];

        // Build & show tree
        const treeData = buildTree(files);
        tree.innerHTML = '';
        allNodes = [];
        renderTree(treeData, tree, '');

        // Stats
        const stats = countStats(treeData);
        folderCountEl.textContent = stats.folders;
        fileCountEl.textContent = stats.files;
        totalSizeEl.textContent = formatSize(stats.totalSize);
        rootNameEl.textContent = rootName;

        // Show UI
        statsBar.style.display = '';
        toolbar.style.display = '';
        treeContainer.style.display = '';
        uploadArea.style.display = 'none';
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        clearSearch.style.display = val ? '' : 'none';
        performSearch(val);
    });

    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.style.display = 'none';
        performSearch('');
    });

    // Expand / Collapse All
    expandAll.addEventListener('click', () => {
        allNodes.forEach(({ el, content }) => {
            if (content.querySelector('.tree-toggle:not(.hidden)')) {
                const children = el.querySelector('.tree-children');
                const toggle = content.querySelector('.tree-toggle');
                if (children) children.classList.remove('collapsed');
                if (toggle) toggle.classList.add('expanded');
            }
        });
    });

    collapseAll.addEventListener('click', () => {
        allNodes.forEach(({ el, content }) => {
            if (content.querySelector('.tree-toggle:not(.hidden)')) {
                const children = el.querySelector('.tree-children');
                const toggle = content.querySelector('.tree-toggle');
                if (children) children.classList.add('collapsed');
                if (toggle) toggle.classList.remove('expanded');
            }
        });
    });

    // Copy Tree
    copyTree.addEventListener('click', () => {
        const treeData = buildTree(fileEntries);
        const treeText = rootName + '\n' + copyTreeAsText(treeData);
        navigator.clipboard.writeText(treeText).then(() => {
            showToast('📋 树状结构已复制到剪贴板!');
        }).catch(() => {
            showToast('复制失败，请重试');
        });
    });

    // Drag & Drop on upload area
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        // Note: drag-drop folder not directly supported, fallback to click
        folderInput.click();
    });

})();
