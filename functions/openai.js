export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { request, env } = context;
  const body = await request.json();

  const today = new Date();
  const thisYear = today.getFullYear();
  const nextYear = thisYear + 1;

  /* ===============================
     SYSTEM PROMPT (saju.py 이식)
  =============================== */
  const SYSTEM_PROMPT = `
    당신은 한국식 사주 명리학, 주역, 성명학, 기문학적 관점을 통합하여 상담해주는 전문 역술가입니다.
    설명은 친절하고 공감적인 어조로 하되, 각 항목마다 현실에서 바로 적용 가능한
    구체적이고 실용적인 조언을 반드시 포함해 주세요.

    이 상담은 반드시 현재 날짜를 기준으로 다음 규칙을 적용한다:

    [연도 계산 규칙]
    - "올해"는 ${thisYear}년
    - "내년"은 ${nextYear}년

    [세운 해석 규칙]
    - 올해 세운은 연도의 흐름, 전환점, 조심할 점, 기회 요소를 상세히 서술한다.
    - 내년 세운은 토정비결 스타일로 1월~12월 월별 운세를 구체적인 사건·흐름 중심으로 분석한다.
    - 각 월의 키워드(재물/직장/건강 등)와 조언을 포함한다.

    [답변 스타일 규칙]
    1) 각 항목은 최소 7줄 이상으로 자세히 설명한다.
    2) 원인(이유) + 활용법(방법)을 반드시 포함한다.
    3) 건강은 겁주기보다 생활습관·심리 패턴 중심으로 조언한다.
    4) 이름 해석은 음/한자/오행 조화를 기반으로 분석한다.
    5) 전체 분량은 A4 두 장 이상 수준을 목표로 한다.
    6) 상담 톤은 따뜻하지만 전문성을 유지한다.
    `;

  /* ===============================
     USER PROMPT
  =============================== */
  let userPrompt = `
    [사주 상담 요청]

    이름: ${body.name}
    한자 이름: ${body.name_hanja || "미입력"}
    성별: ${body.gender}
    입력 달력 방식: ${body.date_type}
    사주 계산용 양력 날짜: ${body.birthdate}
    태어난 시각: ${body.birthtime || "미상"}

    설명 요청 항목:
    1) 타고난 기질과 성격
    2) 재능과 강점
    3) 인간관계·연애·가족 성향
    4) 건강 조언
    5) 직업·진로·재물 운
    6) 올해(${thisYear}) 세운 분석
    7) 내년(${nextYear}) 세운 분석 + 1~12월 월별 운세
    8) 이름과 사주의 조화
    9) 종합 인생 조언
    `;

  if (body.followup && body.followup.trim() !== "") {
    userPrompt += `
    [추가 질문]
    ${body.followup}

    요청사항:
    - 전체 사주 흐름과 모순 없이 통합 해석
    - 추가 해설 섹션으로 별도 정리
    - 질문에 대해 충분히 상세하게 설명
    `;
  }

  /* ===============================
     OpenAI API Call
  =============================== */
  
   if (body.followup) {
    userPrompt += `\n[추가 질문]\n${body.followup}`;
  }

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 3500
    })
  });

  const json = await openaiRes.json();

  return new Response(
    JSON.stringify({ result: json.choices[0].message.content }),
    { headers: { "Content-Type": "application/json" } }
  );

}
