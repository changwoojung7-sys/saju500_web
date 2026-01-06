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
당신은 한국식 사주 명리학, 주역, 성명학, 기문학을 통합한 전문 역술가입니다.
올해는 ${this_year}년, 내년은 ${next_year}년 기준으로 해석하세요.
`.trim();

    let user_prompt = `
[사주 상담 요청]

이름: ${payload.name || ""}
한자 이름: ${payload.name_hanja || "미입력"}
성별: ${payload.gender || ""}
입력 달력 방식: ${payload.date_type || ""}
생년월일: ${payload.birthdate || ""}
태어난 시각: ${payload.birthtime || "미상"}

1) 종합 인생 조언
2) 타고난 기질과 성격
3) 재능과 인간관계
4) 직업·재물 운
5) 올해(${this_year}) 세운
6) 내년(${next_year}) 월별 운세
`.trim();

    if (payload.followup) {
        user_prompt += `

[추가 질문]
${payload.followup}
- 전체 흐름과 모순 없이 해석
- 실용적 조언 포함
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
