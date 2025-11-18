// تطبيق R-Notes للهواتف
class RNotesApp {
    constructor() {
        this.db = notesDB;
        this.currentNoteId = null;
        this.activeModal = null;
        this.longPressTimer = null;
        this.longPressTarget = null;
        this.copyMenuActive = false;
        this.selectedText = '';
        this.activeField = null;
        
        this.initializeApp();
    }

    // تهيئة التطبيق
    initializeApp() {
        this.loadSettings();
        this.bindEvents();
        this.renderNotes();
        this.setupBackButtonHandler();
        this.setupCopyMenu();
    }

    // تحميل الإعدادات
    loadSettings() {
        const theme = localStorage.getItem('r-notes-theme') || 'dark';
        const fontSize = localStorage.getItem('r-notes-fontSize') || 'medium';
        
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-font-size', fontSize);
        
        const themeSelect = document.getElementById('themeSelect');
        const fontSizeSelect = document.getElementById('fontSize');
        
        if (themeSelect) themeSelect.value = theme;
        if (fontSizeSelect) fontSizeSelect.value = fontSize;
    }

    // ربط الأحداث
    bindEvents() {
        // أزرار الشريط العلوي
        document.getElementById('searchBtn').addEventListener('click', () => this.openModal('searchModal'));
        document.getElementById('settingsBtn').addEventListener('click', () => this.openModal('settingsModal'));
        
        // أزرار الإغلاق
        document.getElementById('closeSearch').addEventListener('click', () => this.closeModal());
        document.getElementById('closeSettings').addEventListener('click', () => this.closeModal());
        document.getElementById('closeEditor').addEventListener('click', () => this.closeEditor());
        
        // البحث
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // الإعدادات
        document.getElementById('themeSelect').addEventListener('change', (e) => this.changeTheme(e.target.value));
        document.getElementById('fontSize').addEventListener('change', (e) => this.changeFontSize(e.target.value));
        
        // الملاحظات
        document.getElementById('addNoteBtn').addEventListener('click', () => this.createNewNote());
        document.getElementById('createFirstNote').addEventListener('click', () => this.createNewNote());
        
        // محرر الملاحظات
        document.getElementById('noteTitle').addEventListener('input', () => this.autoSave());
        document.getElementById('noteContent').addEventListener('input', () => this.autoSave());
        
        // قائمة السياق
        document.getElementById('pinNote').addEventListener('click', () => this.pinCurrentNote());
        document.getElementById('shareNote').addEventListener('click', () => this.shareCurrentNote());
        document.getElementById('deleteNote').addEventListener('click', () => this.deleteCurrentNote());
        
        // الضغط المطول
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        document.addEventListener('touchend', () => this.handleTouchEnd());
        document.addEventListener('touchmove', () => this.handleTouchEnd());
        
        // النقر خارج القوائم
        document.addEventListener('touchstart', (e) => this.handleOutsideTouch(e));
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
    }

    // إعداد لافتة النسخ واللصق
    setupCopyMenu() {
        const noteContent = document.getElementById('noteContent');
        const noteTitle = document.getElementById('noteTitle');
        const copyMenu = document.getElementById('copyMenu');
        
        // أحداث لحقول النص
        [noteContent, noteTitle].forEach(field => {
            // عند تحديد النص
            field.addEventListener('select', () => this.handleTextSelection(field));
            field.addEventListener('mouseup', () => this.handleTextSelection(field));
            field.addEventListener('touchend', () => this.handleTextSelection(field));
            
            // الضغط المطول
            field.addEventListener('touchstart', (e) => this.handleTextTouchStart(e, field));
            field.addEventListener('mousedown', (e) => this.handleTextMouseDown(e, field));
            
            // الضغط بزر الماوس الأيمن
            field.addEventListener('contextmenu', (e) => this.handleContextMenu(e, field));
        });

        // أحداث أزرار النسخ واللصق والقص
        document.getElementById('copyBtn').addEventListener('click', () => this.handleCopy());
        document.getElementById('pasteBtn').addEventListener('click', () => this.handlePaste());
        document.getElementById('cutBtn').addEventListener('click', () => this.handleCut());

        // مراقبة تحديد النص في المستند
        document.addEventListener('selectionchange', () => this.handleDocumentSelection());
    }

    // التعامل مع تحديد النص في المستند
    handleDocumentSelection() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText && this.isTextInEditor(selection)) {
            this.selectedText = selectedText;
            this.showCopyMenuAtSelection(selection);
        }
    }

    // التحقق إذا كان النص المحدد داخل المحرر
    isTextInEditor(selection) {
        if (!selection.rangeCount) return false;
        
        const range = selection.getRangeAt(0);
        const editorModal = document.getElementById('editorModal');
        
        return editorModal.classList.contains('active') && 
               (editorModal.contains(range.startContainer) || 
                editorModal.contains(range.endContainer));
    }

    // عرض لافتة النسخ عند تحديد النص
    showCopyMenuAtSelection(selection) {
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        if (rect.width > 0 || rect.height > 0) {
            const x = rect.left + (rect.width / 2);
            const y = rect.top - 10;
            this.showCopyMenu(x, y, document.activeElement);
        }
    }

    // التعامل مع تحديد النص
    handleTextSelection(field) {
        setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText && this.isFieldActive(field)) {
                this.selectedText = selectedText;
                this.activeField = field;
                this.showCopyMenuAtSelection(selection);
            }
        }, 50);
    }

    // التحقق إذا كان الحقل نشط
    isFieldActive(field) {
        return document.activeElement === field;
    }

    // التعامل مع بدء اللمس للنص
    handleTextTouchStart(e, field) {
        this.activeField = field;
        this.longPressTimer = setTimeout(() => {
            this.showCopyMenu(e.touches[0].clientX, e.touches[0].clientY, field);
        }, 500);
    }

    // التعامل مع بدء الضغط بالمؤشر للنص
    handleTextMouseDown(e, field) {
        this.activeField = field;
        
        // فقط للزر الأيمن
        if (e.button === 2) {
            return; // نتركه لـ contextmenu event
        }
        
        this.longPressTimer = setTimeout(() => {
            this.showCopyMenu(e.clientX, e.clientY, field);
        }, 800);
    }

    // التعامل مع القائمة السياقية (زر الماوس الأيمن)
    handleContextMenu(e, field) {
        e.preventDefault();
        this.activeField = field;
        
        // الحصول على النص المحدد إن وجد
        const selection = window.getSelection();
        this.selectedText = selection.toString().trim();
        
        this.showCopyMenu(e.clientX, e.clientY, field);
    }

    // عرض لافتة النسخ
    showCopyMenu(x, y, field) {
        // فقط إذا كانت لافتة المحرر مفتوحة
        const editorModal = document.getElementById('editorModal');
        if (!editorModal.classList.contains('active')) {
            return;
        }

        this.closeAllMenus();
        this.copyMenuActive = true;
        
        const copyMenu = document.getElementById('copyMenu');
        const rect = copyMenu.getBoundingClientRect();
        
        // ضبط الموقع لمنع الخروج من الشاشة
        const adjustedX = Math.max(10, Math.min(x, window.innerWidth - rect.width - 10));
        const adjustedY = Math.max(10, Math.min(y, window.innerHeight - rect.height - 10));
        
        copyMenu.style.left = adjustedX + 'px';
        copyMenu.style.top = adjustedY + 'px';
        copyMenu.classList.add('active');
        
        this.activeField = field;
        
        window.history.pushState({ copyMenu: true }, '');
    }

    // إغلاق لافتة النسخ
    closeCopyMenu() {
        const copyMenu = document.getElementById('copyMenu');
        copyMenu.classList.remove('active');
        this.copyMenuActive = false;
        this.activeField = null;
    }

    // معالجة النسخ
    async handleCopy() {
        try {
            let textToCopy = '';
            
            if (this.activeField) {
                const field = this.activeField;
                if (field.selectionStart !== undefined && field.selectionStart !== field.selectionEnd) {
                    // نص محدد في حقل الإدخال
                    const start = field.selectionStart;
                    const end = field.selectionEnd;
                    textToCopy = field.value.substring(start, end);
                }
            }
            
            // إذا لم يكن هناك نص محدد في الحقل، استخدم النص المحدد من التحديد العام
            if (!textToCopy && this.selectedText) {
                textToCopy = this.selectedText;
            }
            
            if (textToCopy) {
                await navigator.clipboard.writeText(textToCopy);
                this.showMessage('تم نسخ النص إلى الحافظة');
            } else {
                this.showMessage('لم يتم تحديد نص للنسخ', 'error');
            }
        } catch (error) {
            this.fallbackCopyText(this.selectedText);
        }
        
        this.closeCopyMenu();
        this.clearSelection();
    }

    // معالجة اللصق
    async handlePaste() {
        try {
            const text = await navigator.clipboard.readText();
            if (text && this.activeField) {
                this.insertTextAtCursor(this.activeField, text);
                this.autoSave();
                this.showMessage('تم لصق النص');
            } else {
                this.showMessage('لا يوجد نص للصق', 'error');
            }
        } catch (error) {
            this.showMessage('فشل في لصق النص', 'error');
        }
        
        this.closeCopyMenu();
    }

    // معالجة القص
    async handleCut() {
        try {
            let textToCut = '';
            
            if (this.activeField) {
                const field = this.activeField;
                if (field.selectionStart !== undefined && field.selectionStart !== field.selectionEnd) {
                    const start = field.selectionStart;
                    const end = field.selectionEnd;
                    textToCut = field.value.substring(start, end);
                    
                    // قص النص من الحقل
                    field.value = field.value.substring(0, start) + field.value.substring(end);
                    // تحديث المؤشر
                    field.setSelectionRange(start, start);
                    this.autoSave();
                }
            }
            
            // إذا لم يكن هناك نص محدد في الحقل، استخدم النص المحدد من التحديد العام
            if (!textToCut && this.selectedText) {
                textToCut = this.selectedText;
                this.clearSelection();
            }
            
            if (textToCut) {
                await navigator.clipboard.writeText(textToCut);
                this.showMessage('تم قص النص إلى الحافظة');
            } else {
                this.showMessage('لم يتم تحديد نص للقص', 'error');
            }
        } catch (error) {
            this.showMessage('فشل في قص النص', 'error');
        }
        
        this.closeCopyMenu();
    }

    // إدراج نص في المؤشر
    insertTextAtCursor(field, text) {
        if (field.selectionStart !== undefined) {
            const start = field.selectionStart;
            const end = field.selectionEnd;
            field.value = field.value.substring(0, start) + text + field.value.substring(end);
            // تحديث موضع المؤشر
            const newPosition = start + text.length;
            field.setSelectionRange(newPosition, newPosition);
        } else {
            field.value += text;
        }
        
        // تشغيل حدث الإدخال للحفظ التلقائي
        field.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // مسح التحديد
    clearSelection() {
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
        }
        this.selectedText = '';
    }

    // إدارة زر الرجوع
    setupBackButtonHandler() {
        window.addEventListener('popstate', (e) => {
            if (this.activeModal || this.copyMenuActive) {
                this.closeAllModals();
                this.closeAllMenus();
            }
        });
    }

    // فتح لافتة
    openModal(modalId) {
        this.closeAllModals();
        this.activeModal = modalId;
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        
        if (modalId === 'searchModal') {
            setTimeout(() => {
                const searchInput = document.getElementById('searchInput');
                searchInput.focus();
                searchInput.setAttribute('inputmode', 'search');
            }, 300);
        } else if (modalId === 'editorModal') {
            setTimeout(() => document.getElementById('noteTitle').focus(), 300);
        }
        
        window.history.pushState({ modal: modalId }, '');
    }

    // إغلاق اللافتة الحالية
    closeModal() {
        if (this.activeModal) {
            const modal = document.getElementById(this.activeModal);
            modal.classList.remove('active');
            this.activeModal = null;
            
            if (modal.id === 'searchModal') {
                document.getElementById('searchInput').value = '';
                this.renderNotes();
            }
            
            window.history.back();
        }
    }

    // إغلاق جميع اللافتات والقوائم
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        this.closeContextMenu();
        this.closeCopyMenu();
        this.activeModal = null;
    }

    // إغلاق جميع القوائم
    closeAllMenus() {
        this.closeContextMenu();
        this.closeCopyMenu();
        this.clearSelection();
    }

    // التعامل مع اللمس
    handleTouchStart(e) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
    }

    handleTouchEnd() {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
    }

    // عرض الملاحظات
    renderNotes(notes = null) {
        const notesToRender = notes || this.db.getAllNotes();
        const notesList = document.getElementById('notesList');
        const emptyState = document.getElementById('emptyState');
        
        if (notesToRender.length === 0) {
            notesList.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }
        
        notesList.style.display = 'flex';
        emptyState.style.display = 'none';
        
        notesList.innerHTML = notesToRender.map(note => `
            <div class="note-card ${note.pinned ? 'pinned' : ''}" 
                 data-note-id="${note.id}">
                <div class="note-header">
                    <h3 class="note-title">${this.escapeHtml(note.title) || 'بدون عنوان'}</h3>
                    ${note.pinned ? '<i class="fas fa-thumbtack note-pin"></i>' : ''}
                </div>
                <div class="note-content">${this.truncateText(this.escapeHtml(note.content), 120)}</div>
                <div class="note-footer">
                    <span class="note-date">${this.formatDate(note.lastModified)}</span>
                </div>
            </div>
        `).join('');
        
        this.bindNoteEvents();
    }

    // ربط أحداث الملاحظات
    bindNoteEvents() {
        document.querySelectorAll('.note-card').forEach(card => {
            card.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    this.handleNoteTouchStart(e, card);
                }
            });
            
            card.addEventListener('touchend', (e) => {
                this.handleNoteTouchEnd(e, card);
            });

            card.addEventListener('click', (e) => {
                if (!this.longPressTarget) {
                    this.openNoteEditor(card.dataset.noteId);
                }
            });

            // منع القائمة السياقية الافتراضية
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.handleNoteContextMenu(e, card);
            });
        });
    }

    // التعامل مع لمس الملاحظات
    handleNoteTouchStart(e, card) {
        this.longPressTarget = card;
        this.longPressTimer = setTimeout(() => {
            this.showContextMenu(card, e.touches[0].clientX, e.touches[0].clientY);
        }, 500);
    }

    handleNoteTouchEnd(e, card) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
        
        if (this.longPressTarget === card && !document.getElementById('contextMenu').classList.contains('active')) {
            this.openNoteEditor(card.dataset.noteId);
        }
        this.longPressTarget = null;
    }

    // التعامل مع القائمة السياقية للملاحظات
    handleNoteContextMenu(e, card) {
        e.preventDefault();
        this.showContextMenu(card, e.clientX, e.clientY);
    }

    // البحث في الملاحظات
    handleSearch(query) {
        const results = this.db.searchNotes(query);
        const searchResults = document.getElementById('searchResults');
        
        if (results.length === 0) {
            searchResults.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">لا توجد نتائج</p>';
            return;
        }
        
        searchResults.innerHTML = results.map(note => `
            <div class="note-card ${note.pinned ? 'pinned' : ''}" 
                 data-note-id="${note.id}">
                <div class="note-header">
                    <h3 class="note-title">${this.escapeHtml(note.title) || 'بدون عنوان'}</h3>
                    ${note.pinned ? '<i class="fas fa-thumbtack note-pin"></i>' : ''}
                </div>
                <div class="note-content">${this.highlightText(this.escapeHtml(note.content), query)}</div>
                <div class="note-footer">
                    <span class="note-date">${this.formatDate(note.lastModified)}</span>
                </div>
            </div>
        `).join('');
        
        this.bindSearchResultEvents();
    }

    // ربط أحداث نتائج البحث
    bindSearchResultEvents() {
        document.querySelectorAll('#searchResults .note-card').forEach(card => {
            card.addEventListener('touchend', (e) => {
                e.stopPropagation();
                this.openNoteFromSearch(card.dataset.noteId);
            });

            card.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openNoteFromSearch(card.dataset.noteId);
            });
        });
    }

    // فتح الملاحظة من نتائج البحث
    openNoteFromSearch(noteId) {
        this.openNoteEditor(noteId);
        this.closeModal();
    }

    // إنشاء ملاحظة جديدة
    createNewNote() {
        this.clearEditorFields();
        const newNote = this.db.createNote('', '');
        this.currentNoteId = newNote.id;
        this.openModal('editorModal');
        this.renderNotes();
    }

    // تنظيف حقول المحرر
    clearEditorFields() {
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        document.getElementById('lastSaved').textContent = 'لم يتم الحفظ بعد';
    }

    // فتح محرر الملاحظات
    openNoteEditor(noteId) {
        const note = this.db.notes.find(n => n.id === noteId);
        if (!note) return;
        
        this.currentNoteId = noteId;
        document.getElementById('noteTitle').value = note.title || '';
        document.getElementById('noteContent').value = note.content || '';
        this.updateLastSaved();
        this.openModal('editorModal');
    }

    // إغلاق المحرر
    closeEditor() {
        this.closeModal();
        this.currentNoteId = null;
        this.renderNotes();
    }

    // الحفظ التلقائي
    autoSave() {
        if (!this.currentNoteId) return;
        
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;
        
        this.db.updateNote(this.currentNoteId, { title, content });
        this.updateLastSaved();
    }

    // تحديث وقت الحفظ الأخير
    updateLastSaved() {
        const note = this.db.notes.find(n => n.id === this.currentNoteId);
        if (note) {
            document.getElementById('lastSaved').textContent = 
                `آخر حفظ: ${this.formatDate(note.lastModified, true)}`;
        }
    }

    // عرض قائمة السياق
    showContextMenu(noteCard, x, y) {
        this.closeAllMenus();
        this.currentNoteId = noteCard.dataset.noteId;
        
        const contextMenu = document.getElementById('contextMenu');
        const note = this.db.notes.find(n => n.id === this.currentNoteId);
        
        if (!note) return;
        
        const pinItem = document.getElementById('pinNote');
        pinItem.innerHTML = note.pinned ? 
            '<i class="fas fa-thumbtack"></i> إلغاء التثبيت' : 
            '<i class="fas fa-thumbtack"></i> تثبيت';
        
        const rect = contextMenu.getBoundingClientRect();
        const adjustedX = Math.min(x, window.innerWidth - rect.width - 10);
        const adjustedY = Math.min(y, window.innerHeight - rect.height - 10);
        
        contextMenu.style.left = adjustedX + 'px';
        contextMenu.style.top = adjustedY + 'px';
        contextMenu.classList.add('active');
        
        window.history.pushState({ contextMenu: true }, '');
    }

    // إغلاق قائمة السياق
    closeContextMenu() {
        document.getElementById('contextMenu').classList.remove('active');
        this.longPressTarget = null;
    }

    // التعامل مع اللمس خارج العناصر
    handleOutsideTouch(e) {
        if (!e.target.closest('.context-menu') && !e.target.closest('.note-card') && 
            !e.target.closest('.copy-menu') && !e.target.closest('#noteContent') && 
            !e.target.closest('#noteTitle')) {
            this.closeAllMenus();
        }
    }

    // التعامل مع النقر خارج العناصر
    handleOutsideClick(e) {
        if (!e.target.closest('.context-menu') && !e.target.closest('.note-card') && 
            !e.target.closest('.copy-menu') && !e.target.closest('#noteContent') && 
            !e.target.closest('#noteTitle')) {
            this.closeAllMenus();
        }
        
        if (this.activeModal && e.target.classList.contains('modal')) {
            this.closeModal();
        }
    }

    // تثبيت الملاحظة الحالية
    pinCurrentNote() {
        if (!this.currentNoteId) return;
        
        this.db.togglePin(this.currentNoteId);
        this.closeContextMenu();
        this.renderNotes();
        this.showMessage('تم تحديث حالة التثبيت');
    }

    // مشاركة الملاحظة الحالية
    shareCurrentNote() {
        if (!this.currentNoteId) return;
        
        const note = this.db.notes.find(n => n.id === this.currentNoteId);
        if (!note) return;
        
        const textToCopy = `${note.title || 'بدون عنوان'}\n\n${note.content}`;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                this.showMessage('تم نسخ الملاحظة إلى الحافظة');
            }).catch(() => {
                this.fallbackCopyText(textToCopy);
            });
        } else {
            this.fallbackCopyText(textToCopy);
        }
        
        this.closeContextMenu();
    }

    // طريقة بديلة للنسخ
    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showMessage('تم نسخ النص إلى الحافظة');
        } catch (err) {
            this.showMessage('فشل في نسخ النص', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    // عرض رسالة
    showMessage(message, type = 'success') {
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'};
            color: white;
            padding: 1rem 2rem;
            border-radius: var(--border-radius);
            z-index: 2000;
            font-weight: 500;
            box-shadow: var(--shadow);
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 2000);
    }

    // حذف الملاحظة الحالية
    deleteCurrentNote() {
        if (!this.currentNoteId) return;
        
        if (confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
            this.db.deleteNote(this.currentNoteId);
            this.closeContextMenu();
            this.renderNotes();
            
            if (this.activeModal === 'editorModal') {
                this.closeEditor();
            }
            
            this.showMessage('تم حذف الملاحظة');
        }
    }

    // تغيير المظهر
    changeTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('r-notes-theme', theme);
    }

    // تغيير حجم الخط
    changeFontSize(size) {
        document.documentElement.setAttribute('data-font-size', size);
        localStorage.setItem('r-notes-fontSize', size);
    }

    // أدوات مساعدة
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    highlightText(text, query) {
        if (!query.trim() || !text) return text || '';
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark style="background: var(--warning-color); color: black; padding: 0 2px; border-radius: 2px;">$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString, includeTime = false) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 7) return `منذ ${diffDays} يوم`;
        
        if (includeTime) {
            return date.toLocaleString('ar-EG');
        }
        
        return date.toLocaleDateString('ar-EG');
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new RNotesApp();
});


document.addEventListener("contextmenu", function (event) {
    event.preventDefault(); // يمنع القائمة بالكامل
});
