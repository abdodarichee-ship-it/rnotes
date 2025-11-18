// إدارة التخزين المحلي للملاحظات
class NotesDB {
    constructor() {
        this.storageKey = 'r-notes-data';
        this.notes = this.loadNotes();
    }

    // تحميل الملاحظات من التخزين المحلي
    loadNotes() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading notes:', error);
            return [];
        }
    }

    // حفظ الملاحظات في التخزين المحلي
    saveNotes() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.notes));
            return true;
        } catch (error) {
            console.error('Error saving notes:', error);
            return false;
        }
    }

    // إنشاء ملاحظة جديدة
    createNote(title = '', content = '') {
        const newNote = {
            id: this.generateId(),
            title: title,
            content: content,
            pinned: false,
            lastModified: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        
        this.notes.unshift(newNote);
        this.saveNotes();
        return newNote;
    }

    // تحديث ملاحظة موجودة
    updateNote(id, updates) {
        const noteIndex = this.notes.findIndex(note => note.id === id);
        if (noteIndex === -1) return null;

        this.notes[noteIndex] = {
            ...this.notes[noteIndex],
            ...updates,
            lastModified: new Date().toISOString()
        };

        this.saveNotes();
        return this.notes[noteIndex];
    }

    // حذف ملاحظة
    deleteNote(id) {
        const noteIndex = this.notes.findIndex(note => note.id === id);
        if (noteIndex === -1) return false;

        this.notes.splice(noteIndex, 1);
        this.saveNotes();
        return true;
    }

    // تثبيت/إلغاء تثبيت ملاحظة
    togglePin(id) {
        const note = this.notes.find(note => note.id === id);
        if (!note) return null;

        note.pinned = !note.pinned;
        note.lastModified = new Date().toISOString();
        this.saveNotes();
        return note;
    }

    // الحصول على جميع الملاحظات مرتبة
    getAllNotes() {
        // الملاحظات المثبتة أولاً، ثم الأحدث تعديلاً
        return [...this.notes].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.lastModified) - new Date(a.lastModified);
        });
    }

    // البحث في الملاحظات
    searchNotes(query) {
        if (!query.trim()) return this.getAllNotes();

        const lowerQuery = query.toLowerCase();
        return this.notes.filter(note => 
            note.title.toLowerCase().includes(lowerQuery) || 
            note.content.toLowerCase().includes(lowerQuery)
        ).sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.lastModified) - new Date(a.lastModified);
        });
    }

    // توليد معرف فريد
    generateId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// إنشاء نسخة عامة من قاعدة البيانات
const notesDB = new NotesDB();