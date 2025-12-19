// 🔹 생년월일 자동 하이픈 입력
birthInput.addEventListener("input", (e) => {
  let v = e.target.value.replace(/[^0-9]/g, "");

  // YYYY 입력 완료 → YYYY-
  if (v.length === 4) {
    e.target.value = v + "-";
    return;
  }

  // YYYYMM 입력 완료 → YYYY-MM-
  if (v.length === 6) {
    e.target.value = v.slice(0, 4) + "-" + v.slice(4, 6) + "-";
    return;
  }

  // YYYYMMDD 입력 완료 → YYYY-MM-DD
  if (v.length >= 8) {
    e.target.value =
      v.slice(0, 4) + "-" +
      v.slice(4, 6) + "-" +
      v.slice(6, 8);
    return;
  }

  // 그 외 입력 중
  e.target.value = v;
});

/* =========================
   음력 → 양력 변환
========================= */
function convertLunarToSolar(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const lunar = Lunar.fromYmd(y, m, d);
  const solar = lunar.getSolar();

  return `${solar.getYear()}-${String(solar.getMonth()).padStart(2, "0")}-${String(solar.getDay()).padStart(2, "0")}`;
}

/* =========================
   버튼 클릭 이벤트
========================= */
document.getElementById("submitBtn").addEventListener("click", async () => {
  const loadingEl = document.getElementById("loading");
  const resultSection = document.getElementById("resultSection");
  const resultBox = document.getElementById("resultBox");

  loadingEl.style.display = "block";

  const dateType = document.querySelector("input[name=date_type]:checked").value;

  let birthdateValue = document.getElementById("birthdate").value;

  // 🔹 음력 → 양력 변환
  if (dateType === "음력") {
    try {
      birthdateValue = convertLunarToSolar(birthdateValue);
    } catch (e) {
      alert("음력 날짜 변환에 실패했습니다. 날짜를 다시 확인해주세요.");
      loadingEl.style.display = "none";
      return;
    }
  }

  /* =========================
     ✅ payload 먼저 선언
  ========================= */
  const payload = {
    name: document.getElementById("name").value.trim(),
    name_hanja: document.getElementById("name_hanja").value.trim(),
    gender: document.querySelector("input[name=gender]:checked").value,
    date_type: dateType,
    birthdate: birthdateValue,
    birthtime: document.getElementById("birthtime").value,
    followup: document.getElementById("followup").value.trim()
  };

  try {
    const response = await callOpenAI(payload);

    resultBox.innerText = response.result;
    resultSection.style.display = "block";   // ✅ 결과 있을 때만 표시

  } catch (err) {
    console.error(err);
    alert("사주 해석 중 오류가 발생했습니다.");
  } finally {
    loadingEl.style.display = "none";         // ✅ 여기서 반드시 로딩 종료
  }

  const response = await callOpenAI(payload);
  document.getElementById("resultBox").innerText = response.result;
  

});

async function callOpenAI(payload) {
  const res = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("API ERROR:", text);
    throw new Error("API 호출 실패");
  }

  return await res.json();
}
