// مفتاح التخزين في localStorage - يمكن تغييره إذا لزم الأمر
const STORAGE_KEY = "notesMusic_v2";

// حالة التطبيق
let appState = {
    currentScreen: 'start',
    currentNote: null,
    player: null,
    isPlaying: false,
    isDragging: false,
    notes: [],
    history: ['start']
};

// عناصر DOM
const screens = {
    start: document.getElementById('startScreen'),
    youtubeInput: document.getElementById('youtubeInputScreen'),
    note: document.getElementById('noteScreen'),
    notesList: document.getElementById('notesListScreen')
};

const elements = {
    // الأزرار
    newMusicBtn: document.getElementById('newMusicBtn'),
    yourNotesBtn: document.getElementById('yourNotesBtn'),
    createNoteBtn: document.getElementById('createNoteBtn'),
    backFromYoutubeInput: document.getElementById('backFromYoutubeInput'),
    backFromNote: document.getElementById('backFromNote'),
    backFromNotesList: document.getElementById('backFromNotesList'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    playPauseIcon: document.getElementById('playPauseIcon'),
    shareNoteBtn: document.getElementById('shareNoteBtn'),
    deleteNoteBtn: document.getElementById('deleteNoteBtn'),
    
    // المدخلات
    youtubeUrl: document.getElementById('youtubeUrl'),
    noteText: document.getElementById('noteText'),
    
    // معلومات العرض
    noteTitle: document.getElementById('noteTitle'),
    playerTitle: document.getElementById('playerTitle'),
    currentTime: document.getElementById('currentTime'),
    duration: document.getElementById('duration'),
    
    // شريط التقدم
    progressBar: document.getElementById('progressBar'),
    progress: document.getElementById('progress'),
    progressHandle: document.getElementById('progressHandle'),
    
    // الحاويات
    notesContainer: document.getElementById('notesContainer'),
    youtubePlayer: document.getElementById('youtubePlayer'),
    
    // المودالات
    confirmModal: document.getElementById('confirmModal'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmMessage: document.getElementById('confirmMessage'),
    confirmCancel: document.getElementById('confirmCancel'),
    confirmOk: document.getElementById('confirmOk'),
    
    alertModal: document.getElementById('alertModal'),
    alertTitle: document.getElementById('alertTitle'),
    alertMessage: document.getElementById('alertMessage'),
    alertOk: document.getElementById('alertOk'),
    
    shareModal: document.getElementById('shareModal'),
    shareUrl: document.getElementById('shareUrl'),
    copyShareUrl: document.getElementById('copyShareUrl'),
    closeShareModal: document.getElementById('closeShareModal')
};

// تهيئة التطبيق
function init() {
    // تحميل الملاحظات من localStorage
    loadNotes();
    
    // إضافة مستمعي الأحداث
    setupEventListeners();
    
    // إدارة حالة التاريخ
    manageHistoryState();
    
    // تهيئة مشغل اليوتيوب
    initYouTubePlayer();
}

// تحميل الملاحظات من localStorage
function loadNotes() {
    const storedNotes = localStorage.getItem(STORAGE_KEY);
    if (storedNotes) {
        try {
            appState.notes = JSON.parse(storedNotes);
        } catch (e) {
            console.error('Error parsing stored notes:', e);
            appState.notes = [];
        }
    }
}

// حفظ الملاحظات في localStorage
function saveNotes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.notes));
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // أزرار التنقل الرئيسية
    elements.newMusicBtn.addEventListener('click', () => navigateTo('youtubeInput'));
    elements.yourNotesBtn.addEventListener('click', () => navigateTo('notesList'));
    
    // أزرار الرجوع
    elements.backFromYoutubeInput.addEventListener('click', goBack);
    elements.backFromNote.addEventListener('click', goBack);
    elements.backFromNotesList.addEventListener('click', goBack);
    
    // زر إنشاء ملاحظة جديدة
    elements.createNoteBtn.addEventListener('click', createNewNote);
    
    // عناصر مشغل الموسيقى
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
    
    // شريط التقدم
    elements.progressBar.addEventListener('click', handleProgressBarClick);
    elements.progressBar.addEventListener('touchstart', startDragging);
    elements.progressBar.addEventListener('mousedown', startDragging);
    
    // الحفظ التلقائي للنص
    elements.noteText.addEventListener('input', debounce(saveCurrentNote, 700));
    
    // أزرار الملاحظة
    elements.shareNoteBtn.addEventListener('click', shareNote);
    elements.deleteNoteBtn.addEventListener('click', deleteNote);
    
    // المودالات
    elements.confirmCancel.addEventListener('click', () => hideModal(elements.confirmModal));
    elements.confirmOk.addEventListener('click', handleConfirmOk);
    elements.alertOk.addEventListener('click', () => hideModal(elements.alertModal));
    elements.copyShareUrl.addEventListener('click', copyShareUrl);
    elements.closeShareModal.addEventListener('click', () => hideModal(elements.shareModal));
    
    // التعامل مع زر الرجوع في المتصفح
    window.addEventListener('popstate', handlePopState);
    
    // منع السلوك الافتراضي للسحب
    document.addEventListener('touchmove', (e) => {
        if (appState.isDragging) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // إيقاف السحب عند الرفع
    document.addEventListener('touchend', stopDragging);
    document.addEventListener('mouseup', stopDragging);
    
    // تحديث موضع السحب
    document.addEventListener('touchmove', handleDrag);
    document.addEventListener('mousemove', handleDrag);
}

// إدارة حالة التاريخ
function manageHistoryState() {
    // إذا كان هناك حالة في التاريخ، استخدمها
    if (history.state) {
        appState.history = history.state.history || ['start'];
        navigateTo(appState.history[appState.history.length - 1], false);
    } else {
        // إضافة الحالة الأولية
        history.replaceState({ history: ['start'] }, '', '');
    }
}

// التعامل مع زر الرجوع في المتصفح
function handlePopState(e) {
    if (e.state && e.state.history) {
        appState.history = e.state.history;
        const currentScreen = appState.history[appState.history.length - 1] || 'start';
        navigateTo(currentScreen, false);
    }
}

// التنقل إلى شاشة معينة
function navigateTo(screen, pushToHistory = true) {
    // إخفاء كل الشاشات أولاً
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    // إظهار الشاشة المطلوبة
    screens[screen].classList.add('active');
    appState.currentScreen = screen;
    
    // إضافة إلى سجل التاريخ إذا طُلب
    if (pushToHistory) {
        appState.history.push(screen);
        history.pushState({ history: [...appState.history] }, '', `#${screen}`);
    }
    
    // إجراءات خاصة بكل شاشة
    switch(screen) {
        case 'notesList':
            renderNotesList();
            break;
        case 'note':
            if (appState.currentNote) {
                updatePlayerTitle();
            }
            break;
    }
}

// العودة إلى الشاشة السابقة
function goBack() {
    if (appState.history.length > 1) {
        appState.history.pop();
        history.pushState({ history: [...appState.history] }, '', `#${appState.history[appState.history.length - 1]}`);
        const previousScreen = appState.history[appState.history.length - 1];
        navigateTo(previousScreen, false);
    }
}

// إنشاء ملاحظة جديدة
function createNewNote() {
    const url = elements.youtubeUrl.value.trim();
    if (!url) {
        showAlert('Error', 'Please enter a YouTube URL');
        return;
    }
    
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        showAlert('Error', 'Invalid YouTube URL. Please check the link and try again.');
        return;
    }
    
    // إنشاء ملاحظة جديدة
    const newNote = {
        id: generateId(),
        videoId: videoId,
        text: '',
        title: 'YouTube Video',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // إضافة الملاحظة إلى القائمة
    appState.notes.unshift(newNote);
    saveNotes();
    
    // فتح الملاحظة الجديدة
    openNote(newNote);
    
    // الانتقال إلى شاشة الملاحظة
    navigateTo('note');
    
    // محو حقل الإدخال
    elements.youtubeUrl.value = '';
}

// استخراج معرف فيديو يوتيوب من الرابط
function extractYouTubeId(url) {
    // دعم جميع صيغ روابط اليوتيوب
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// فتح ملاحظة
function openNote(note) {
    appState.currentNote = note;
    elements.noteText.value = note.text;
    
    // تحميل فيديو يوتيوب
    loadYouTubeVideo(note.videoId);
}

// تهيئة مشغل اليوتيوب
function initYouTubePlayer() {
    // هذا سيتم استدعاؤه تلقائياً من قبل YouTube IFrame API
    window.onYouTubeIframeAPIReady = function() {
        // سيتم إنشاء المشغل عند تحميل الفيديو
    };
}

// تحميل فيديو يوتيوب
function loadYouTubeVideo(videoId) {
    if (appState.player) {
        appState.player.destroy();
    }
    
    // إنشاء مشغل يوتيوب جديد
    appState.player = new YT.Player('youtubePlayer', {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'rel': 0,
            'modestbranding': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

// عندما يكون لاعب يوتيوب جاهز
function onPlayerReady(event) {
    updatePlayerTitle();
    updateDurationDisplay();
    
    // بدء تحديث شريط التقدم
    requestAnimationFrame(updateProgressBar);
}

// عندما تتغير حالة لاعب يوتيوب
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        appState.isPlaying = true;
        elements.playPauseIcon.className = 'fas fa-pause';
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        appState.isPlaying = false;
        elements.playPauseIcon.className = 'fas fa-play';
    }
}

// عند حدوث خطأ في المشغل
function onPlayerError(event) {
    console.error('YouTube player error:', event.data);
    showAlert('Playback Error', 'There was an error playing this video. It may be unavailable or restricted.');
}

// تبديل التشغيل/الإيقاف
function togglePlayPause() {
    if (!appState.player) return;
    
    if (appState.isPlaying) {
        appState.player.pauseVideo();
    } else {
        appState.player.playVideo();
    }
}

// تحديث شريط التقدم
function updateProgressBar() {
    if (appState.player && appState.player.getCurrentTime) {
        const currentTime = appState.player.getCurrentTime();
        const duration = appState.player.getDuration();
        
        if (duration > 0 && !appState.isDragging) {
            const progressPercent = (currentTime / duration) * 100;
            elements.progress.style.width = `${progressPercent}%`;
            elements.currentTime.textContent = formatTime(currentTime);
        }
        
        // الاستمرار في التحديث
        requestAnimationFrame(updateProgressBar);
    }
}

// تحديث عرض المدة
function updateDurationDisplay() {
    if (appState.player && appState.player.getDuration) {
        const duration = appState.player.getDuration();
        elements.duration.textContent = formatTime(duration);
    }
}

// تحديث عنوان المشغل
function updatePlayerTitle() {
    if (appState.currentNote) {
        // في تطبيق حقيقي، يمكننا استخدام YouTube Data API للحصول على العنوان
        // لكن هنا سنستخدم معرف الفيديو فقط للتبسيط
        elements.playerTitle.textContent = `YouTube Video (${appState.currentNote.videoId})`;
        elements.noteTitle.textContent = 'Note';
    }
}

// تنسيق الوقت
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// التعامل مع النقر على شريط التقدم
function handleProgressBarClick(e) {
    if (!appState.player) return;
    
    const rect = elements.progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * appState.player.getDuration();
    
    appState.player.seekTo(newTime, true);
}

// بدء سحب شريط التقدم
function startDragging(e) {
    appState.isDragging = true;
    elements.progressBar.classList.add('dragging');
    
    // تحديث الموضع الأولي
    handleDrag(e);
}

// إيقاف سحب شريط التقدم
function stopDragging() {
    if (appState.isDragging) {
        appState.isDragging = false;
        elements.progressBar.classList.remove('dragging');
    }
}

// التعامل مع السحب
function handleDrag(e) {
    if (!appState.isDragging || !appState.player) return;
    
    const rect = elements.progressBar.getBoundingClientRect();
    let clientX;
    
    if (e.type.includes('touch')) {
        clientX = e.touches[0].clientX;
    } else {
        clientX = e.clientX;
    }
    
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = percent * appState.player.getDuration();
    
    // تحديث العرض
    elements.progress.style.width = `${percent * 100}%`;
    elements.currentTime.textContent = formatTime(newTime);
    
    // إذا كان المستخدم يحرك المؤشر، تحديث الوقت
    if (e.type === 'mousemove' || e.type === 'touchmove') {
        appState.player.seekTo(newTime, true);
    }
}

// حفظ الملاحظة الحالية
function saveCurrentNote() {
    if (!appState.currentNote) return;
    
    appState.currentNote.text = elements.noteText.value;
    appState.currentNote.updatedAt = new Date().toISOString();
    
    // تحديث الملاحظة في القائمة
    const noteIndex = appState.notes.findIndex(note => note.id === appState.currentNote.id);
    if (noteIndex !== -1) {
        appState.notes[noteIndex] = {...appState.currentNote};
        saveNotes();
    }
}

// عرض قائمة الملاحظات
function renderNotesList() {
    elements.notesContainer.innerHTML = '';
    
    if (appState.notes.length === 0) {
        elements.notesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-music"></i>
                <p>No notes yet. Create your first note!</p>
            </div>
        `;
        return;
    }
    
    appState.notes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-card';
        noteElement.addEventListener('click', () => {
            openNote(note);
            navigateTo('note');
        });
        
        const preview = note.text.length > 50 
            ? note.text.substring(0, 50) + '...' 
            : note.text;
        
        const date = new Date(note.createdAt).toLocaleDateString();
        
        noteElement.innerHTML = `
            <div class="note-thumbnail">
                <img src="https://i.ytimg.com/vi/${note.videoId}/hqdefault.jpg" alt="Video thumbnail" 
                     onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\'fas fa-music\\'></i>';">
            </div>
            <div class="note-content">
                <div class="note-title">${note.title}</div>
                <div class="note-preview">${preview || 'No content yet'}</div>
                <div class="note-date">${date}</div>
            </div>
        `;
        
        elements.notesContainer.appendChild(noteElement);
    });
}

// مشاركة الملاحظة
function shareNote() {
    if (!appState.currentNote) return;
    
    // إنشاء رابط مشاركة (في تطبيق حقيقي، قد يكون هذا رابطاً إلى خادم)
    const shareData = {
        noteId: appState.currentNote.id,
        videoId: appState.currentNote.videoId,
        text: appState.currentNote.text
    };
    
    const shareUrl = `${window.location.origin}${window.location.pathname}#share-${btoa(JSON.stringify(shareData))}`;
    elements.shareUrl.value = shareUrl;
    
    showModal(elements.shareModal);
}

// نسخ رابط المشاركة
function copyShareUrl() {
    elements.shareUrl.select();
    document.execCommand('copy');
    
    showAlert('Success', 'Link copied to clipboard!');
}

// حذف الملاحظة
function deleteNote() {
    if (!appState.currentNote) return;
    
    showConfirm(
        'Delete Note',
        'Are you sure you want to delete this note? This action cannot be undone.',
        () => {
            // إزالة الملاحظة من القائمة
            appState.notes = appState.notes.filter(note => note.id !== appState.currentNote.id);
            saveNotes();
            
            // العودة إلى القائمة
            navigateTo('notesList');
            
            showAlert('Success', 'Note deleted successfully.');
        }
    );
}

// عرض تأكيد
function showConfirm(title, message, onConfirm) {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    elements.confirmOk.onclick = onConfirm;
    showModal(elements.confirmModal);
}

// عرض تنبيه
function showAlert(title, message) {
    elements.alertTitle.textContent = title;
    elements.alertMessage.textContent = message;
    showModal(elements.alertModal);
}

// إظهار المودال
function showModal(modal) {
    modal.classList.add('active');
}

// إخفاء المودال
function hideModal(modal) {
    modal.classList.remove('active');
}

// التعامل مع تأكيد OK
function handleConfirmOk() {
    // سيتم تنفيذ الإجراء المحدد مسبقاً
    hideModal(elements.confirmModal);
}

// إنشاء معرف فريد
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// دالة debounce لتأخير التنفيذ
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

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', init);