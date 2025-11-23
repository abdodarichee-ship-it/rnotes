let touchStartY = 0;
let touchCurrentY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
}, {passive: false});

document.addEventListener('touchmove', function(e) {
    touchCurrentY = e.touches[0].clientY;

    // إذا كان السحب للأسفل من أعلى الصفحة، امنع التحديث
    if (window.scrollY === 0 && touchCurrentY > touchStartY) {
        e.preventDefault();
    }
}, {passive: false});



//---------تاثير قوقل-------------//

