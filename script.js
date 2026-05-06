// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const tabName = this.dataset.tab;
        
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab
        this.classList.add('active');
        document.getElementById(tabName).classList.add('active');
    });
});

// Google Login
function loginWithGoogle() {
    // TODO: Implement Google OAuth
    // For now, show placeholder
    console.log('Redirecting to Google OAuth...');
    alert('Google OAuth integration sẽ được thêm vào backend');
    // window.location.href = '/auth/google';
}

// Phone OTP Functions
let otpCountdown = 0;
let currentPhone = '';

function sendOTP() {
    const phone = document.getElementById('phone').value;
    
    if (!phone) {
        alert('Vui lòng nhập số điện thoại');
        return;
    }
    
    if (phone.length !== 10) {
        alert('Số điện thoại phải có 10 chữ số');
        return;
    }
    
    currentPhone = phone;

    // Send OTP via API
    sendOTPAPI(phone)
        .then(result => {
            alert('Mã OTP đã được gửi tới ' + phone);
            
            // Show OTP verification section
            document.getElementById('otpSection').style.display = 'block';
            document.getElementById('phone').disabled = true;
            document.querySelector('[onclick="sendOTP()"]').disabled = true;
            
            // Start countdown
            startCountdown();
        })
        .catch(error => {
            alert('❌ Lỗi: ' + error.message);
        });
}

async function sendOTPAPI(phone) {
    return await sendOTP(phone);
}

function startCountdown() {
    otpCountdown = 60;
    const countdownEl = document.getElementById('countdown');
    const timerEl = document.getElementById('timer');
    
    const interval = setInterval(() => {
        otpCountdown--;
        countdownEl.textContent = otpCountdown;
        
        if (otpCountdown <= 0) {
            clearInterval(interval);
            timerEl.innerHTML = '<button type="button" class="btn btn-link" onclick="sendOTP()">Gửi lại mã</button>';
        }
    }, 1000);
}

function verifyOTP() {
    const otp = document.getElementById('otp').value;
    
    if (!otp) {
        alert('Vui lòng nhập mã OTP');
        return;
    }
    
    if (otp.length !== 6) {
        alert('Mã OTP phải có 6 chữ số');
        return;
    }
    
    // Verify OTP via API
    verifyOTPAPI(currentPhone, otp)
        .then(result => {
            alert('✓ Xác thực OTP thành công! Chào mừng!');
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        })
        .catch(error => {
            alert('❌ Lỗi: ' + error.message);
        });
}

async function verifyOTPAPI(phone, otp) {
    return await verifyOTP(phone, otp);
}

function resetPhoneForm() {
    document.getElementById('phoneForm').reset();
    document.getElementById('otpForm').reset();
    document.getElementById('otpSection').style.display = 'none';
    document.getElementById('phone').disabled = false;
    document.querySelector('[onclick="sendOTP()"]').disabled = false;
    currentPhone = '';
}

// Validate phone input - only numbers
document.getElementById('phone').addEventListener('input', function(e) {
    this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
});

// Validate OTP input - only numbers
document.getElementById('otp').addEventListener('input', function(e) {
    this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6);
});
