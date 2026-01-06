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
      e.target.value = v.slice(0, 4) + "-" + v.slice(4, 6) + "-";
      return;
    }
    if (v.length >= 8) {
      v = v.slice(0, 8);
      e.target.value =
        v.slice(0, 4) + "-" +
        v.slice(4, 6) + "-" +
        v.slice(6, 8);
      return;
    }
    e.target.value = v;
  });
}

// 음력 → 양력
function convertLunarToSolar(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const lunar = Lunar.fromYmd(y, m, d);
  const solar = lunar.getSolar();
  return `${solar.getYear()}-${String(solar.getMonth()).padStart(2, "0")}-${String(solar.getDay()).padStart(2, "0")}`;
}

// 버튼
/* ==================================
     Daily Limit Check (Client Side)
  ================================== */
const TODAY = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
const LIMIT_KEY = "saju_daily_limit";

function getUsageRecord() {
  let record = JSON.parse(localStorage.getItem(LIMIT_KEY));
  if (!record || record.date !== TODAY) {
    record = { date: TODAY, count: 0 };
    localStorage.setItem(LIMIT_KEY, JSON.stringify(record));
  }
  return record;
}

function updateUsageDisplay() {
  const record = getUsageRecord();
  const usageCountDiv = document.getElementById("usageCount");
  if (usageCountDiv) {
    usageCountDiv.innerText = `오늘 남은 무료 횟수: ${3 - record.count} / 3`;
  }
}

// Update on load
updateUsageDisplay();

// 버튼
document.getElementById("submitBtn").addEventListener("click", async (e) => {
  e.preventDefault();

  let record = getUsageRecord();

  // Check limit (Max 3)
  if (record.count >= 3) {
    alert("하루 3회 무료 사용 횟수를 모두 소진했습니다.\n내일 다시 이용해 주세요.");
    return;
  }

  const loading = document.getElementById("loading");
  const resultBox = document.getElementById("resultBox");
  const resultSection = document.getElementById("resultSection");

  loading.style.display = "block";
  resultSection.style.display = "none";
  resultBox.innerText = "";

  let birthdate = birthInput.value;
  const dateType = document.querySelector("input[name=date_type]:checked").value;

  if (dateType === "음력") {
    birthdate = convertLunarToSolar(birthdate);
  }

  const payload = {
    name: document.getElementById("name").value.trim(),
    name_hanja: document.getElementById("name_hanja").value.trim(),
    gender: document.querySelector("input[name=gender]:checked").value,
    date_type: dateType,
    birthdate,
    birthtime: document.getElementById("birthtime").value,
    followup: document.getElementById("followup").value.trim()
  };

  // ✅ payload 만든 다음에 검증
  if (!payload.name || !payload.birthdate) {
    alert("이름과 생년월일은 필수입니다.");
    loading.style.display = "none";
    return;
  }

  try {
    const res = await fetch(
      "/api/saju",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "API 오류");
    }

    const data = await res.json();

    resultBox.innerText = data.data.result || "결과를 불러오지 못했습니다.";
    resultSection.style.display = "block";

    // Increment Usage Count on Success
    record = getUsageRecord(); // Re-read to be safe
    record.count += 1;
    localStorage.setItem(LIMIT_KEY, JSON.stringify(record));
    updateUsageDisplay();

  } catch (err) {
    console.error(err);
    alert("사주 해석 중 오류가 발생했습니다.");
  } finally {
    loading.style.display = "none";
  }
});
