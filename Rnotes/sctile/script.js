// حالة التطبيق
let notes = JSON.parse(localStorage.getItem('inotes-notes')) || [];
let archivedNotes = JSON.parse(localStorage.getItem('inotes-archived')) || [];
let currentNoteId = null;
let autoSaveTimeout = null;
let contextMenuNoteId = null;
let currentTextContextType = null;

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadNotes();
    setupEventListeners();
}

function setupEventListeners() {
    // الحفظ التلقائي للملاحظة
    document.getElementById('noteTitle').addEventListener('input', scheduleAutoSave);
    document.getElementById('noteContent').addEventListener('input', scheduleAutoSave);
    
    // إغلاق القوائم عند النقر خارجها
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.context-menu')) hideContextMenu();
        if (!e.target.closest('.text-context-menu')) hideTextContextMenu();
        if (!e.target.closest('.archive-modal')) hideArchiveModal();
        if (!e.target.closest('.archive-context-menu')) hideArchiveContextMenu();
    });
    
    // زر الرجوع في المتصفح - تم التعديل هنا
    window.addEventListener('popstate', function(e) {
        hideAllOverlays();
        // منع السلوك الافتراضي للرجوع
        if (window.location.hash) {
            history.pushState(null, null, window.location.href);
        }
    });
    
    // إغلاق القوائم بزر Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAllContextMenus();
            // إغلاق النوافذ المفتوحة عند الضغط على Escape
            if (document.getElementById('plusnuts').style.display === 'block') {
                hideNewNote();
            }
            if (document.getElementById('search').style.display === 'block') {
                hideSearch();
            }
            if (document.getElementById('archive').style.display === 'block') {
                hideArchive();
            }
        }
    });
    
    // النقر المطول على العنوان والمحتوى
    setupLongPressListeners();
}

function setupLongPressListeners() {
    const titleInput = document.getElementById('noteTitle');
    const contentTextarea = document.getElementById('noteContent');
    
    [titleInput, contentTextarea].forEach(element => {
        if (element) {
            let pressTimer;
            
            element.addEventListener('mousedown', function(e) {
                if (e.button === 0) {
                    pressTimer = setTimeout(() => {
                        showTextContextMenu(e, element.id === 'noteTitle' ? 'title' : 'content');
                    }, 500);
                }
            });
            
            element.addEventListener('mouseup', function(e) {
                if (e.button === 0) clearTimeout(pressTimer);
            });
            
            element.addEventListener('mouseleave', function() {
                clearTimeout(pressTimer);
            });
            
            // إضافة حدث النقر بزر الماوس الأيمن
            element.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                showTextContextMenu(e, element.id === 'noteTitle' ? 'title' : 'content');
            });
        }
    });
}

// تحميل الملاحظات
function loadNotes() {
    const notesContainer = document.getElementById('notesContainer');
    if (!notesContainer) return;
    
    const pinnedNotes = notes.filter(note => note.pinned);
    const normalNotes = notes.filter(note => !note.pinned);
    const sortedNotes = [...pinnedNotes, ...normalNotes];
    
    if (sortedNotes.length === 0) {
        notesContainer.innerHTML = '<div class="empty-state">No notes yet. Create your first note!</div>';
        return;
    }
    
    notesContainer.innerHTML = sortedNotes.map(note => createNoteCard(note)).join('');
    setupNoteCardsEventListeners();
}

function setupNoteCardsEventListeners() {
    document.querySelectorAll('.note-card').forEach(card => {
        const noteId = card.dataset.noteId;
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        // النقر العادي
        newCard.addEventListener('click', function(e) {
            if (!e.target.closest('.note-pin') && !e.target.closest('.context-menu')) {
                openNoteForEditing(noteId);
            }
        });
        
        // النقر المطول
        let pressTimer;
        newCard.addEventListener('mousedown', function(e) {
            if (e.button === 0) {
                pressTimer = setTimeout(() => {
                    showContextMenu(e, noteId);
                }, 500);
            }
        });
        
        newCard.addEventListener('mouseup', function(e) {
            if (e.button === 0) clearTimeout(pressTimer);
        });
        
        newCard.addEventListener('mouseleave', function() {
            clearTimeout(pressTimer);
        });
        
        // النقر بزر الماوس الأيمن
        newCard.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showContextMenu(e, noteId);
        });
    });
}

function createNoteCard(note) {
    const truncatedContent = note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content;
    // اقتطاع العنوان إلى 5 أحرف إذا كان طويلاً
    const displayTitle = note.title && note.title.length > 8 ? note.title.substring(0, 8) + '...' : (note.title || 'Untitled');
    const date = new Date(note.updatedAt).toLocaleDateString();
    
    return `
        <div class="note-card ${note.pinned ? 'pinned' : ''}" data-note-id="${note.id}">
            <div class="note-header">
                <div class="note-title" title="${escapeHtml(note.title || 'Untitled')}">${escapeHtml(displayTitle)}</div>
                ${note.pinned ? '<i class="fas fa-thumbtack note-pin"></i>' : ''}
            </div>
            <div class="note-content">${escapeHtml(truncatedContent)}</div>
            <div class="note-date">${date}</div>
        </div>
    `;
}

// إدارة النوافذ - تم التعديل هنا
function showNewNote() {
    currentNoteId = null;
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('plusnuts').style.display = 'block';
    scrollToTop();
    document.getElementById('noteTitle').focus();
    
    // استخدام replaceState بدلاً من pushState لمنع إضافة تاريخ جديد
    history.replaceState({ newNoteOpen: true }, '');
}

function hideNewNote() {
    autoSave(true);
    document.getElementById('plusnuts').style.display = 'none';
    currentNoteId = null;
    setTimeout(() => {
        loadNotes();
        scrollToTop();
    }, 100);
    
    // إعادة تعيين حالة التاريخ
    history.replaceState(null, '');
}

function showSearch() {
    document.getElementById('search').style.display = 'block';
    document.getElementById('searchInput').focus();
    scrollToTop();
    history.replaceState({ searchOpen: true }, '');
}

function hideSearch() {
    document.getElementById('search').style.display = 'none';
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
    setTimeout(scrollToTop, 100);
    history.replaceState(null, '');
}

function showArchive() {
    document.getElementById('archive').style.display = 'block';
    loadArchivedNotes();
    scrollToTop();
    history.replaceState({ archiveOpen: true }, '');
}

function hideArchive() {
    document.getElementById('archive').style.display = 'none';
    setTimeout(scrollToTop, 100);
    history.replaceState(null, '');
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const textarea = document.getElementById('noteContent');
    if (textarea) textarea.scrollTop = 0;
}

// البحث
function performSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!query.trim()) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    const results = notes.filter(note => 
        (note.title && note.title.toLowerCase().includes(query)) || 
        (note.content && note.content.toLowerCase().includes(query))
    );
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state">No notes found</div>';
        return;
    }
    
    resultsContainer.innerHTML = results.map(note => createNoteCard(note)).join('');
    setupNoteCardsEventListeners();
}

// الأرشيف
function loadArchivedNotes() {
    const archiveContainer = document.getElementById('archive-notes');
    if (!archiveContainer) return;
    
    if (archivedNotes.length === 0) {
        archiveContainer.innerHTML = '<div class="empty-state">No archived notes</div>';
        return;
    }
    
    archiveContainer.innerHTML = archivedNotes.map(note => createNoteCard(note)).join('');
    setupArchivedNotesEventListeners();
}

function setupArchivedNotesEventListeners() {
    document.querySelectorAll('#archive-notes .note-card').forEach(card => {
        const noteId = card.dataset.noteId;
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        newCard.addEventListener('click', function(e) {
            if (!e.target.closest('.note-pin')) {
                showArchiveModal(noteId);
            }
        });
        
        let pressTimer;
        newCard.addEventListener('mousedown', function(e) {
            if (e.button === 0) {
                pressTimer = setTimeout(() => {
                    showArchiveContextMenu(e, noteId);
                }, 500);
            }
        });
        
        newCard.addEventListener('mouseup', function(e) {
            if (e.button === 0) clearTimeout(pressTimer);
        });
        
        newCard.addEventListener('mouseleave', function() {
            clearTimeout(pressTimer);
        });
        
        newCard.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showArchiveContextMenu(e, noteId);
        });
    });
}

// القوائم السياقية - تم تعديل وظيفة التموضع
function showContextMenu(event, noteId) {
    event.preventDefault();
    event.stopPropagation();
    
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    contextMenuNoteId = noteId;
    const contextMenu = document.getElementById('contextMenu');
    document.getElementById('pinText').textContent = note.pinned ? 'Unpin' : 'Pin';
    
    positionContextMenu(contextMenu, event);
    contextMenu.style.display = 'block';
}

function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) contextMenu.style.display = 'none';
    contextMenuNoteId = null;
}

function showArchiveContextMenu(event, noteId) {
    event.preventDefault();
    event.stopPropagation();
    
    const note = archivedNotes.find(n => n.id === noteId);
    if (!note) return;
    
    contextMenuNoteId = noteId;
    const archiveContextMenu = document.getElementById('archiveContextMenu');
    
    positionContextMenu(archiveContextMenu, event);
    archiveContextMenu.style.display = 'block';
}

function hideArchiveContextMenu() {
    const archiveContextMenu = document.getElementById('archiveContextMenu');
    if (archiveContextMenu) archiveContextMenu.style.display = 'none';
    contextMenuNoteId = null;
}

function showTextContextMenu(event, type) {
    event.preventDefault();
    currentTextContextType = type;
    
    const textContextMenu = document.getElementById('textContextMenu');
    const element = type === 'title' ? document.getElementById('noteTitle') : document.getElementById('noteContent');
    if (!element) return;
    
    const selectedText = element.value.substring(element.selectionStart, element.selectionEnd);
    const copyBtn = textContextMenu.querySelector('.context-item:nth-child(1)');
    const cutBtn = textContextMenu.querySelector('.context-item:nth-child(2)');
    const selectAllBtn = textContextMenu.querySelector('.context-item[onclick="SelectallText()"]');
    
    if (selectedText.length > 0) {
        copyBtn.classList.remove('disabled');
        cutBtn.classList.remove('disabled');
    } else {
        copyBtn.classList.add('disabled');
        cutBtn.classList.add('disabled');
    }
    
    // تفعيل أو تعطيل زر Select All بناءً على وجود نص
    if (element.value.length > 0) {
        selectAllBtn.classList.remove('disabled');
    } else {
        selectAllBtn.classList.add('disabled');
    }
    
    positionContextMenu(textContextMenu, event);
    textContextMenu.style.display = 'block';
}

function hideTextContextMenu() {
    const textContextMenu = document.getElementById('textContextMenu');
    if (textContextMenu) textContextMenu.style.display = 'none';
    currentTextContextType = null;
}

// تم تعديل هذه الوظيفة لمنع خروج القوائم من حدود النافذة
function positionContextMenu(menu, event) {
    if (!menu) return;
    
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = event.clientX;
    let top = event.clientY;
    
    // التحقق من الحدود الأفقية
    if (left + menuRect.width > viewportWidth) {
        left = viewportWidth - menuRect.width - 10;
    }
    
    // التحقق من الحدود العمودية
    if (top + menuRect.height > viewportHeight) {
        top = viewportHeight - menuRect.height - 10;
    }
    
    // التأكد من أن القائمة لا تخرج من الحدود العلوية واليسرى
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
}

// إخفاء جميع القوائم
function hideAllContextMenus() {
    hideContextMenu();
    hideTextContextMenu();
    hideArchiveModal();
    hideArchiveContextMenu();
}

function hideAllOverlays() {
    hideSearch();
    hideNewNote();
    hideArchive();
    hideAllContextMenus();
    setTimeout(scrollToTop, 100);
}

// لافتة الأرشيف
function showArchiveModal(noteId) {
    const note = archivedNotes.find(n => n.id === noteId);
    if (!note) return;
    
    contextMenuNoteId = noteId;
    const modal = document.getElementById('archiveModal');
    document.getElementById('archiveNoteTitle').textContent = escapeHtml(note.title || 'Untitled');
    modal.style.display = 'flex';
}

function hideArchiveModal() {
    const modal = document.getElementById('archiveModal');
    if (modal) modal.style.display = 'none';
    contextMenuNoteId = null;
}

// وظائف الأرشيف
function retrieveFromArchiveContext() {
    if (!contextMenuNoteId) return;
    retrieveFromArchive(contextMenuNoteId);
    hideArchiveContextMenu();
}

function deleteFromArchiveContext() {
    if (!contextMenuNoteId) return;
    if (confirm('Are you sure you want to permanently delete this note? This action cannot be undone.')) {
        deleteFromArchive(contextMenuNoteId);
        hideArchiveContextMenu();
    }
}

function retrieveFromArchiveModal() {
    if (!contextMenuNoteId) return;
    retrieveFromArchive(contextMenuNoteId);
    hideArchiveModal();
}

function deleteFromArchiveModal() {
    if (!contextMenuNoteId) return;
    if (confirm('Are you sure you want to permanently delete this note? This action cannot be undone.')) {
        deleteFromArchive(contextMenuNoteId);
        hideArchiveModal();
    }
}

function retrieveFromArchive(noteId) {
    const noteIndex = archivedNotes.findIndex(note => note.id === noteId);
    if (noteIndex !== -1) {
        const [restoredNote] = archivedNotes.splice(noteIndex, 1);
        notes.unshift(restoredNote);
        saveToLocalStorage();
        loadArchivedNotes();
        loadNotes();
    }
}

function deleteFromArchive(noteId) {
    const noteIndex = archivedNotes.findIndex(note => note.id === noteId);
    if (noteIndex !== -1) {
        archivedNotes.splice(noteIndex, 1);
        saveToLocalStorage();
        loadArchivedNotes();
    }
}

// وظائف النص
function copySelectedText() {
    const element = currentTextContextType === 'title' ? document.getElementById('noteTitle') : document.getElementById('noteContent');
    const selectedText = element.value.substring(element.selectionStart, element.selectionEnd);
    
    if (selectedText.length > 0) {
        navigator.clipboard.writeText(selectedText).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
    hideTextContextMenu();
}

function cutSelectedText() {
    const element = currentTextContextType === 'title' ? document.getElementById('noteTitle') : document.getElementById('noteContent');
    const selectedText = element.value.substring(element.selectionStart, element.selectionEnd);
    
    if (selectedText.length > 0) {
        navigator.clipboard.writeText(selectedText).then(() => {
            const start = element.selectionStart;
            const end = element.selectionEnd;
            element.value = element.value.substring(0, start) + element.value.substring(end);
            element.setSelectionRange(start, start);
            scheduleAutoSave();
        }).catch(err => {
            console.error('Failed to cut text: ', err);
        });
    }
    hideTextContextMenu();
}

function pasteText() {
    const element = currentTextContextType === 'title' ? document.getElementById('noteTitle') : document.getElementById('noteContent');
    
    navigator.clipboard.readText().then(text => {
        const start = element.selectionStart;
        const end = element.selectionEnd;
        element.value = element.value.substring(0, start) + text + element.value.substring(end);
        element.setSelectionRange(start + text.length, start + text.length);
        scheduleAutoSave();
    }).catch(err => {
        console.error('Failed to paste text: ', err);
    });
    hideTextContextMenu();
}

// وظيفة تحديد النص بالكامل
function SelectallText() {
    const element = currentTextContextType === 'title' ? document.getElementById('noteTitle') : document.getElementById('noteContent');
    
    if (element && element.value.length > 0) {
        element.select();
    }
    hideTextContextMenu();
}

// الحفظ التلقائي
function scheduleAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(autoSave, 1000);
}

function autoSave(immediate = false) {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    
    if (!title.trim() && !content.trim() && !currentNoteId) return;
    
    if (currentNoteId) {
        const noteIndex = notes.findIndex(note => note.id === currentNoteId);
        if (noteIndex !== -1) {
            notes[noteIndex] = {
                ...notes[noteIndex],
                title: title || 'Untitled',
                content: content,
                updatedAt: new Date().toISOString()
            };
        }
    } else if (title.trim() || content.trim()) {
        const newNote = {
            id: Date.now().toString(),
            title: title || 'Untitled',
            content: content,
            pinned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        notes.unshift(newNote);
        currentNoteId = newNote.id;
    }
    
    saveToLocalStorage();
    if (immediate) loadNotes();
}

function saveToLocalStorage() {
    localStorage.setItem('inotes-notes', JSON.stringify(notes));
    localStorage.setItem('inotes-archived', JSON.stringify(archivedNotes));
}

// وظائف القائمة السياقية
function togglePinContext() {
    if (!contextMenuNoteId) return;
    
    const noteIndex = notes.findIndex(note => note.id === contextMenuNoteId);
    if (noteIndex !== -1) {
        notes[noteIndex].pinned = !notes[noteIndex].pinned;
        notes[noteIndex].updatedAt = new Date().toISOString();
        saveToLocalStorage();
        loadNotes();
    }
    hideContextMenu();
}

function deleteNoteContext() {
    if (!contextMenuNoteId) return;
    
    const noteIndex = notes.findIndex(note => note.id === contextMenuNoteId);
    if (noteIndex !== -1) {
        const [deletedNote] = notes.splice(noteIndex, 1);
        archivedNotes.unshift(deletedNote);
        saveToLocalStorage();
        loadNotes();
    }
    hideContextMenu();
}

function exportToPDF() {
    if (!contextMenuNoteId) return;
    
    const note = notes.find(n => n.id === contextMenuNoteId);
    if (!note) return;
    
    const printWindow = window.open('', '_blank');
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${escapeHtml(note.title)}</title>
            <style>
                body { 
                    font-family: Arial; 
                    margin: 40px; 
                    line-height: 1.6; 
                    color: #333; 
                }
                .header { 
                    border-bottom: 2px solid #333; 
                    padding-bottom: 10px; 
                    margin-bottom: 20px; 
                }
                .date { 
                    color: #666; 
                    font-size: 14px; 
                    margin-bottom: 5px; 
                }
                .content { 
                    white-space: pre-wrap; 
                    font-size: 14px; 
                    line-height: 1.8; 
                }
                @media print {
                    body { margin: 20px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${escapeHtml(note.title || 'Untitled Note')}</h1>
                <div class="date">Created: ${new Date(note.createdAt).toLocaleString()}</div>
                <div class="date">Last Updated: ${new Date(note.updatedAt).toLocaleString()}</div>
                ${note.pinned ? '<div style="color: #007bff; margin-top: 5px;">📌 Pinned Note</div>' : ''}
            </div>
            <div class="content">${escapeHtml(note.content)}</div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
    hideContextMenu();
}

// فتح الملاحظة للتعديل
function openNoteForEditing(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    currentNoteId = noteId;
    document.getElementById('noteTitle').value = note.title || '';
    document.getElementById('noteContent').value = note.content || '';
    document.getElementById('plusnuts').style.display = 'block';
    scrollToTop();
    document.getElementById('noteTitle').focus();
    
    history.replaceState({ noteOpen: true, noteId: noteId }, '');
}

// الهروب من HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, '<br>');
}

// منع القائمة السياقية بالكامل
document.addEventListener('contextmenu', function(e) {
    e.preventDefault(); // يمنع ظهور القائمة
});



