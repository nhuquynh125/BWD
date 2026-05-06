// Validate Username
function validateUsername(username) {
    if (username.length < 3) {
        return 'Tên người dùng phải ít nhất 3 ký tự';
    }
    if (username.length > 30) {
        return 'Tên người dùng tối đa 30 ký tự';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return 'Tên người dùng chỉ chứa chữ, số, dấu gạch dưới và gạch ngang';
    }
    return '';
}

// Validate Email
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Email không hợp lệ';
    }
    return '';
}

// Validate Phone
function validatePhone(phone) {
    if (phone.length !== 10) {
        return 'Số điện thoại phải 10 chữ số';
    }
    if (!/^[0-9]{10}$/.test(phone)) {
        return 'Số điện thoại chỉ chứa chữ số';
    }
    return '';
}

// Validate Password Strength
function checkPasswordStrength(password) {
    let strength = 0;
    let strengthText = '';
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    const strengthBar = document.getElementById('strengthBar');
    const strengthTextEl = document.getElementById('strengthText');
    
    if (strength < 2) {
        strengthTextEl.textContent = 'Yếu';
        strengthBar.style.width = '33%';
        strengthBar.style.background = '#ff4757';
    } else if (strength < 4) {
        strengthTextEl.textContent = 'Vừa phải';
        strengthBar.style.width = '66%';
        strengthBar.style.background = '#ffa502';
    } else {
        strengthTextEl.textContent = 'Mạnh';
        strengthBar.style.width = '100%';
        strengthBar.style.background = '#2ed573';
    }
    
    return strength >= 2 ? '' : 'Mật khẩu quá yếu. Sử dụng chữ hoa, số và ký tự đặc biệt';
}

// Validate Passwords Match
function validatePasswordMatch(password, confirmPassword) {
    if (password !== confirmPassword) {
        return 'Mật khẩu không khớp';
    }
    return '';
}

// Toggle Password Visibility
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const isPassword = field.type === 'password';
    field.type = isPassword ? 'text' : 'password';
}

// Clear Error Message
function clearError(fieldId) {
    const errorEl = document.getElementById(fieldId + 'Error');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
    }
}

// Show Error Message
function showError(fieldId, message) {
    const errorEl = document.getElementById(fieldId + 'Error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
}

// Real-time Validation
document.getElementById('username')?.addEventListener('blur', function() {
    const error = validateUsername(this.value);
    if (error) {
        showError('username', error);
    } else {
        clearError('username');
    }
});

document.getElementById('email')?.addEventListener('blur', function() {
    const error = validateEmail(this.value);
    if (error) {
        showError('email', error);
    } else {
        clearError('email');
    }
});

document.getElementById('signupPhone')?.addEventListener('blur', function() {
    const error = validatePhone(this.value);
    if (error) {
        showError('phone', error);
    } else {
        clearError('phone');
    }
});

document.getElementById('signupPhone')?.addEventListener('input', function() {
    this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
});

document.getElementById('password')?.addEventListener('input', function() {
    const error = checkPasswordStrength(this.value);
    if (error) {
        showError('password', error);
    } else {
        clearError('password');
    }
});

document.getElementById('confirmPassword')?.addEventListener('blur', function() {
    const password = document.getElementById('password').value;
    const error = validatePasswordMatch(password, this.value);
    if (error) {
        showError('confirmPassword', error);
    } else {
        clearError('confirmPassword');
    }
});

// Form Submit
document.getElementById('signupForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('signupPhone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    
    let hasError = false;
    
    // Validate all fields
    let error = validateUsername(username);
    if (error) {
        showError('username', error);
        hasError = true;
    } else {
        clearError('username');
    }
    
    error = validateEmail(email);
    if (error) {
        showError('email', error);
        hasError = true;
    } else {
        clearError('email');
    }
    
    error = validatePhone(phone);
    if (error) {
        showError('phone', error);
        hasError = true;
    } else {
        clearError('phone');
    }
    
    if (password.length < 8) {
        showError('password', 'Mật khẩu phải ít nhất 8 ký tự');
        hasError = true;
    } else {
        clearError('password');
    }
    
    error = validatePasswordMatch(password, confirmPassword);
    if (error) {
        showError('confirmPassword', error);
        hasError = true;
    } else {
        clearError('confirmPassword');
    }
    
    if (!terms) {
        showError('terms', 'Vui lòng đồng ý với điều khoản dịch vụ');
        hasError = true;
    } else {
        clearError('terms');
    }
    
    if (hasError) {
        return;
    }
    
    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Đang tạo tài khoản...';
    submitBtn.disabled = true;

    try {
        // Send signup to backend
        const result = await signupUser(username, email, phone, password);
        
        if (result.ok) {
            alert('✓ Đăng ký thành công! Vui lòng đăng nhập.');
            window.location.href = 'index.html';
        } else {
            alert('❌ Lỗi: ' + (result.error || 'Đăng ký thất bại'));
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        alert('❌ Lỗi: ' + error.message);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Google Sign Up
function signupWithGoogle() {
    // TODO: Implement Google OAuth
    console.log('Redirecting to Google OAuth for signup...');
    alert('Google OAuth integration sẽ được thêm vào backend');
    // window.location.href = '/auth/google/signup';
}
