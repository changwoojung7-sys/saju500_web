export async function onRequestPost(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const today = new Date();
  const thisYear = today.getFullYear();
  const nextYear = thisYear + 1;

  const SYSTEM_PROMPT = `
당신은 한국식 사주 명리학, 주역, 성명학, 기문학적 관점을 통합하여 상담해주는 전문 역술가입니다.
설명은 친절하고 공감적인 어조로 하되, 각 항목마다 현실에서 바로 적용 가능한
구체적이고 실용적인 조언을 반드시 포함해 주세요.

[연도 계산 규칙]
- 올해는 ${thisYear}년
- 내년은 ${nextYear}년
`;

  let userPrompt = `
[사주 상담 요청]

이름: ${body.name || "미입력"}
한자 이름: ${body.name_hanja || "미입력"}
성별: ${body.gender || "미입력"}
입력 달력 방식: ${body.date_type || "미입력"}
사주 계산용 양력 날짜: ${body.birthdate || "미입력"}
태어난 시각: ${body.birthtime || "미상"}

설명 요청 항목:
1) 종합 인생 조언
2) 타고난 기질과 성격 및 이름풀이
3) 재능과 강점 및 인간관계 조언
4) 건강 운세 조언
5) 직업·진로·재물 운
6) 올해(${thisYear}) 세운 분석
7) 내년(${nextYear}) 세운 분석 + 1~12월 월별 운세
`;

  if (body.followup?.trim()) {
    userPrompt += `
[추가 질문]
${body.followup}
- 전체 사주 흐름과 모순 없이 통합 해석
- 추가 질문에 대한 구체적 답변 및 실용적인 조언 포함
- 추가 해설 섹션으로 별도 정리
`;
  }

  const openaiRes = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini", // 🔥 추천
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2800
      })
    }
  );

  if (!openaiRes.ok) {
    return new Response(
      JSON.stringify({ error: "OpenAI API error" }),
      { status: 500, headers: corsHeaders }
    );
  }

  const json = await openaiRes.json();
  const result =
    json?.choices?.[0]?.message?.content || "⚠ 응답 생성 실패";

  return new Response(
    JSON.stringify({ result }),
    { headers: corsHeaders }
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
