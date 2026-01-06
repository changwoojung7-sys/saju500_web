export async function onRequest(context) {
    const { request, env } = context;

    /* ===============================
       CORS Preflight
    =============================== */
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }

    if (request.method !== "POST") {
        return new Response("Method Not Allowed", {
            status: 405,
            headers: corsHeaders,
        });
    }

    /* ===============================
       Body Parsing
    =============================== */
    let payload;
    try {
        payload = await request.json();
    } catch {
        return new Response(
            JSON.stringify({ error: "Invalid JSON body" }),
            { status: 400, headers: corsHeaders }
        );
    }

    /* ===============================
       Prompt Construction
    =============================== */
    const now = new Date();
    const this_year = now.getFullYear();
    const next_year = this_year + 1;

    const system_prompt = `
당신은 한국식 사주 명리학을 중심으로
주역, 성명학, 기문학적 관점을 종합하여 상담하는
경험 많은 전문 역술가입니다.

해석은 반드시 개인의 생년월일·성별·이름 정보를
종합적으로 반영하여 맞춤형으로 진행하세요.

올해는 ${this_year}년, 내년은 ${next_year}년 기준으로 해석하며,
막연한 조언이나 추상적인 표현은 피하고
현실에서 바로 적용 가능한 방향을 제시해야 합니다.

[해석 원칙]
- 단순 성격 설명이 아니라 "왜 그런지(원인)"를 먼저 설명
- 그 다음 "어떻게 활용하면 좋은지(행동 조언)"를 제시
- 겁을 주는 표현은 피하고, 선택을 돕는 조언 위주로 설명
- 전체 흐름에서 앞뒤 해석이 서로 모순되지 않도록 유지
`.trim();

    let user_prompt = `
[사주 상담 요청]

이름: ${payload.name || ""}
한자 이름: ${payload.name_hanja || "미입력"}
성별: ${payload.gender || ""}
입력 달력 방식: ${payload.date_type || ""}
생년월일: ${payload.birthdate || ""}
태어난 시각: ${payload.birthtime || "미상"}

위 정보를 바탕으로 아래 항목을 순서대로 상세히 분석해 주세요.

────────────────
1) 종합 인생 조언
────────────────
- 이 사주의 가장 큰 특징과 인생 전반의 흐름
- 어떤 선택을 할 때 운이 살아나는지
- 피하면 좋은 패턴이나 반복되기 쉬운 실수

────────────────
2) 타고난 기질과 성격
────────────────
- 타고난 성향의 핵심 키워드
- 장점으로 작용하는 부분과 단점으로 흐를 수 있는 부분
- 성향을 삶에 긍정적으로 쓰는 방법

────────────────
3) 재능과 인간관계
────────────────
- 타고난 재능과 잘 맞는 역할
- 인간관계·연애·가족 관계에서의 특징
- 갈등이 생기기 쉬운 지점과 이를 완화하는 방법

────────────────
4) 직업·진로·재물 운
────────────────
- 어울리는 직업 방향과 일하는 방식
- 돈이 모이는 구조인지, 흩어지기 쉬운 구조인지
- 재물 운을 안정적으로 키우는 현실적인 조언

────────────────
5) 올해(${this_year}) 세운 흐름
────────────────
- 올해 전반적인 운의 흐름
- 기회가 되는 시점과 조심해야 할 흐름
- 올해를 잘 보내기 위한 핵심 전략

────────────────
6) 내년(${next_year}) 세운 흐름
────────────────
- 내년의 큰 방향성과 변화 포인트
- 올해와 비교했을 때 달라지는 점
- 내년을 준비하며 지금부터 해두면 좋은 선택
`.trim();

    if (payload.followup) {
        user_prompt += `

[추가 질문]
${payload.followup}
- 앞선 사주 해석과 모순되지 않게 설명
- 가능성과 한계를 함께 언급
- 단순 예측이 아니라 선택 기준과 행동 조언 중심으로 답변
`.trim();
    }

    /* ===============================
       Call Cloudflare AI Gateway (OpenAI)
    =============================== */
    // Gateway ID: d6e21429ad6a96c9f1871c892dcfc8dd
    // Gateway Name: calamus-ai-gateway
    const GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/d6e21429ad6a96c9f1871c892dcfc8dd/calamus-ai-gateway/openai/chat/completions";

    const API_KEY = env.OPENAI_API_KEY; // Managed in Cloudflare Pages settings

    if (!API_KEY) {
        return new Response(JSON.stringify({ error: "Missing API Key" }), {
            status: 500,
            headers: corsHeaders,
        });
    }

    try {
        const res = await fetch(GATEWAY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o", // or gpt-3.5-turbo, gpt-4o-mini as preferred. Using gpt-4o as a safe default for quality.
                messages: [
                    { role: "system", content: system_prompt },
                    { role: "user", content: user_prompt },
                ],
                temperature: 0.7,
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            return new Response(
                JSON.stringify({
                    error: "OpenAI API error",
                    detail: errText,
                }),
                { status: 500, headers: corsHeaders }
            );
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";

        // 🔥 Frontend expects { data: { result: ... } }
        return new Response(
            JSON.stringify({
                data: {
                    result: content,
                },
            }),
            {
                status: 200,
                headers: corsHeaders,
            }
        );

    } catch (err) {
        return new Response(
            JSON.stringify({
                error: "Failed to call OpenAI API",
                detail: String(err),
            }),
            { status: 500, headers: corsHeaders }
        );
    }
}

/* ===============================
   CORS Headers
=============================== */
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
};
