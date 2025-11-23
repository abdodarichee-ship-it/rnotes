// إظهار اللافتة تلقائياً عند فتح الموقع أو عمل Refresh
window.onload = function() {
    showPasswordOverlay();
};

// إظهار اللافتة
function showPasswordOverlay() {
    const passwordDiv = document.getElementById("password");
    passwordDiv.style.display = "block";

    // إزالة رسالة الخطأ إذا كانت موجودة
    const errorMsg = document.getElementById("passwordError");
    if (errorMsg) errorMsg.remove();

    // مسح الحقل
    document.getElementById("passwordInput").value = "";

    // وضع التركيز على الحقل
    document.getElementById("passwordInput").focus();
}

// فحص كلمة المرور
function checkPassword() {
    const input = document.getElementById("passwordInput").value;
    
    if (input === "line") {
        document.getElementById("password").style.display = "none";
    } else {
        showError("Incorrect password, try again!");
    }
}

// إنشاء رسالة الخطأ أسفل مربع الإدخال
function showError(message) {
    let errorMsg = document.getElementById("passwordError");

    if (!errorMsg) {
        errorMsg = document.createElement("div");
        errorMsg.id = "passwordError";
        errorMsg.style.color = "#ff4d4f";
        errorMsg.style.marginTop = "10px";
        errorMsg.style.fontSize = "14px";
        errorMsg.style.fontWeight = "500";
        document.querySelector(".enter-password").appendChild(errorMsg);
    }

    errorMsg.textContent = message;
}

// السماح بالضغط على Enter للدخول
document.getElementById("passwordInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        checkPassword();
    }
});
