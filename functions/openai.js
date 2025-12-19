export async function onRequestPost({ request, env }) {
  const body = await request.json();

  const prompt = `
이름: ${body.name}
한자: ${body.name_hanja || "없음"}
성별: ${body.gender}
달력: ${body.date_type}
생년월일: ${body.birthdate}
태어난 시각: ${body.birthtime || "미상"}

${body.followup ? "추가 질문: "+body.followup : ""}
`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "당신은 한국 전통 사주 전문가입니다." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    })
  });

  const json = await res.json();

  return new Response(
    JSON.stringify({ result: json.choices[0].message.content }),
    { headers: { "Content-Type": "application/json" } }
  );
}

