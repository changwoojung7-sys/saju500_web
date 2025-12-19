
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
  loadingEl.style.display = "block";

  const dateType = document.querySelector("input[name=date_type]:checked").value;
  let birthdateValue = document.getElementById("birthdate").value;

  // 🔹 음력 선택 시 → 양력 변환
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

document.getElementById("resultSection").style.display = "block";
console.log("📥 response:", response);
