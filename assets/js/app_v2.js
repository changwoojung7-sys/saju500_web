// 생년월일 input
const birthInput = document.getElementById("birthdate");

// YYYY → YYYY- → YYYY-MM- → YYYY-MM-DD
if (birthInput) {
  birthInput.addEventListener("input", (e) => {
    let v = e.target.value.replace(/[^0-9]/g, "");

    if (v.length === 4) {
      e.target.value = v + "-";
      return;
    }
    if (v.length === 6) {
      e.target.value = v.slice(0,4) + "-" + v.slice(4,6) + "-";
      return;
    }
    if (v.length >= 8) {
      v = v.slice(0,8);
      e.target.value =
        v.slice(0,4) + "-" +
        v.slice(4,6) + "-" +
        v.slice(6,8);
      return;
    }
    e.target.value = v;
  });
}

// 음력 → 양력
function convertLunarToSolar(dateStr) {
  const [y,m,d] = dateStr.split("-").map(Number);
  const lunar = Lunar.fromYmd(y,m,d);
  const solar = lunar.getSolar();
  return `${solar.getYear()}-${String(solar.getMonth()).padStart(2,"0")}-${String(solar.getDay()).padStart(2,"0")}`;
}

// 사주 보기 버튼
document.getElementById("submitBtn").addEventListener("click", async (e) => {
  e.preventDefault();

  // ===== DOM =====
  const loadingEl = document.getElementById("loading");
  const resultBox = document.getElementById("resultBox");
  const resultSection = document.getElementById("resultSection");

  // ===== UI 초기화 =====
  loadingEl.style.display = "block";
  resultSection.style.display = "none";
  resultBox.innerText = "";

  try {
    // ===== 입력 수집 =====
    const name = document.getElementById("name").value.trim();
    const nameHanja = document.getElementById("name_hanja").value.trim();
    const gender = document.querySelector("input[name=gender]:checked")?.value;
    const dateType = document.querySelector("input[name=date_type]:checked")?.value;
    const birthtime = document.getElementById("birthtime").value;
    const followup = document.getElementById("followup").value.trim();

    let birthdate = birthInput.value;

    // ===== 필수값 검증 (가장 중요) =====
    if (!name || !birthdate) {
      alert("이름과 생년월일은 필수입니다.");
      return;
    }

    if (!gender || !dateType) {
      alert("성별과 달력 방식을 선택해 주세요.");
      return;
    }

    // ===== 음력 → 양력 변환 =====
    if (dateType === "음력") {
      try {
        birthdate = convertLunarToSolar(birthdate);
      } catch (err) {
        alert("음력 날짜 변환 중 오류가 발생했습니다.");
        return;
      }
    }

    // ===== payload 구성 =====
    const payload = {
      name,
      name_hanja: nameHanja,
      gender,
      date_type: dateType,
      birthdate,
      birthtime,
      followup,
    };

    // ===== API 호출 =====
    const res = await fetch(
      "/api/openai",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    // ===== HTTP 에러 처리 =====
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `API Error (${res.status})`);
    }

    // ===== JSON 파싱 =====
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("서버 응답을 해석할 수 없습니다.");
    }

    // ===== 결과 출력 =====
    if (!data.result) {
      throw new Error("해석 결과가 비어 있습니다.");
    }

    //resultBox.innerText = data.result;
    resultBox.innerHTML = renderSajuResult(data.result);
    resultSection.style.display = "block";

  } catch (err) {
    console.error("[사주 해석 오류]", err);
    alert("사주 해석 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.");
  } finally {
    loadingEl.style.display = "none";
  }
});

function renderSajuResult(rawText) {
  if (!rawText) return "";

  let html = "";
  const lines = rawText.split("\n").map(l => l.trim());

  let buffer = [];
  let currentTitle = "";
  let isFollowup = false;
  let isTable = false;
  let tableRows = [];

  function flushSection() {
    if (!currentTitle && buffer.length === 0) return;

    let content = buffer.join("\n");

    // 리스트 처리 (- **항목**:)
    content = content.replace(
      /- \*\*(.+?)\*\*:?\s*(.+)/g,
      "<li><strong>$1</strong>: $2</li>"
    );

    // li 감싸기
    if (content.includes("<li>")) {
      content = `<ul>${content}</ul>`;
    } else {
      content = content
        .split("\n")
        .map(p => `<p>${p}</p>`)
        .join("");
    }

    html += `
      <div class="result-card ${isFollowup ? "followup" : ""}">
        ${currentTitle ? `<h3>${currentTitle}</h3>` : ""}
        ${content}
      </div>
    `;

    buffer = [];
    currentTitle = "";
    isFollowup = false;
  }

  function flushTable() {
    if (tableRows.length === 0) return;

    let rowsHtml = tableRows
      .map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`)
      .join("");

    html += `
      <div class="result-card">
        <h3>⑥ 2026년 월별 운세</h3>
        <table class="fortune-table">
          <thead>
            <tr><th>월</th><th>운세 요약</th></tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    tableRows = [];
    isTable = false;
  }

  for (let line of lines) {
    if (!line || line === "---") continue;

    // 월별 운세 표 시작
    if (line.startsWith("| 월")) {
      flushSection();
      isTable = true;
      continue;
    }

    // 표 내부
    if (isTable && line.startsWith("|")) {
      const cols = line.split("|").map(c => c.trim()).filter(Boolean);
      if (cols.length >= 2 && cols[0] !== "월") {
        tableRows.push([cols[0], cols[1]]);
      }
      continue;
    }

    // 표 끝
    if (isTable && !line.startsWith("|")) {
      flushTable();
    }

    // 추가 질문
    if (line.startsWith("### [추가 질문]")) {
      flushSection();
      currentTitle = "📌 추가 질문 답변";
      isFollowup = true;
      continue;
    }

    // 섹션 제목 (### 1) ...)
    const sectionMatch = line.match(/^###\s*\d+\)\s*(.+)/);
    if (sectionMatch) {
      flushSection();
      currentTitle = sectionMatch[1];
      continue;
    }

    // 인사말 (맨 위)
    if (html === "" && line.startsWith("안녕하세요")) {
      html += `
        <div class="result-card intro">
          <p class="greeting">${line}</p>
        </div>
      `;
      continue;
    }

    buffer.push(line);
  }

  flushSection();
  flushTable();

  return html;
}
