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

    resultBox.innerText = data.result;
    resultSection.style.display = "block";

  } catch (err) {
    console.error("[사주 해석 오류]", err);
    alert("사주 해석 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.");
  } finally {
    loadingEl.style.display = "none";
  }
});
