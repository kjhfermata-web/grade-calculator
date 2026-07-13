/**
 * 2027학년도 부산광역시 고입전형 중학교 내신성적 산출 프로그램
 * - 6개 학급 담임이 각자 반 자료 업로드
 * - 전교생 통합 석차백분율 산출
 */

const TOTAL_CLASSES = 6;
const GRADE_LEVELS = ['A','B','C','D','E'];
const GRADE_SCORES = { A: 5, B: 4, C: 3, D: 2, E: 1 };

// 전역 데이터 저장소
let classData = {};
for (let i = 1; i <= TOTAL_CLASSES; i++) {
    classData[i] = { naesin: null, grades: null, loaded: false };
}
let allStudents = [];
let resultData = [];

// ===== 출결 점수 계산 =====
function calcAttendanceScore(absentDays) {
    if (absentDays <= 0) return 21;
    if (absentDays <= 2) return 20;
    if (absentDays <= 4) return 19;
    if (absentDays <= 6) return 18;
    if (absentDays <= 8) return 17;
    if (absentDays <= 10) return 16;
    if (absentDays <= 12) return 15;
    if (absentDays <= 14) return 14;
    if (absentDays <= 16) return 13;
    return 12;
}

// ===== 봉사활동 점수 계산 (학년당 기준시수 20시간) =====
function calcVolunteerBaseScore(hours) {
    if (hours >= 20) return 4;
    if (hours >= 10) return 3;
    return 2;
}

// ===== 교과 성취도 환산점수 =====
function gradeToScore(grade) {
    if (!grade && grade !== 0) return 0;
    var g = String(grade).trim().toUpperCase();
    
    // 성취도 문자 (A~E)
    if (GRADE_SCORES[g] !== undefined) return GRADE_SCORES[g];
    
    // 체육예술 교과: 우수=A(5), 보통=B(4), 미흡=C(3)
    if (g === '우수' || g.indexOf('우') >= 0) return 5;
    if (g === '보통' || g.indexOf('보') >= 0) return 4;
    if (g === '미흡' || g.indexOf('미') >= 0) return 3;
    
    // 원점수(숫자)인 경우 → 성취도로 변환
    var num = parseFloat(grade);
    if (!isNaN(num) && num >= 0 && num <= 100) {
        return scoreToGradePoint(num);
    }
    
    return 0;
}

// ===== 원점수 → 환산점수 변환 (일반교과 기준) =====
function scoreToGradePoint(rawScore) {
    if (rawScore >= 90) return 5;  // A
    if (rawScore >= 80) return 4;  // B
    if (rawScore >= 70) return 3;  // C
    if (rawScore >= 60) return 2;  // D
    return 1;                       // E
}

// ===== 체육/예술 교과 원점수 → 환산점수 변환 =====
// (80이상=A=5, 60~79=B=4, 60미만=C=3 이지만 환산점수는 동일 적용)
var PE_ART_SUBJECTS = ['체육', '음악', '미술'];
function isPeArtSubject(subjectName) {
    for (var i = 0; i < PE_ART_SUBJECTS.length; i++) {
        if (subjectName.indexOf(PE_ART_SUBJECTS[i]) >= 0) return true;
    }
    return false;
}
function scoreToGradePointPE(rawScore) {
    if (rawScore >= 80) return 5;  // A
    if (rawScore >= 60) return 4;  // B
    return 3;                       // C
}

// ===== 교과 성적 산출 =====
// freeType: '1semester' (1학년 1개 학기 자유학기제) 또는 '2semester' (1학년 2개 학기)
function calcSubjectScore(studentGrades, freeType) {
    var baseScore = 96; // 기본점수 40%
    
    if (freeType === '2semester') {
        // 1학년 2개 학기 자유학기제: 2학년 40% + 3학년 60%
        var s21 = studentGrades['2-1'] || { sum: 0, count: 0 };
        var s22 = studentGrades['2-2'] || { sum: 0, count: 0 };
        var s31 = studentGrades['3-1'] || { sum: 0, count: 0 };
        var s32 = studentGrades['3-2'] || { sum: 0, count: 0 };
        
        var val21 = s21.count > 0 ? s21.sum / s21.count : 0;
        var val22 = s22.count > 0 ? s22.sum / s22.count : 0;
        var val31 = s31.count > 0 ? s31.sum / s31.count : 0;
        var val32 = s32.count > 0 ? s32.sum / s32.count : 0;
        
        var score = baseScore + (5.76 * (val21 + val22)) + (8.64 * (val31 + val32));
        return Math.round(score * 1000) / 1000;
    } else {
        // 1학년 1개 학기 자유학기제: 1학년 10% + 2학년 40% + 3학년 50%
        var s1j = studentGrades['1-2'] || studentGrades['1-1'] || { sum: 0, count: 0 };
        var s21b = studentGrades['2-1'] || { sum: 0, count: 0 };
        var s22b = studentGrades['2-2'] || { sum: 0, count: 0 };
        var s31b = studentGrades['3-1'] || { sum: 0, count: 0 };
        var s32b = studentGrades['3-2'] || { sum: 0, count: 0 };
        
        var val1j = s1j.count > 0 ? s1j.sum / s1j.count : 0;
        var val21b = s21b.count > 0 ? s21b.sum / s21b.count : 0;
        var val22b = s22b.count > 0 ? s22b.sum / s22b.count : 0;
        var val31b = s31b.count > 0 ? s31b.sum / s31b.count : 0;
        var val32b = s32b.count > 0 ? s32b.sum / s32b.count : 0;
        
        var score = baseScore + (2.88 * val1j) + (5.76 * (val21b + val22b)) + (7.2 * (val31b + val32b));
        return Math.round(score * 1000) / 1000;
    }
}

// ===== 수기용 내신 엑셀 파싱 =====
function parseNaesinExcel(workbook, classNum) {
    var students = [];
    var sheetNames = workbook.SheetNames;
    
    // 인적사항 시트에서 학생 목록 추출
    var personalSheet = null;
    for (var i = 0; i < sheetNames.length; i++) {
        if (sheetNames[i].indexOf('인적') >= 0) { personalSheet = sheetNames[i]; break; }
    }
    
    // 개인별확인용 시트에서 비교과 점수 추출
    var confirmSheet = null;
    for (var i = 0; i < sheetNames.length; i++) {
        if (sheetNames[i].indexOf('개인별') >= 0) { confirmSheet = sheetNames[i]; break; }
    }
    
    // 출결상황 시트
    var attendSheet = null;
    for (var i = 0; i < sheetNames.length; i++) {
        if (sheetNames[i].indexOf('출결') >= 0) { attendSheet = sheetNames[i]; break; }
    }
    
    // 자율활동 시트
    var autoSheet = null;
    for (var i = 0; i < sheetNames.length; i++) {
        if (sheetNames[i].indexOf('자율') >= 0) { autoSheet = sheetNames[i]; break; }
    }
    
    // 동아리활동 시트
    var clubSheet = null;
    for (var i = 0; i < sheetNames.length; i++) {
        if (sheetNames[i].indexOf('동아리') >= 0) { clubSheet = sheetNames[i]; break; }
    }
    
    // 봉사활동 시트
    var volSheet = null;
    for (var i = 0; i < sheetNames.length; i++) {
        if (sheetNames[i].indexOf('봉사') >= 0) { volSheet = sheetNames[i]; break; }
    }
    
    // 개인별확인용 시트 파싱 (가장 신뢰도 높음)
    if (confirmSheet) {
        var data = XLSX.utils.sheet_to_json(workbook.Sheets[confirmSheet], { header: 1, defval: '' });
        students = parseConfirmSheet(data, classNum);
    }
    
    // 출결상황에서 상세 데이터 보강
    if (attendSheet) {
        var attData = XLSX.utils.sheet_to_json(workbook.Sheets[attendSheet], { header: 1, defval: '' });
        enrichAttendanceData(students, attData);
    }
    
    // 봉사활동에서 시수 데이터 보강
    if (volSheet) {
        var volData = XLSX.utils.sheet_to_json(workbook.Sheets[volSheet], { header: 1, defval: '' });
        enrichVolunteerData(students, volData);
    }
    
    return students;
}

// ===== 개인별확인용 시트 파싱 =====
function parseConfirmSheet(data, classNum) {
    var students = [];
    // 헤더행 찾기: '출결' 과 '자율' 이 포함된 행, 또는 '출결상황' 이 포함된 행
    var headerRow = -1;
    var colMap = { attend: -1, auto: -1, club: -1, vol: -1, total: -1 };
    
    for (var i = 0; i < Math.min(data.length, 10); i++) {
        var row = data[i];
        if (!row) continue;
        var rowStr = row.join(' ');
        if (rowStr.indexOf('출결') >= 0 && (rowStr.indexOf('자율') >= 0 || rowStr.indexOf('봉사') >= 0)) {
            headerRow = i;
            // 컬럼 인덱스 파악
            for (var j = 0; j < row.length; j++) {
                var cell = String(row[j] || '').trim();
                if (cell.indexOf('출결') >= 0) colMap.attend = j;
                else if (cell.indexOf('자율') >= 0) colMap.auto = j;
                else if (cell.indexOf('동아리') >= 0) colMap.club = j;
                else if (cell.indexOf('봉사') >= 0) colMap.vol = j;
                else if (cell === '총점') colMap.total = j;
            }
            break;
        }
    }
    
    // 기본 컬럼 위치 (개인별확인용 시트 고정 구조)
    if (colMap.attend < 0) colMap.attend = 3;
    if (colMap.auto < 0) colMap.auto = 4;
    if (colMap.club < 0) colMap.club = 5;
    if (colMap.vol < 0) colMap.vol = 6;
    if (colMap.total < 0) colMap.total = 7;
    
    // 데이터 행 파싱
    var startRow = headerRow >= 0 ? headerRow + 1 : 3;
    for (var i = startRow; i < data.length; i++) {
        var row = data[i];
        if (!row || row.length < 7) continue;
        
        var ban = parseInt(row[0]) || 0;
        var num = parseInt(row[1]) || 0;
        var name = String(row[2] || '').trim();
        
        // 유효한 학생 데이터인지 확인 (이름이 비어있으면 번호로 대체)
        if (ban !== classNum || num === 0) continue;
        if (!name || name === '0') name = num + '번';
        
        // 항목별 점수
        var attendScore = parseInt(row[colMap.attend]) || 0;
        var autoScore = parseInt(row[colMap.auto]) || 0;
        var clubScore = parseInt(row[colMap.club]) || 0;
        var volScore = parseInt(row[colMap.vol]) || 0;
        
        students.push({
            classNum: classNum,
            number: num,
            name: name,
            attend: attendScore,
            auto: autoScore,
            club: clubScore,
            volunteer: volScore,
            nonSubjectTotal: attendScore + autoScore + clubScore + volScore,
            subjectScore: 0,
            totalScore: 0,
            rank: 0,
            percentile: 0,
            gradesBySemester: {}
        });
    }
    return students;
}

// ===== 출결 상세 데이터 보강 =====
function enrichAttendanceData(students, data) {
    // 출결시트에서 총결석일수, 미인정결석/지각/조퇴/결과 파싱
    for (var i = 3; i < data.length; i++) {
        var row = data[i];
        if (!row || row.length < 5) continue;
        var ban = parseInt(row[0]) || 0;
        var num = parseInt(row[1]) || 0;
        if (ban === 0 || num === 0) continue;
        
        var student = students.find(function(s) { return s.number === num; });
        if (!student) continue;
        
        // 총결석일수는 이미 개인별확인용에서 점수로 반영됨
    }
}

// ===== 봉사활동 시수 보강 =====
function enrichVolunteerData(students, data) {
    for (var i = 3; i < data.length; i++) {
        var row = data[i];
        if (!row || row.length < 7) continue;
        var ban = parseInt(row[0]) || 0;
        var num = parseInt(row[1]) || 0;
        if (ban === 0 || num === 0) continue;
        
        var student = students.find(function(s) { return s.number === num; });
        if (!student) continue;
        
        // 봉사시수: 1학년시수, 가산점, 2학년시수, 가산점, 3학년시수, 가산점
        student.volHours1 = parseFloat(row[3]) || 0;
        student.volHours2 = parseFloat(row[5]) || 0;
        student.volHours3 = parseFloat(row[7]) || 0;
    }
}

// ===== 교과 성적 파일 파싱 (수기용 내신 또는 NEIS) =====
function parseGradeExcel(workbook, classNum, students) {
    var sheetNames = workbook.SheetNames;
    
    // 시트 형식 감지: NEIS 형식 또는 수기용 내신 형식
    var isNeisFormat = sheetNames.some(function(name) {
        return name.indexOf('학년') >= 0 && name.indexOf('학기') >= 0;
    });
    
    if (isNeisFormat) {
        parseNeisGrades(workbook, classNum, students);
    } else {
        parseLegacyGrades(workbook, classNum, students);
    }
}

// ===== NEIS 형식 파싱 (시트명: "1학년 2학기", "2학년 1학기" 등) =====
function parseNeisGrades(workbook, classNum, students) {
    var sheetNames = workbook.SheetNames;
    
    // 시트명에서 학년-학기 매핑
    var semesterMap = {
        '1-1': ['1학년 1학기', '1학년1학기'],
        '1-2': ['1학년 2학기', '1학년2학기'],
        '2-1': ['2학년 1학기', '2학년1학기'],
        '2-2': ['2학년 2학기', '2학년2학기'],
        '3-1': ['3학년 1학기', '3학년1학기'],
        '3-2': ['3학년 2학기', '3학년2학기']
    };
    
    Object.keys(semesterMap).forEach(function(semester) {
        var possibleNames = semesterMap[semester];
        var foundSheet = null;
        
        for (var i = 0; i < sheetNames.length; i++) {
            for (var j = 0; j < possibleNames.length; j++) {
                if (sheetNames[i].trim() === possibleNames[j]) {
                    foundSheet = sheetNames[i];
                    break;
                }
            }
            if (foundSheet) break;
        }
        
        if (foundSheet) {
            var data = XLSX.utils.sheet_to_json(workbook.Sheets[foundSheet], { header: 1, defval: '' });
            parseNeisSemesterSheet(data, semester, classNum, students);
        }
    });
}

function parseNeisSemesterSheet(data, semester, classNum, students) {
    // 헤더 행 찾기 (반, 번호, 성명, 과목명...)
    var headerRow = -1;
    var subjects = [];
    var banCol = -1, numCol = -1, nameCol = -1;
    
    for (var i = 0; i < Math.min(data.length, 10); i++) {
        var row = data[i];
        if (!row) continue;
        
        for (var j = 0; j < row.length; j++) {
            var cell = String(row[j] || '').trim();
            if (cell === '반') banCol = j;
            if (cell === '번호') numCol = j;
            if (cell === '성명' || cell === '이름') nameCol = j;
        }
        
        if (banCol >= 0 && numCol >= 0 && nameCol >= 0) {
            headerRow = i;
            // 과목 컬럼 추출 (성명 다음 ~ 총점/평균 전)
            for (var j = nameCol + 1; j < row.length; j++) {
                var cell = String(row[j] || '').trim();
                if (cell && cell !== '총점' && cell !== '평균' && cell !== '비고') {
                    var isPE = isPeArtSubject(cell);
                    subjects.push({ col: j, name: cell, isPE: isPE });
                }
            }
            break;
        }
    }
    
    if (headerRow < 0 || subjects.length === 0) return;
    
    // 학생 데이터 파싱
    for (var i = headerRow + 1; i < data.length; i++) {
        var row = data[i];
        if (!row || row.length < 4) continue;
        
        var ban = parseInt(row[banCol]) || 0;
        var num = parseInt(row[numCol]) || 0;
        if (ban !== classNum || num === 0) continue;
        
        var student = students.find(function(s) { return s.number === num; });
        if (!student) continue;
        
        // 과목별 원점수 → 환산점수
        var sum = 0;
        var count = 0;
        var rawScoreSum = 0;
        var rawScoreCount = 0;
        
        for (var j = 0; j < subjects.length; j++) {
            var col = subjects[j].col;
            var rawValue = row[col];
            var rawNum = parseFloat(rawValue);
            
            if (rawValue === '' || rawValue === null || rawValue === undefined) continue;
            if (isNaN(rawNum)) {
                // 문자(A~E, 우수/보통/미흡)인 경우
                var score = gradeToScore(rawValue);
                if (score > 0) { sum += score; count++; }
            } else if (rawNum >= 0 && rawNum <= 100) {
                // 원점수인 경우
                var gradePoint;
                if (subjects[j].isPE) {
                    gradePoint = scoreToGradePointPE(rawNum);
                } else {
                    gradePoint = scoreToGradePoint(rawNum);
                }
                sum += gradePoint;
                count++;
                rawScoreSum += rawNum;
                rawScoreCount++;
            }
        }
        
        if (!student.gradesBySemester) student.gradesBySemester = {};
        student.gradesBySemester[semester] = { sum: sum, count: count };
        
        // 원점수 평균도 저장 (동점 처리용)
        if (!student.rawScoreBySemester) student.rawScoreBySemester = {};
        if (rawScoreCount > 0) {
            student.rawScoreBySemester[semester] = {
                sum: rawScoreSum, count: rawScoreCount,
                avg: Math.round((rawScoreSum / rawScoreCount) * 1000) / 1000
            };
        }
    }
}

// ===== 수기용 내신 형식 파싱 (시트명: 교과점수1-1 등) =====
function parseLegacyGrades(workbook, classNum, students) {
    var sheetNames = workbook.SheetNames;
    
    var semesterSheets = {};
    var patterns = [
        { key: '1-1', patterns: ['1-1', '1학년1학기', '교과점수1-1'] },
        { key: '1-2', patterns: ['1-2', '1학년2학기', '교과점수1-2'] },
        { key: '2-1', patterns: ['2-1', '2학년1학기', '교과점수2-1'] },
        { key: '2-2', patterns: ['2-2', '2학년2학기', '교과점수2-2'] },
        { key: '3-1', patterns: ['3-1', '3학년1학기', '교과점수3-1'] },
        { key: '3-2', patterns: ['3-2', '3학년2학기', '교과점수3-2'] }
    ];
    
    patterns.forEach(function(p) {
        for (var i = 0; i < sheetNames.length; i++) {
            for (var j = 0; j < p.patterns.length; j++) {
                if (sheetNames[i].indexOf(p.patterns[j]) >= 0) {
                    semesterSheets[p.key] = sheetNames[i];
                    break;
                }
            }
            if (semesterSheets[p.key]) break;
        }
    });
    
    Object.keys(semesterSheets).forEach(function(semester) {
        var sheetName = semesterSheets[semester];
        var data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
        parseSemesterGrades(data, semester, classNum, students);
    });
}

function parseSemesterGrades(data, semester, classNum, students) {
    // 과목 헤더 행 찾기 (국어, 도덕, 사회, 수학, ...)
    var subjectRow = -1;
    var subjects = [];
    
    for (var i = 0; i < Math.min(data.length, 8); i++) {
        var row = data[i];
        var hasSubject = false;
        for (var j = 3; j < row.length; j++) {
            var cell = String(row[j] || '').trim();
            if (cell === '국어' || cell === '수학' || cell === '영어' || cell === '사회' || cell === '과학') {
                hasSubject = true;
                break;
            }
        }
        if (hasSubject) {
            subjectRow = i;
            // 과목명 추출
            for (var j = 3; j < row.length; j++) {
                var cell = String(row[j] || '').trim();
                if (cell && cell !== '기타') {
                    subjects.push({ col: j, name: cell });
                }
            }
            break;
        }
    }
    
    if (subjectRow < 0 || subjects.length === 0) return;
    
    // 학생별 성취도 파싱
    var dataStartRow = subjectRow + 1;
    for (var i = dataStartRow; i < data.length; i++) {
        var row = data[i];
        if (!row || row.length < 4) continue;
        
        var ban = parseInt(row[0]) || 0;
        var num = parseInt(row[1]) || 0;
        if (ban !== classNum || num === 0) continue;
        
        var student = students.find(function(s) { return s.number === num; });
        if (!student) continue;
        
        // 해당 학기 성취도 수집
        var sum = 0;
        var count = 0;
        for (var j = 0; j < subjects.length; j++) {
            var col = subjects[j].col;
            var grade = String(row[col] || '').trim();
            var score = gradeToScore(grade);
            if (score > 0) {
                sum += score;
                count++;
            }
        }
        
        if (!student.gradesBySemester) student.gradesBySemester = {};
        student.gradesBySemester[semester] = { sum: sum, count: count };
    }
}

// ===== 전교생 통합 석차백분율 산출 =====
function calculateAll() {
    allStudents = [];
    
    // 모든 반 데이터 통합
    for (var c = 1; c <= TOTAL_CLASSES; c++) {
        if (!classData[c].loaded) continue;
        var students = classData[c].students || [];
        students.forEach(function(s) { allStudents.push(s); });
    }
    
    if (allStudents.length === 0) {
        alert('업로드된 학생 데이터가 없습니다.');
        return;
    }
    
    // 자유학기제 유형 확인
    var freeType = document.getElementById('freeType').value;
    
    // 교과 성적 계산
    allStudents.forEach(function(s) {
        s.subjectScore = calcSubjectScore(s.gradesBySemester || {}, freeType);
        s.totalScore = Math.round((s.subjectScore + s.nonSubjectTotal) * 1000) / 1000;
    });
    
    // 동점 처리 후 석차 산출
    sortStudentsForRank(allStudents);
    
    // 석차 부여 (동석차 없음)
    var totalStudents = allStudents.length;
    for (var i = 0; i < allStudents.length; i++) {
        allStudents[i].rank = i + 1;
        // 석차백분율 = (개인별석차 - 0.5) / 재적자수 × 100
        allStudents[i].percentile = Math.round(((i + 1 - 0.5) / totalStudents) * 100 * 1000) / 1000;
    }
    
    resultData = allStudents;
    displayResults();
}

// ===== 동점 처리 우선순위에 따른 정렬 =====
function sortStudentsForRank(students) {
    students.sort(function(a, b) {
        // 1차: 총점 내림차순
        if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
        
        // 2차 (1단계): 비교과 총점이 높은 자
        if (a.nonSubjectTotal !== b.nonSubjectTotal) return b.nonSubjectTotal - a.nonSubjectTotal;
        
        // 3차 (2단계): 3-2, 3-1, 2-2, 2-1, 1-2(또는 1-1) 순으로 환산점수 평균 비교
        var semesters = ['3-2', '3-1', '2-2', '2-1', '1-2', '1-1'];
        for (var i = 0; i < semesters.length; i++) {
            var sem = semesters[i];
            var aAvg = getSemesterAvg(a, sem);
            var bAvg = getSemesterAvg(b, sem);
            if (aAvg !== bAvg) return bAvg - aAvg;
        }
        
        // 4차 (3단계): 과목별 원점수 평균 비교
        for (var i = 0; i < semesters.length; i++) {
            var sem = semesters[i];
            var aRaw = getRawScoreAvg(a, sem);
            var bRaw = getRawScoreAvg(b, sem);
            if (aRaw !== bRaw) return bRaw - aRaw;
        }
        
        // 5차 (4단계): 생년월일이 늦은 자 (데이터 없으면 번호순)
        if (a.classNum !== b.classNum) return a.classNum - b.classNum;
        return a.number - b.number;
    });
}

function getSemesterAvg(student, semester) {
    var g = (student.gradesBySemester || {})[semester];
    if (!g || g.count === 0) return 0;
    return Math.round((g.sum / g.count) * 1000) / 1000;
}

function getRawScoreAvg(student, semester) {
    var r = (student.rawScoreBySemester || {})[semester];
    if (!r) return 0;
    return r.avg || 0;
}

// ===== 파일 읽기 유틸리티 =====
function readExcelFile(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var workbook = XLSX.read(e.target.result, { type: 'array' });
        callback(workbook);
    };
    reader.readAsArrayBuffer(file);
}

// ===== 반별 파일 업로드 처리 =====
function handleNaesinUpload(classNum, file) {
    readExcelFile(file, function(workbook) {
        var students = parseNaesinExcel(workbook, classNum);
        classData[classNum].students = students;
        classData[classNum].naesin = true;
        
        // 수기용 내신 파일에 교과점수 시트가 포함되어 있으면 자동으로 교과도 파싱
        var hasGradeSheets = workbook.SheetNames.some(function(name) {
            return name.indexOf('교과') >= 0;
        });
        if (hasGradeSheets) {
            parseGradeExcel(workbook, classNum, students);
            classData[classNum].grades = true;
        }
        
        updateClassStatus(classNum);
    });
}

function handleGradeUpload(classNum, file) {
    readExcelFile(file, function(workbook) {
        if (!classData[classNum].students) {
            alert(classNum + '반: 수기용 내신 파일을 먼저 업로드해주세요.');
            return;
        }
        parseGradeExcel(workbook, classNum, classData[classNum].students);
        classData[classNum].grades = true;
        updateClassStatus(classNum);
    });
}

function updateClassStatus(classNum) {
    var status = document.getElementById('status-' + classNum);
    var naesin = classData[classNum].naesin;
    var grades = classData[classNum].grades;
    var studentCount = (classData[classNum].students || []).length;
    
    if (naesin && grades) {
        classData[classNum].loaded = true;
        status.innerHTML = '<span style="color:#38a169">&#10004; 완료 (' + studentCount + '명)</span>';
    } else if (naesin) {
        status.innerHTML = '<span style="color:#d69e2e">내신&#10004; / 교과 대기 (' + studentCount + '명)</span>';
    } else {
        status.innerHTML = '<span style="color:#a0aec0">미업로드</span>';
    }
    
    updateTotalStatus();
}

function updateTotalStatus() {
    var loaded = 0;
    var totalStudents = 0;
    for (var c = 1; c <= TOTAL_CLASSES; c++) {
        if (classData[c].loaded) {
            loaded++;
            totalStudents += (classData[c].students || []).length;
        }
    }
    var el = document.getElementById('totalStatus');
    el.textContent = loaded + '/' + TOTAL_CLASSES + '반 완료 (총 ' + totalStudents + '명)';
}

// ===== 결과 표시 =====
function displayResults() {
    var section = document.getElementById('resultSection');
    section.style.display = 'block';
    
    var totalStudents = resultData.length;
    
    var html = '<div class="result-summary">';
    html += '<p><strong>전교생 재적 인원:</strong> ' + totalStudents + '명</p>';
    html += '</div>';
    
    // 반별 탭
    html += '<div class="tab-container">';
    html += '<button class="tab-btn active" onclick="showClassResult(0)">전체</button>';
    for (var c = 1; c <= TOTAL_CLASSES; c++) {
        html += '<button class="tab-btn" onclick="showClassResult(' + c + ')">' + c + '반</button>';
    }
    html += '</div>';
    
    html += '<div id="resultTable"></div>';
    
    document.getElementById('resultContent').innerHTML = html;
    showClassResult(0);
    section.scrollIntoView({ behavior: 'smooth' });
}

function showClassResult(classFilter) {
    var data = classFilter === 0 ? resultData : resultData.filter(function(s) { return s.classNum === classFilter; });
    
    // 탭 활성화
    var tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(function(t, i) { t.classList.toggle('active', i === classFilter); });
    
    var html = '<table class="result-table">';
    html += '<thead><tr>';
    html += '<th>석차</th><th>석차백분율</th><th>반</th><th>번호</th><th>이름</th>';
    html += '<th>교과(240)</th><th>출결(21)</th><th>자율(12)</th><th>동아리(12)</th><th>봉사(15)</th>';
    html += '<th>비교과(60)</th><th>총점(300)</th>';
    html += '</tr></thead><tbody>';
    
    data.forEach(function(s) {
        html += '<tr>';
        html += '<td>' + s.rank + '</td>';
        html += '<td><strong>' + s.percentile.toFixed(3) + '</strong></td>';
        html += '<td>' + s.classNum + '</td>';
        html += '<td>' + s.number + '</td>';
        html += '<td>' + s.name + '</td>';
        html += '<td>' + s.subjectScore.toFixed(3) + '</td>';
        html += '<td>' + s.attend + '</td>';
        html += '<td>' + s.auto + '</td>';
        html += '<td>' + s.club + '</td>';
        html += '<td>' + s.volunteer + '</td>';
        html += '<td>' + s.nonSubjectTotal + '</td>';
        html += '<td><strong>' + s.totalScore.toFixed(3) + '</strong></td>';
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    document.getElementById('resultTable').innerHTML = html;
}

// ===== 엑셀 다운로드 =====
function downloadResult() {
    if (resultData.length === 0) {
        alert('먼저 성적을 산출해주세요.');
        return;
    }
    
    // 전체 시트
    var wsData = [
        ['2027학년도 고입전형 중학교 내신성적 산출 결과'],
        ['산출일: ' + new Date().toLocaleDateString('ko-KR')],
        [],
        ['석차', '석차백분율', '반', '번호', '이름', '교과점수(240)', '출결(21)', '자율활동(12)', '동아리활동(12)', '봉사활동(15)', '비교과소계(60)', '총점(300)']
    ];
    
    resultData.forEach(function(s) {
        wsData.push([
            s.rank, s.percentile, s.classNum, s.number, s.name,
            s.subjectScore, s.attend, s.auto, s.club, s.volunteer,
            s.nonSubjectTotal, s.totalScore
        ]);
    });
    
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
        {wch:6},{wch:12},{wch:4},{wch:5},{wch:10},
        {wch:12},{wch:8},{wch:10},{wch:11},{wch:10},
        {wch:11},{wch:10}
    ];
    XLSX.utils.book_append_sheet(wb, ws, '전체석차');
    
    // 반별 시트
    for (var c = 1; c <= TOTAL_CLASSES; c++) {
        var classStudents = resultData.filter(function(s) { return s.classNum === c; });
        if (classStudents.length === 0) continue;
        
        var csData = [
            [c + '반 내신성적 산출 결과'],
            [],
            ['전교석차', '석차백분율', '번호', '이름', '교과점수(240)', '출결(21)', '자율활동(12)', '동아리활동(12)', '봉사활동(15)', '비교과소계(60)', '총점(300)']
        ];
        classStudents.forEach(function(s) {
            csData.push([
                s.rank, s.percentile, s.number, s.name,
                s.subjectScore, s.attend, s.auto, s.club, s.volunteer,
                s.nonSubjectTotal, s.totalScore
            ]);
        });
        var csWs = XLSX.utils.aoa_to_sheet(csData);
        XLSX.utils.book_append_sheet(wb, csWs, c + '반');
    }
    
    XLSX.writeFile(wb, '2027_고입전형_내신성적_석차백분율.xlsx');
}

// ===== UI 렌더링 =====
function renderUI() {
    var app = document.getElementById('app');
    var html = '';
    
    html += '<style>';
    html += '* { margin:0; padding:0; box-sizing:border-box; }';
    html += 'body { font-family:"Malgun Gothic",sans-serif; background:#f0f4f8; padding:20px; }';
    html += '.container { max-width:1600px; margin:0 auto; }';
    html += 'h1 { text-align:center; color:#1a365d; margin-bottom:6px; font-size:24px; }';
    html += '.subtitle { text-align:center; color:#4a5568; margin-bottom:24px; font-size:13px; }';
    html += '.section { background:white; border-radius:10px; padding:24px; margin-bottom:20px; box-shadow:0 2px 12px rgba(0,0,0,0.08); }';
    html += '.section h2 { color:#2d3748; margin-bottom:16px; font-size:17px; border-bottom:2px solid #4299e1; padding-bottom:8px; }';
    html += '.info-box { background:#ebf8ff; border-left:4px solid #4299e1; padding:14px 18px; margin-bottom:16px; font-size:12px; color:#2a4365; line-height:1.8; }';
    html += '.class-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(460px, 1fr)); gap:16px; }';
    html += '.class-card { border:1px solid #e2e8f0; border-radius:8px; padding:16px; }';
    html += '.class-card h3 { color:#2b6cb0; margin-bottom:12px; font-size:15px; }';
    html += '.file-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; font-size:13px; }';
    html += '.file-row label { min-width:90px; font-weight:bold; color:#555; }';
    html += '.file-row input[type=file] { flex:1; font-size:12px; }';
    html += '.class-status { margin-top:8px; font-size:12px; }';
    html += '.btn { padding:12px 24px; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:bold; }';
    html += '.btn-primary { background:#4299e1; color:white; }';
    html += '.btn-primary:hover { background:#3182ce; }';
    html += '.btn-success { background:#38a169; color:white; }';
    html += '.btn-success:hover { background:#2f855a; }';
    html += '.btn-group { display:flex; gap:12px; justify-content:center; margin:20px 0; flex-wrap:wrap; align-items:center; }';
    html += '.total-status { text-align:center; font-size:14px; color:#4a5568; margin-bottom:12px; font-weight:bold; }';
    html += '.result-table { width:100%; border-collapse:collapse; margin-top:12px; font-size:12px; }';
    html += '.result-table th,.result-table td { border:1px solid #e2e8f0; padding:6px 8px; text-align:center; }';
    html += '.result-table th { background:#4299e1; color:white; font-size:11px; position:sticky; top:0; }';
    html += '.result-table tr:nth-child(even) { background:#f7fafc; }';
    html += '.result-table tr:hover { background:#ebf8ff; }';
    html += '.tab-container { display:flex; gap:4px; margin-bottom:12px; flex-wrap:wrap; }';
    html += '.tab-btn { padding:8px 16px; border:1px solid #e2e8f0; background:#f7fafc; border-radius:6px; cursor:pointer; font-size:12px; }';
    html += '.tab-btn.active { background:#4299e1; color:white; border-color:#4299e1; }';
    html += '.result-summary { margin-bottom:16px; font-size:14px; color:#2d3748; }';
    html += 'select { padding:8px 12px; border:1px solid #e2e8f0; border-radius:4px; font-size:13px; }';
    html += '</style>';
    
    html += '<div class="container">';
    html += '<h1>&#127891; 2027학년도 고입전형 중학교 내신성적 산출 시스템</h1>';
    html += '<p class="subtitle">부산광역시교육청 기준 | 교과 240점(80%) + 비교과 60점(20%) = 총점 300점 | 6학급 통합 석차백분율 산출</p>';
    
    // 안내
    html += '<div class="section"><div class="info-box">';
    html += '<strong>[산출 기준]</strong><br>';
    html += '&bull; <strong>교과 성적 (240점, 80%)</strong>: NEIS 원점수를 성취도로 자동 변환<br>';
    html += '&nbsp;&nbsp;&nbsp;&nbsp;- 일반교과: 90↑=A(5점), 80↑=B(4점), 70↑=C(3점), 60↑=D(2점), 60↓=E(1점)<br>';
    html += '&nbsp;&nbsp;&nbsp;&nbsp;- 체육/음악/미술: 80↑=A(5점), 60↑=B(4점), 60↓=C(3점) &larr; 자동 구분 적용<br>';
    html += '&bull; <strong>비교과 성적 (60점, 20%)</strong>: 출결(21점) + 자율활동(12점) + 동아리활동(12점) + 봉사활동(15점)<br>';
    html += '&bull; <strong>석차백분율</strong> = (개인별석차 - 0.5) / 3학년 재적자수 &times; 100 (소수 셋째자리까지)<br>';
    html += '&bull; <strong>동점 처리</strong>: ①비교과 총점 ②학기별 환산점수 평균 ③과목별 원점수 평균 ④생년월일 순<br>';
    html += '&bull; <strong>자유학기제 유형</strong>: 1학년 1개학기 = 1학년10%+2학년40%+3학년50% / 1학년 2개학기 = 2학년40%+3학년60%';
    html += '</div></div>';
    
    // 파일 업로드
    html += '<div class="section">';
    html += '<h2>&#128193; 반별 파일 업로드 (수기용 내신 + NEIS 교과 성적)</h2>';
    html += '<p style="font-size:12px;color:#718096;margin-bottom:16px;">① 수기용 내신 엑셀(비교과 점수) 업로드 → ② NEIS 성적 파일(교과 원점수) 업로드. NEIS 파일의 원점수는 자동으로 성취도(A~E)로 변환됩니다.</p>';
    html += '<div class="class-grid">';
    
    for (var c = 1; c <= TOTAL_CLASSES; c++) {
        html += '<div class="class-card">';
        html += '<h3>' + c + '반</h3>';
        html += '<div class="file-row"><label>수기용 내신:</label>';
        html += '<input type="file" accept=".xlsx,.xls" onchange="handleNaesinUpload(' + c + ', this.files[0])"></div>';
        html += '<div class="file-row"><label>NEIS 성적:</label>';
        html += '<input type="file" accept=".xlsx,.xls" onchange="handleGradeUpload(' + c + ', this.files[0])"></div>';
        html += '<div class="class-status" id="status-' + c + '"><span style="color:#a0aec0">미업로드</span></div>';
        html += '</div>';
    }
    
    html += '</div></div>';
    
    // 설정 및 산출 버튼
    html += '<div class="total-status" id="totalStatus">0/' + TOTAL_CLASSES + '반 완료 (총 0명)</div>';
    html += '<div class="btn-group">';
    html += '<label style="font-size:13px;font-weight:bold;">자유학기제 유형:</label>';
    html += '<select id="freeType">';
    html += '<option value="1semester">1학년 1개 학기 자유학기제 (1학년10%+2학년40%+3학년50%)</option>';
    html += '<option value="2semester">1학년 2개 학기 자유학기제 (2학년40%+3학년60%)</option>';
    html += '</select>';
    html += '<button class="btn btn-primary" onclick="calculateAll()">&#128202; 석차백분율 산출</button>';
    html += '<button class="btn btn-success" onclick="downloadResult()">&#128229; 엑셀 다운로드</button>';
    html += '</div>';
    
    // 결과 섹션
    html += '<div class="section" id="resultSection" style="display:none;">';
    html += '<h2>&#128203; 내신성적 산출 결과 (석차백분율)</h2>';
    html += '<div id="resultContent"></div>';
    html += '</div>';
    
    html += '</div>';
    
    app.innerHTML = html;
}

// 초기화 - 인증 확인 후 UI 렌더링
document.addEventListener('DOMContentLoaded', function() {
    // auth.js에서 세션 확인 후 app이 표시되면 UI 렌더링
    // MutationObserver로 app 표시 감지
    var app = document.getElementById('app');
    
    function tryRender() {
        if (app.style.display !== 'none' && app.style.display !== '') {
            renderUI();
        }
    }
    
    // 초기 체크
    setTimeout(tryRender, 100);
    
    // app 표시 변경 감시
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'style') {
                tryRender();
            }
        });
    });
    observer.observe(app, { attributes: true, attributeFilter: ['style'] });
});
