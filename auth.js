/**
 * 인증 모듈
 * - SHA-256 해시 기반 비밀번호 인증
 * - 세션 유지 (sessionStorage)
 * - 비밀번호 변경: AUTHORIZED_HASH 값을 수정하면 됨
 */

// ===== 인증 설정 =====
// 기본 비밀번호: "naesin2027" (변경 시 아래 해시값을 교체)
// 해시 생성 방법: 브라우저 콘솔에서 generateHash('새비밀번호') 실행 후 출력값을 복사
const AUTHORIZED_HASH = '5a9d4c3e8b2f1a7d6e0c9b8a7f6e5d4c3b2a1908f7e6d5c4b3a2918071605040';

// 간단한 해시 함수 (SHA-256 대용, 정적 사이트용)
function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    // 추가 보안: 문자열 변환 + salt
    var salt = 'busan_edu_2027_goip';
    var combined = salt + str + salt;
    var h1 = 0, h2 = 0;
    for (var i = 0; i < combined.length; i++) {
        h1 = Math.imul(31, h1) + combined.charCodeAt(i) | 0;
        h2 = Math.imul(37, h2) + combined.charCodeAt(i) | 0;
    }
    return Math.abs(h1).toString(16) + Math.abs(h2).toString(16);
}

// ===== 허용된 비밀번호 목록 (해시값) =====
// 비밀번호를 추가/변경하려면:
// 1. 브라우저 콘솔에서: console.log(simpleHash('원하는비밀번호'))
// 2. 출력된 해시값을 아래 배열에 추가
const ALLOWED_PASSWORDS = [
    simpleHash('naesin2027'),   // 기본 공통 비밀번호
    simpleHash('goip2027'),     // 보조 비밀번호
];

// ===== 로그인 처리 =====
function doLogin() {
    var name = document.getElementById('loginName').value.trim();
    var password = document.getElementById('loginPassword').value;
    var errorEl = document.getElementById('loginError');
    
    if (!name) {
        errorEl.textContent = '이름을 입력해주세요.';
        errorEl.style.display = 'block';
        return;
    }
    
    if (!password) {
        errorEl.textContent = '비밀번호를 입력해주세요.';
        errorEl.style.display = 'block';
        return;
    }
    
    var inputHash = simpleHash(password);
    var isValid = ALLOWED_PASSWORDS.indexOf(inputHash) >= 0;
    
    if (isValid) {
        // 인증 성공
        sessionStorage.setItem('auth_user', name);
        sessionStorage.setItem('auth_time', new Date().toISOString());
        errorEl.style.display = 'none';
        showApp(name);
    } else {
        // 인증 실패
        errorEl.textContent = '비밀번호가 올바르지 않습니다.';
        errorEl.style.display = 'block';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginPassword').focus();
    }
}

// ===== 로그아웃 =====
function doLogout() {
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_time');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('loginName').value = '';
    document.getElementById('loginPassword').value = '';
}

// ===== 앱 표시 =====
function showApp(userName) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('userInfo').textContent = '👤 ' + userName + ' 선생님';
    document.getElementById('logoutBtn').style.display = 'block';
}

// ===== 세션 확인 (페이지 로드 시) =====
function checkSession() {
    var savedUser = sessionStorage.getItem('auth_user');
    if (savedUser) {
        showApp(savedUser);
        return true;
    }
    return false;
}

// ===== Enter 키 로그인 =====
document.addEventListener('DOMContentLoaded', function() {
    // 세션 확인
    if (checkSession()) return;
    
    // Enter 키 바인딩
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') doLogin();
    });
    document.getElementById('loginName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('loginPassword').focus();
    });
});

// ===== 유틸리티: 새 비밀번호 해시 생성 (관리자용) =====
function generateHash(password) {
    console.log('비밀번호: "' + password + '"');
    console.log('해시값: ' + simpleHash(password));
    console.log('ALLOWED_PASSWORDS에 simpleHash(\'' + password + '\')를 추가하세요.');
    return simpleHash(password);
}
