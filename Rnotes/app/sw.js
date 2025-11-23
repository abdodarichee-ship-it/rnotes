self.addEventListener('install', event => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', event => {
  // يمكن إضافة كاش لاحقًا لتعمل الصفحة أوفلاين
});







// -------------------- إدارة كل اللافتات --------------------
let openOverlays = [];

function hideLastOverlay() {
    if (openOverlays.length === 0) return;
    const lastOverlay = openOverlays.pop();
    lastOverlay.style.display = "none";
}

window.addEventListener("popstate", function(event) {
    hideLastOverlay();
});

const overlays = document.querySelectorAll(
    "#search, #plusnuts, #archive, #contextMenu, #archiveContextMenu, #textContextMenu, #archiveModal"
);

overlays.forEach(overlay => {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === "attributes" && mutation.attributeName === "style") {
                const style = window.getComputedStyle(overlay);
                if (style.display !== "none" && !openOverlays.includes(overlay)) {
                    openOverlays.push(overlay);
                    if (!history.state || !history.state.overlay) {
                        history.pushState({ overlay: true }, '');
                    }
                } else if (style.display === "none") {
                    openOverlays = openOverlays.filter(o => o !== overlay);
                }
            }
        });
    });
    observer.observe(overlay, { attributes: true });
});

// -------------------- إعداد اللافتة السفلية --------------------
const sheet = document.getElementById('sheet');
const overlay = document.getElementById('sheetOverlay');

let startY = 0, currentY = 0, isDragging = false, sheetHeight = 0;
let startTime = 0, velocity = 0, lastY = 0;

function openSheet() {
    if (sheet.classList.contains('open')) return;
    sheet.classList.add('open');
    sheet.style.transform = 'translateY(0)';
    overlay.style.display = 'block';
    requestAnimationFrame(() => overlay.style.opacity = '1');

    document.addEventListener('keydown', handleKeyDown);
    if (!history.state || !history.state.sheetOpen) {
        history.pushState({ sheetOpen: true }, '');
    }
    document.body.style.overflow = 'hidden';
}

function closeSheet() {
    if (!sheet.classList.contains('open')) return;
    sheet.classList.remove('open');
    sheet.style.transform = 'translateY(100%)';
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }, 250);
    document.removeEventListener('keydown', handleKeyDown);
    if (history.state && history.state.sheetOpen) {
        history.replaceState({ sheetOpen: false }, '');
    }
}

function handleButtonClick() {
    closeSheet();
}

function handleKeyDown(e) {
    if (e.key === 'Escape') closeSheet();
}

function calculateVelocity(y, time) {
    const deltaY = y - lastY;
    const deltaTime = time - startTime;
    if (deltaTime > 0) velocity = deltaY / deltaTime;
    lastY = y;
    startTime = time;
}

function setupDragEvents() {
    const startDrag = (clientY, time) => {
        isDragging = true;
        startY = currentY = lastY = clientY;
        startTime = time;
        velocity = 0;
        sheetHeight = sheet.getBoundingClientRect().height;
        sheet.style.transition = 'none';
        overlay.style.transition = 'none';
    };

    sheet.addEventListener('touchstart', e => startDrag(e.touches[0].clientY, e.timeStamp));
    sheet.addEventListener('mousedown', e => { startDrag(e.clientY, e.timeStamp); e.preventDefault(); });

    const handleMove = e => {
        if (!isDragging) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        calculateVelocity(clientY, e.timeStamp);
        const deltaY = clientY - startY;
        const translateY = Math.max(0, (deltaY / sheetHeight) * 100);
        sheet.style.transform = `translateY(${translateY}%)`;
        overlay.style.opacity = `${Math.max(0, 1 - translateY / 100)}`;
        currentY = clientY;
    };

    const handleEnd = e => {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)';
        overlay.style.transition = 'opacity 0.25s ease';
        const translate = parseFloat(sheet.style.transform.replace('translateY(', '').replace('%)', '')) || 0;
        const shouldClose = translate > 40 || (translate > 20 && velocity > 0.5) || velocity > 1;
        shouldClose ? closeSheet() : (() => { sheet.style.transform = 'translateY(0)'; overlay.style.opacity = '1'; })();
    };

    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', e => { if (isDragging) e.preventDefault(); }, { passive: false });
}

overlay.addEventListener('click', closeSheet);
sheet.addEventListener('click', e => e.stopPropagation());

window.addEventListener('popstate', () => {
    if (sheet.classList.contains('open')) closeSheet();
});

document.addEventListener('DOMContentLoaded', () => {
    setupDragEvents();
    const openButton = document.querySelector('.open-btn');
    if (openButton) openButton.addEventListener('click', openSheet);
    sheet.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleButtonClick));
    window.history.replaceState({ sheetOpen: false }, '');
});

window.openSheet = openSheet;
window.closeSheet = closeSheet;
window.handleButtonClick = handleButtonClick;
