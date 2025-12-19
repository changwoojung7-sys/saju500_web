import { callOpenAI } from "./open-ai.js";

  document.getElementById("submitBtn").addEventListener("click", async () => {
  document.getElementById("loading").style.display = "block";

  let birthdateValue = document.getElementById("birthdate").value;
  const dateType = document.querySelector("input[name=date_type]:checked").value;

  if (dateType === "음력") {
    birthdateValue = convertLunarToSolar(birthdateValue);
  }

  const result = await callOpenAI(payload);

  const payload = {
    name: name.value,
    name_hanja: name_hanja.value,
    gender: document.querySelector("input[name=gender]:checked").value,
    date_type: dateType,
    birthdate: birthdateValue,
    birthtime: birthtime.value,
    followup: followup.value
  };

  document.getElementById("loading").style.display = "none";
  document.getElementById("resultSection").style.display = "block";
  document.getElementById("resultBox").innerText = result;
});

function convertLunarToSolar(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const lunar = Lunar.fromYmd(y, m, d);
  const solar = lunar.getSolar();
  return `${solar.getYear()}-${String(solar.getMonth()).padStart(2,"0")}-${String(solar.getDay()).padStart(2,"0")}`;
}
