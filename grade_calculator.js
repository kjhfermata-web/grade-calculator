/**
 * 2027학년도 부산광역시 고입전형 중학교 내신성적 산출 프로그램
 * - 비교과: 각 반 담임이 수기용 내신 엑셀 업로드 (6개 반)
 * - 교과: 전교생 통합 파일 2개 업로드 (1-2학년 파일 + 3학년 파일)
 * - 전교생 통합 석차백분율 산출
 */

const TOTAL_CLASSES = 6;
const GRADE_SCORES = { A: 5, B: 4, C: 3, D: 2, E: 1 };

// 전역 데이터 저장소
let classData = {};
for (let i = 1; i <= TOTAL_CLASSES; i++) {
    classData[i] = { naesin: false, students: null };
}
let gradeData12 = null;  // 1-2학년 교과 성적 (전교생)
let gradeData3 = null;   // 3학년 교과 성적 (전교생)
let allStudents = [];
let resultData = [];

// ===== 점수 변환 함수 =====
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

function scoreToGradePoint(rawScore) {
    if (rawScore >= 90) return 5;
    if (rawScore >= 80) return 4;
    if (rawScore >= 70) return 3;
    if (rawScore >= 60) return 2;
    return 1;
}

var PE_ART_SUBJECTS = ['체육', '음악', '미술'];
function isPeArtSubject(name) {
    for (var i = 0; i < PE_ART_SUBJECTS.length; i++) {
        if (name.indexOf(PE_ART_SUBJECTS[i]) >= 0) return true;
    }
    return false;
}
function scoreToGradePointPE(rawScore) {
    if (rawScore >= 80) return 5;
    if (rawScore >= 60) return 4;
    return 3;
}

function gradeToScore(grade) {
    if (!grade && grade !== 0) return 0;
    var g = String(grade).trim().toUpperCase();
    if (GRADE_SCORES[g] !== undefined) return GRADE_SCORES[g];
    if (g === '우수' || g.indexOf('우') >= 0) return 5;
    if (g === '보통' || g.indexOf('보') >= 0) return 4;
    if (g === '미흡' || g.indexOf('미') >= 0) return 3;
    var num = parseFloat(grade);
    if (!isNaN(num) && num >= 0 && num <= 100) return scoreToGradePoint(num);
    return 0;
}

// ===== 누락 학기 대체 처리 (PDF 부록1 p.21 <표 2> 완전 반영) =====
function applySubstitution(studentGrades) {
    var result = {};
    var semesters = ['1-1','1-2','2-1','2-2','3-1','3-2'];
    semesters.forEach(function(s) {
        if (studentGrades[s] && studentGrades[s].count > 0) result[s] = studentGrades[s];
    });
    
    // 있는 학년 확인
    var has1 = (result['1-1'] && result['1-1'].count > 0) || (result['1-2'] && result['1-2'].count > 0);
    var has2 = (result['2-1'] && result['2-1'].count > 0) || (result['2-2'] && result['2-2'].count > 0);
    var has3 = (result['3-1'] && result['3-1'].count > 0) || (result['3-2'] && result['3-2'].count > 0);
    
    // 학년 간 대체 (PDF 규정)
    if (!has1 && !has2 && has3) {
        // 1,2학년 모두 없음 → 3학년 1학기를 1,2학년 1학기에, 3학년 2학기를 1,2학년 2학기에
        if (result['3-1']) { result['1-1'] = result['3-1']; result['2-1'] = result['3-1']; }
        if (result['3-2']) { result['1-2'] = result['3-2']; result['2-2'] = result['3-2']; }
    } else if (!has1 && has2) {
        // 1학년 없음 → 2학년 1학기를 1학년 1학기에, 2학년 2학기를 1학년 2학기에
        if (result['2-1']) result['1-1'] = result['2-1'];
        if (result['2-2']) result['1-2'] = result['2-2'];
    } else if (!has2 && has3) {
        // 2학년 없음 → 3학년 1학기를 2학년 1학기에, 3학년 2학기를 2학년 2학기에
        if (result['3-1']) result['2-1'] = result['3-1'];
        if (result['3-2']) result['2-2'] = result['3-2'];
    } else if (!has3 && has2) {
        // 3학년 없음 → 2학년 1학기를 3학년 1학기에, 2학년 2학기를 3학년 2학기에
        if (result['2-1']) result['3-1'] = result['2-1'];
        if (result['2-2']) result['3-2'] = result['2-2'];
    } else if (!has1 && !has3 && has2) {
        // 1,3학년 없음 → 2학년으로 대체
        if (result['2-1']) { result['1-1'] = result['2-1']; result['3-1'] = result['2-1']; }
        if (result['2-2']) { result['1-2'] = result['2-2']; result['3-2'] = result['2-2']; }
    } else if (!has2 && !has3 && has1) {
        // 2,3학년 없음 → 1학년으로 대체
        if (result['1-1']) { result['2-1'] = result['1-1']; result['3-1'] = result['1-1']; }
        if (result['1-2']) { result['2-2'] = result['1-2']; result['3-2'] = result['1-2']; }
    }
    
    // 동일 학년 내 학기 간 대체 (2학기 없으면 1학기로, 1학기 없으면 2학기로)
    [1, 2, 3].forEach(function(g) {
        var sem1 = g + '-1', sem2 = g + '-2';
        var h1 = result[sem1] && result[sem1].count > 0;
        var h2 = result[sem2] && result[sem2].count > 0;
        if (!h1 && h2) result[sem1] = result[sem2];
        if (!h2 && h1) result[sem2] = result[sem1];
    });
    
    return result;
}

// ===== 교과 성적 산출 =====
function calcSubjectScore(studentGrades, freeType) {
    var baseScore = 96;
    var grades = applySubstitution(studentGrades);
    
    if (freeType === '2semester') {
        var s21 = grades['2-1'] || {sum:0,count:0};
        var s22 = grades['2-2'] || {sum:0,count:0};
        var s31 = grades['3-1'] || {sum:0,count:0};
        var s32 = grades['3-2'] || {sum:0,count:0};
        var v21 = s21.count > 0 ? s21.sum/s21.count : 0;
        var v22 = s22.count > 0 ? s22.sum/s22.count : 0;
        var v31 = s31.count > 0 ? s31.sum/s31.count : 0;
        var v32 = s32.count > 0 ? s32.sum/s32.count : 0;
        return Math.round((baseScore + 5.76*(v21+v22) + 8.64*(v31+v32))*1000)/1000;
    } else {
        var s1j = grades['1-2'] || grades['1-1'] || {sum:0,count:0};
        var s21b = grades['2-1'] || {sum:0,count:0};
        var s22b = grades['2-2'] || {sum:0,count:0};
        var s31b = grades['3-1'] || {sum:0,count:0};
        var s32b = grades['3-2'] || {sum:0,count:0};
        var v1 = s1j.count > 0 ? s1j.sum/s1j.count : 0;
        var v21b = s21b.count > 0 ? s21b.sum/s21b.count : 0;
        var v22b = s22b.count > 0 ? s22b.sum/s22b.count : 0;
        var v31b = s31b.count > 0 ? s31b.sum/s31b.count : 0;
        var v32b = s32b.count > 0 ? s32b.sum/s32b.count : 0;
        return Math.round((baseScore + 2.88*v1 + 5.76*(v21b+v22b) + 7.2*(v31b+v32b))*1000)/1000;
    }
}

// ===== 비교과: 수기용 내신 엑셀 파싱 =====
function parseNaesinExcel(workbook, classNum) {
    var students = [];
    var sheetNames = workbook.SheetNames;
    var confirmSheet = null;
    for (var i = 0; i < sheetNames.length; i++) {
        if (sheetNames[i].indexOf('개인별') >= 0) { confirmSheet = sheetNames[i]; break; }
    }
    if (confirmSheet) {
        var data = XLSX.utils.sheet_to_json(workbook.Sheets[confirmSheet], {header:1, defval:''});
        students = parseConfirmSheet(data, classNum);
    }
    return students;
}

function parseConfirmSheet(data, classNum) {
    var students = [];
    var headerRow = -1;
    var colMap = {attend:-1, auto:-1, club:-1, vol:-1};
    for (var i = 0; i < Math.min(data.length, 10); i++) {
        var row = data[i];
        if (!row) continue;
        var rowStr = row.join(' ');
        if (rowStr.indexOf('출결') >= 0 && (rowStr.indexOf('자율') >= 0 || rowStr.indexOf('봉사') >= 0)) {
            headerRow = i;
            for (var j = 0; j < row.length; j++) {
                var cell = String(row[j]||'').trim();
                if (cell.indexOf('출결') >= 0) colMap.attend = j;
                else if (cell.indexOf('자율') >= 0) colMap.auto = j;
                else if (cell.indexOf('동아리') >= 0) colMap.club = j;
                else if (cell.indexOf('봉사') >= 0) colMap.vol = j;
            }
            break;
        }
    }
    if (colMap.attend < 0) colMap.attend = 3;
    if (colMap.auto < 0) colMap.auto = 4;
    if (colMap.club < 0) colMap.club = 5;
    if (colMap.vol < 0) colMap.vol = 6;

    var startRow = headerRow >= 0 ? headerRow + 1 : 3;
    for (var i = startRow; i < data.length; i++) {
        var row = data[i];
        if (!row || row.length < 7) continue;
        var ban = parseInt(row[0]) || 0;
        var num = parseInt(row[1]) || 0;
        var name = String(row[2]||'').trim();
        if (ban !== classNum || num === 0) continue;
        if (!name || name === '0') name = num + '번';

        students.push({
            classNum: classNum, number: num, name: name,
            attend: parseInt(row[colMap.attend])||0,
            auto: parseInt(row[colMap.auto])||0,
            club: parseInt(row[colMap.club])||0,
            volunteer: parseInt(row[colMap.vol])||0,
            nonSubjectTotal: (parseInt(row[colMap.attend])||0)+(parseInt(row[colMap.auto])||0)+(parseInt(row[colMap.club])||0)+(parseInt(row[colMap.vol])||0),
            subjectScore: 0, totalScore: 0, rank: 0, percentile: 0,
            gradesBySemester: {}, rawScoreBySemester: {}
        });
    }
    return students;
}

// ===== 교과: 1-2학년 통합 파일 파싱 =====
// 구조: 반코드, 반명, 번호, 성명, 성별, 학년, 학기, 과목점수들...
function parseGrade12File(workbook) {
    var data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header:1, defval:''});
    var result = {}; // key: "반-번호", value: { gradesBySemester, rawScoreBySemester }
    
    // 헤더 분석: 1행은 교과군 그룹, 2행부터 학년/학기별 실제 과목명
    // 실제 구조: 행마다 반코드,반명,번호,성명,성별,학년,학기,과목1,과목2,...
    // 학년+학기 조합별로 과목명이 다름 → 2~6행에 학년/학기별 과목명 배열이 있음
    
    // 과목명 행 파싱 (학년+학기 → 과목명 배열)
    var subjectMap = {}; // key: "학년-학기", value: [{col, name, isPE}]
    var dataStartRow = -1;
    
    // 과목명 정의 행 찾기 (학년/학기 값이 있고 과목명이 나열된 행)
    for (var i = 0; i < Math.min(data.length, 15); i++) {
        var row = data[i];
        if (!row) continue;
        var grade = parseInt(row[5]) || 0;
        var semester = parseInt(row[6]) || 0;
        if (grade >= 1 && grade <= 3 && semester >= 1 && semester <= 2) {
            // 이 행이 과목명 정의인지, 학생 데이터인지 구분
            // 학생 데이터는 반코드(01,02...) 또는 번호가 있음
            var hasStudentData = (parseInt(row[2]) > 0 && String(row[3]||'').length >= 2);
            if (!hasStudentData) {
                // 과목명 정의 행
                var subjects = [];
                for (var j = 7; j < row.length; j++) {
                    var cell = String(row[j]||'').trim();
                    if (cell) subjects.push({col:j, name:cell, isPE:isPeArtSubject(cell)});
                }
                if (subjects.length > 0) {
                    subjectMap[grade + '-' + semester] = subjects;
                }
            } else {
                if (dataStartRow < 0) dataStartRow = i;
            }
        } else if (dataStartRow < 0 && String(row[0]||'').match(/^\d{2}$/)) {
            dataStartRow = i;
        }
    }
    
    if (dataStartRow < 0) {
        // 과목명 정의 행이 끝난 다음 행부터 데이터
        for (var i = 0; i < data.length; i++) {
            if (String(data[i][0]||'').match(/^\d{2}$/)) { dataStartRow = i; break; }
        }
    }
    
    if (dataStartRow < 0) return result;
    
    // 학생 데이터 파싱
    for (var i = dataStartRow; i < data.length; i++) {
        var row = data[i];
        if (!row || row.length < 8) continue;
        
        var banCode = String(row[0]||'').trim();
        var classNum = parseInt(row[1]) || parseInt(banCode) || 0;
        var num = parseInt(row[2]) || 0;
        var name = String(row[3]||'').trim();
        var grade = parseInt(row[5]) || 0;
        var semester = parseInt(row[6]) || 0;
        
        if (num === 0 || grade === 0 || semester === 0) continue;
        if (grade > 3 || semester > 2) continue;
        
        var key = classNum + '-' + num;
        var semKey = grade + '-' + semester;
        
        if (!result[key]) result[key] = { classNum:classNum, number:num, name:name, gradesBySemester:{}, rawScoreBySemester:{} };
        
        // 해당 학년-학기의 과목명 배열 가져오기
        var subjects = subjectMap[semKey];
        if (!subjects || subjects.length === 0) {
            // 과목명 배열이 없으면 7번 컬럼부터 모든 숫자를 과목으로 처리
            subjects = [];
            for (var j = 7; j < row.length; j++) {
                var val = parseFloat(row[j]);
                if (!isNaN(val) && val > 0 && val <= 100) {
                    subjects.push({col:j, name:'과목'+(j-6), isPE:false});
                }
            }
        }
        
        var sum = 0, count = 0, rawSum = 0, rawCount = 0;
        for (var j = 0; j < subjects.length; j++) {
            var col = subjects[j].col;
            var rawVal = parseFloat(row[col]);
            if (isNaN(rawVal) || rawVal <= 0) continue;
            if (rawVal > 100) continue;
            
            var gp = subjects[j].isPE ? scoreToGradePointPE(rawVal) : scoreToGradePoint(rawVal);
            sum += gp; count++;
            rawSum += rawVal; rawCount++;
        }
        
        if (count > 0) {
            result[key].gradesBySemester[semKey] = {sum:sum, count:count};
            result[key].rawScoreBySemester[semKey] = {sum:rawSum, count:rawCount, avg:Math.round(rawSum/rawCount*1000)/1000};
        }
    }
    return result;
}

// ===== 교과: 3학년 파일 파싱 =====
// 구조: 반, (빈칸), 번호, 성명, 과목들..., 총점, 평균
function parseGrade3File(workbook) {
    var result = {}; // key: "반-번호"
    var sheetNames = workbook.SheetNames;
    
    for (var si = 0; si < sheetNames.length; si++) {
        var data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[si]], {header:1, defval:''});
        
        // 헤더 행 찾기 (반, 번호, 성명 + 과목명)
        var headerRow = -1;
        var banCol = -1, numCol = -1, nameCol = -1;
        var subjects = [];
        
        for (var i = 0; i < Math.min(data.length, 15); i++) {
            var row = data[i];
            if (!row) continue;
            var foundBan = false, foundNum = false, foundName = false;
            for (var j = 0; j < Math.min(row.length, 10); j++) {
                var cell = String(row[j]||'').trim();
                if (cell === '반') { banCol = j; foundBan = true; }
                if (cell === '번호') { numCol = j; foundNum = true; }
                if (cell === '성명' || cell === '이름') { nameCol = j; foundName = true; }
            }
            if (foundBan && foundNum && foundName) {
                headerRow = i;
                // 과목 추출 (성명 다음 ~ 총점/평균 전)
                for (var j = nameCol + 1; j < row.length; j++) {
                    var cell = String(row[j]||'').trim();
                    if (cell && cell !== '총점' && cell !== '평균' && cell !== '비고' && cell !== '') {
                        subjects.push({col:j, name:cell, isPE:isPeArtSubject(cell)});
                    }
                }
                break;
            }
        }
        
        if (headerRow < 0 || subjects.length === 0) continue;
        
        // 3학년 1학기인지 2학기인지 판별
        var semester = '3-1';
        for (var i = 0; i < Math.min(data.length, 10); i++) {
            var rowStr = (data[i]||[]).join(' ');
            if (rowStr.indexOf('2학기') >= 0) { semester = '3-2'; break; }
        }
        
        // 학생 데이터 파싱
        for (var i = headerRow + 1; i < data.length; i++) {
            var row = data[i];
            if (!row) continue;
            
            var ban = parseInt(row[banCol]) || 0;
            var num = parseInt(row[numCol]) || 0;
            var name = String(row[nameCol]||'').trim();
            
            if (ban === 0 || num === 0 || !name) continue;
            if (name === '총점' || name === '평균') continue;
            
            var key = ban + '-' + num;
            if (!result[key]) result[key] = { classNum:ban, number:num, name:name, gradesBySemester:{}, rawScoreBySemester:{} };
            
            var sum = 0, count = 0, rawSum = 0, rawCount = 0;
            for (var j = 0; j < subjects.length; j++) {
                var col = subjects[j].col;
                var rawVal = parseFloat(row[col]);
                if (isNaN(rawVal) || rawVal < 0) continue;
                if (rawVal > 100) continue;
                
                var gp = subjects[j].isPE ? scoreToGradePointPE(rawVal) : scoreToGradePoint(rawVal);
                sum += gp; count++;
                rawSum += rawVal; rawCount++;
            }
            
            if (count > 0) {
                result[key].gradesBySemester[semester] = {sum:sum, count:count};
                result[key].rawScoreBySemester[semester] = {sum:rawSum, count:rawCount, avg:Math.round(rawSum/rawCount*1000)/1000};
            }
        }
    }
    return result;
}

// ===== 파일 읽기 =====
function readExcelFile(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var workbook = XLSX.read(e.target.result, {type:'array'});
        callback(workbook);
    };
    reader.readAsArrayBuffer(file);
}

// ===== 업로드 핸들러 =====
function handleNaesinUpload(classNum, file) {
    readExcelFile(file, function(workbook) {
        var students = parseNaesinExcel(workbook, classNum);
        classData[classNum].students = students;
        classData[classNum].naesin = true;
        updateStatus();
    });
}

function handleGrade12Upload(file) {
    readExcelFile(file, function(workbook) {
        gradeData12 = parseGrade12File(workbook);
        var count = Object.keys(gradeData12).length;
        document.getElementById('grade12Status').innerHTML = '<span style="color:#38a169">&#10004; ' + count + '명 로드</span>';
        updateStatus();
    });
}

function handleGrade3Upload(file) {
    readExcelFile(file, function(workbook) {
        gradeData3 = parseGrade3File(workbook);
        var count = Object.keys(gradeData3).length;
        document.getElementById('grade3Status').innerHTML = '<span style="color:#38a169">&#10004; ' + count + '명 로드</span>';
        updateStatus();
    });
}

function updateStatus() {
    var loadedClasses = 0, totalStudents = 0;
    for (var c = 1; c <= TOTAL_CLASSES; c++) {
        var el = document.getElementById('naesin-status-' + c);
        if (classData[c].naesin) {
            loadedClasses++;
            var cnt = (classData[c].students||[]).length;
            totalStudents += cnt;
            el.innerHTML = '<span style="color:#38a169">&#10004; ' + cnt + '명</span>';
        } else {
            el.innerHTML = '<span style="color:#a0aec0">미업로드</span>';
        }
    }
    document.getElementById('totalStatus').textContent = 
        '비교과 ' + loadedClasses + '/' + TOTAL_CLASSES + '반 (' + totalStudents + '명)' +
        ' | 교과 1-2학년: ' + (gradeData12 ? Object.keys(gradeData12).length + '명' : '미업로드') +
        ' | 3학년: ' + (gradeData3 ? Object.keys(gradeData3).length + '명' : '미업로드');
}

// ===== 전교생 통합 석차백분율 산출 =====
function calculateAll() {
    allStudents = [];
    
    // 비교과 데이터 통합
    for (var c = 1; c <= TOTAL_CLASSES; c++) {
        if (!classData[c].naesin) continue;
        (classData[c].students||[]).forEach(function(s) { allStudents.push(s); });
    }
    
    if (allStudents.length === 0) {
        alert('비교과 데이터가 업로드되지 않았습니다.');
        return;
    }
    
    // 교과 데이터 매칭
    allStudents.forEach(function(s) {
        var key = s.classNum + '-' + s.number;
        s.gradesBySemester = {};
        s.rawScoreBySemester = {};
        
        // 1-2학년 교과
        if (gradeData12 && gradeData12[key]) {
            var g12 = gradeData12[key];
            Object.keys(g12.gradesBySemester||{}).forEach(function(sem) {
                s.gradesBySemester[sem] = g12.gradesBySemester[sem];
            });
            Object.keys(g12.rawScoreBySemester||{}).forEach(function(sem) {
                s.rawScoreBySemester[sem] = g12.rawScoreBySemester[sem];
            });
        }
        
        // 3학년 교과
        if (gradeData3 && gradeData3[key]) {
            var g3 = gradeData3[key];
            Object.keys(g3.gradesBySemester||{}).forEach(function(sem) {
                s.gradesBySemester[sem] = g3.gradesBySemester[sem];
            });
            Object.keys(g3.rawScoreBySemester||{}).forEach(function(sem) {
                s.rawScoreBySemester[sem] = g3.rawScoreBySemester[sem];
            });
        }
    });
    
    // 교과 성적 계산
    var freeType = document.getElementById('freeType').value;
    allStudents.forEach(function(s) {
        s.subjectScore = calcSubjectScore(s.gradesBySemester, freeType);
        s.totalScore = Math.round((s.subjectScore + s.nonSubjectTotal) * 1000) / 1000;
    });
    
    // 정렬 및 석차 부여
    sortStudentsForRank(allStudents);
    var total = allStudents.length;
    for (var i = 0; i < total; i++) {
        allStudents[i].rank = i + 1;
        allStudents[i].percentile = Math.round(((i+1-0.5)/total)*100*1000)/1000;
    }
    
    resultData = allStudents;
    displayResults();
}

function sortStudentsForRank(students) {
    students.sort(function(a, b) {
        if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
        if (a.nonSubjectTotal !== b.nonSubjectTotal) return b.nonSubjectTotal - a.nonSubjectTotal;
        var sems = ['3-2','3-1','2-2','2-1','1-2','1-1'];
        for (var i = 0; i < sems.length; i++) {
            var aAvg = getAvg(a.gradesBySemester, sems[i]);
            var bAvg = getAvg(b.gradesBySemester, sems[i]);
            if (aAvg !== bAvg) return bAvg - aAvg;
        }
        for (var i = 0; i < sems.length; i++) {
            var aRaw = getRawAvg(a.rawScoreBySemester, sems[i]);
            var bRaw = getRawAvg(b.rawScoreBySemester, sems[i]);
            if (aRaw !== bRaw) return bRaw - aRaw;
        }
        if (a.classNum !== b.classNum) return a.classNum - b.classNum;
        return a.number - b.number;
    });
}
function getAvg(grades, sem) {
    var g = (grades||{})[sem];
    return (g && g.count > 0) ? Math.round(g.sum/g.count*1000)/1000 : 0;
}
function getRawAvg(rawScores, sem) {
    var r = (rawScores||{})[sem];
    return r ? (r.avg||0) : 0;
}

// ===== 결과 표시 =====
function displayResults() {
    var section = document.getElementById('resultSection');
    section.style.display = 'block';
    var html = '<p class="result-summary"><strong>전교생 재적:</strong> ' + resultData.length + '명</p>';
    html += '<div class="tab-container">';
    html += '<button class="tab-btn active" onclick="showTab(0)">전체</button>';
    for (var c = 1; c <= TOTAL_CLASSES; c++) html += '<button class="tab-btn" onclick="showTab('+c+')">'+c+'반</button>';
    html += '</div><div id="resultTable"></div>';
    document.getElementById('resultContent').innerHTML = html;
    showTab(0);
    section.scrollIntoView({behavior:'smooth'});
}

function showTab(cls) {
    var data = cls === 0 ? resultData : resultData.filter(function(s){return s.classNum===cls;});
    document.querySelectorAll('.tab-btn').forEach(function(t,i){t.classList.toggle('active',i===cls);});
    var html = '<table class="result-table"><thead><tr>';
    html += '<th>석차</th><th>백분율</th><th>반</th><th>번호</th><th>이름</th>';
    html += '<th>교과(240)</th><th>출결(21)</th><th>자율(12)</th><th>동아리(12)</th><th>봉사(15)</th>';
    html += '<th>비교과(60)</th><th>총점(300)</th></tr></thead><tbody>';
    data.forEach(function(s) {
        html += '<tr><td>'+s.rank+'</td><td><b>'+s.percentile.toFixed(3)+'</b></td>';
        html += '<td>'+s.classNum+'</td><td>'+s.number+'</td><td>'+s.name+'</td>';
        html += '<td>'+s.subjectScore.toFixed(3)+'</td><td>'+s.attend+'</td><td>'+s.auto+'</td>';
        html += '<td>'+s.club+'</td><td>'+s.volunteer+'</td><td>'+s.nonSubjectTotal+'</td>';
        html += '<td><b>'+s.totalScore.toFixed(3)+'</b></td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('resultTable').innerHTML = html;
}

// ===== 엑셀 다운로드 =====
function downloadResult() {
    if (resultData.length === 0) { alert('먼저 산출해주세요.'); return; }
    var wsData = [['2027학년도 고입전형 내신성적 산출 결과'],['산출일: '+new Date().toLocaleDateString('ko-KR')],[],
        ['석차','석차백분율','반','번호','이름','교과(240)','출결(21)','자율(12)','동아리(12)','봉사(15)','비교과(60)','총점(300)']];
    resultData.forEach(function(s) {
        wsData.push([s.rank,s.percentile,s.classNum,s.number,s.name,s.subjectScore,s.attend,s.auto,s.club,s.volunteer,s.nonSubjectTotal,s.totalScore]);
    });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), '전체석차');
    for (var c = 1; c <= TOTAL_CLASSES; c++) {
        var cs = resultData.filter(function(s){return s.classNum===c;});
        if (cs.length === 0) continue;
        var cd = [[c+'반 결과'],[],['석차','백분율','번호','이름','교과','출결','자율','동아리','봉사','비교과','총점']];
        cs.forEach(function(s){cd.push([s.rank,s.percentile,s.number,s.name,s.subjectScore,s.attend,s.auto,s.club,s.volunteer,s.nonSubjectTotal,s.totalScore]);});
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cd), c+'반');
    }
    XLSX.writeFile(wb, '2027_내신성적_석차백분율.xlsx');
}

// ===== UI 렌더링 =====
function renderUI() {
    var app = document.getElementById('app');
    var html = '<style>';
    html += '*{margin:0;padding:0;box-sizing:border-box}';
    html += 'body{font-family:"Malgun Gothic",sans-serif;background:#f0f4f8;padding:20px}';
    html += '.container{max-width:1400px;margin:0 auto}';
    html += 'h1{text-align:center;color:#1a365d;margin-bottom:6px;font-size:22px}';
    html += '.subtitle{text-align:center;color:#4a5568;margin-bottom:20px;font-size:13px}';
    html += '.section{background:white;border-radius:10px;padding:24px;margin-bottom:20px;box-shadow:0 2px 10px rgba(0,0,0,0.08)}';
    html += '.section h2{color:#2d3748;margin-bottom:14px;font-size:16px;border-bottom:2px solid #4299e1;padding-bottom:8px}';
    html += '.info-box{background:#ebf8ff;border-left:4px solid #4299e1;padding:12px 16px;margin-bottom:16px;font-size:12px;color:#2a4365;line-height:1.8}';
    html += '.upload-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:12px}';
    html += '.upload-card{border:1px solid #e2e8f0;border-radius:8px;padding:12px;display:flex;align-items:center;gap:10px}';
    html += '.upload-card label{min-width:50px;font-weight:bold;color:#2b6cb0;font-size:14px}';
    html += '.upload-card input[type=file]{flex:1;font-size:11px}';
    html += '.upload-card .st{font-size:11px;min-width:60px;text-align:right}';
    html += '.grade-section{display:flex;gap:20px;flex-wrap:wrap;margin-top:12px}';
    html += '.grade-box{flex:1;min-width:300px;border:1px solid #e2e8f0;border-radius:8px;padding:16px}';
    html += '.grade-box h3{font-size:14px;color:#2b6cb0;margin-bottom:10px}';
    html += '.grade-box input[type=file]{font-size:12px;margin-bottom:8px}';
    html += '.btn{padding:12px 24px;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:bold}';
    html += '.btn-primary{background:#4299e1;color:white}.btn-primary:hover{background:#3182ce}';
    html += '.btn-success{background:#38a169;color:white}.btn-success:hover{background:#2f855a}';
    html += '.btn-group{display:flex;gap:12px;justify-content:center;margin:20px 0;flex-wrap:wrap;align-items:center}';
    html += '.total-status{text-align:center;font-size:13px;color:#4a5568;margin-bottom:12px;font-weight:bold}';
    html += '.result-table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}';
    html += '.result-table th,.result-table td{border:1px solid #e2e8f0;padding:5px 7px;text-align:center}';
    html += '.result-table th{background:#4299e1;color:white;font-size:11px;position:sticky;top:0}';
    html += '.result-table tr:nth-child(even){background:#f7fafc}';
    html += '.result-table tr:hover{background:#ebf8ff}';
    html += '.tab-container{display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap}';
    html += '.tab-btn{padding:7px 14px;border:1px solid #e2e8f0;background:#f7fafc;border-radius:6px;cursor:pointer;font-size:12px}';
    html += '.tab-btn.active{background:#4299e1;color:white;border-color:#4299e1}';
    html += '.result-summary{margin-bottom:12px;font-size:14px}';
    html += 'select{padding:8px 12px;border:1px solid #e2e8f0;border-radius:4px;font-size:13px}';
    html += '</style>';

    html += '<div class="container">';
    html += '<h1>&#127891; 2027학년도 고입전형 내신성적 산출</h1>';
    html += '<p class="subtitle">교과 240점(80%) + 비교과 60점(20%) = 총점 300점 | 전교생 석차백분율 산출</p>';

    // 안내
    html += '<div class="section"><div class="info-box">';
    html += '<strong>[산출 기준]</strong><br>';
    html += '&bull; <strong>교과 (240점)</strong>: NEIS 원점수를 성취도로 자동 변환<br>';
    html += '&nbsp;&nbsp;&nbsp;&nbsp;- 일반교과: 90↑=A(5), 80↑=B(4), 70↑=C(3), 60↑=D(2), 60↓=E(1)<br>';
    html += '&nbsp;&nbsp;&nbsp;&nbsp;- 체육/음악/미술: 80↑=A(5), 60↑=B(4), 60↓=C(3) &larr; 자동 구분<br>';
    html += '&bull; <strong>비교과 (60점)</strong>: 출결(21) + 자율(12) + 동아리(12) + 봉사(15)<br>';
    html += '&bull; <strong>석차백분율</strong> = (석차-0.5)/재적자수&times;100<br>';
    html += '&bull; <strong>누락 학기</strong>: 3-2 미업로드 시 3-1 성적으로 자동 대체';
    html += '</div></div>';

    // 교과 업로드 (통합 2개)
    html += '<div class="section">';
    html += '<h2>&#128200; 교과 성적 업로드 (전교생 통합 파일)</h2>';
    html += '<div class="grade-section">';
    html += '<div class="grade-box"><h3>1-2학년 성적</h3>';
    html += '<input type="file" accept=".xlsx,.xls" onchange="handleGrade12Upload(this.files[0])">';
    html += '<div id="grade12Status" style="font-size:12px;color:#a0aec0">미업로드</div></div>';
    html += '<div class="grade-box"><h3>3학년 성적</h3>';
    html += '<input type="file" accept=".xlsx,.xls" onchange="handleGrade3Upload(this.files[0])">';
    html += '<div id="grade3Status" style="font-size:12px;color:#a0aec0">미업로드</div></div>';
    html += '</div></div>';

    // 비교과 업로드 (반별)
    html += '<div class="section">';
    html += '<h2>&#128203; 비교과 성적 업로드 (반별 수기용 내신)</h2>';
    html += '<div class="upload-grid">';
    for (var c = 1; c <= TOTAL_CLASSES; c++) {
        html += '<div class="upload-card"><label>'+c+'반</label>';
        html += '<input type="file" accept=".xlsx,.xls" onchange="handleNaesinUpload('+c+',this.files[0])">';
        html += '<span class="st" id="naesin-status-'+c+'">미업로드</span></div>';
    }
    html += '</div></div>';

    // 산출 버튼
    html += '<div class="total-status" id="totalStatus">비교과 0/'+TOTAL_CLASSES+'반 | 교과: 미업로드</div>';
    html += '<div class="btn-group">';
    html += '<label style="font-size:13px;font-weight:bold">자유학기제:</label>';
    html += '<select id="freeType"><option value="1semester">1학년 1개학기 (10%+40%+50%)</option>';
    html += '<option value="2semester">1학년 2개학기 (40%+60%)</option></select>';
    html += '<button class="btn btn-primary" onclick="calculateAll()">&#128202; 석차백분율 산출</button>';
    html += '<button class="btn btn-success" onclick="downloadResult()">&#128229; 엑셀 다운로드</button>';
    html += '</div>';

    // 결과
    html += '<div class="section" id="resultSection" style="display:none">';
    html += '<h2>&#128203; 산출 결과</h2><div id="resultContent"></div></div>';
    html += '</div>';

    app.innerHTML = html;
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    var app = document.getElementById('app');
    function tryRender() { if (app.style.display !== 'none') renderUI(); }
    setTimeout(tryRender, 100);
    var observer = new MutationObserver(function(m) { m.forEach(function(mut) { if (mut.attributeName==='style') tryRender(); }); });
    observer.observe(app, {attributes:true, attributeFilter:['style']});
});
